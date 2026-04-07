import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createHmac, timingSafeEqual } from 'crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { PrismaService } from '../../prisma/prisma.services';
import { ClickPesaCheckoutDto } from './dto/clickpesa-checkout.dto';

interface ClickPesaPaymentRecord {
  id: string;
  status: string;
  orderReference: string;
  message?: string;
}

interface ClickPesaActiveMethod {
  name: string;
  status: 'AVAILABLE' | 'UNAVAILABLE';
  fee?: number;
  message?: string;
}

// TTL for the orderRef → cvId mapping in Redis (24 hours)
const ORDER_TTL_SECONDS = 86400;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt: Date = new Date(0);

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.baseUrl =
      process.env.CLICKPESA_BASE_URL ?? 'https://api.clickpesa.com';
    this.clientId = process.env.CLICKPESA_CLIENT_ID ?? '';
    this.apiKey = process.env.CLICKPESA_API_KEY ?? '';
    this.webhookSecret = process.env.CLICKPESA_WEBHOOK_SECRET ?? '';
  }

  // Step 0: Generate and cache auth token (valid 1 hour, cached 55 min)
  private async getToken(): Promise<string> {
    if (this.cachedToken && new Date() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/third-parties/generate-token`,
        null,
        {
          headers: {
            'client-id': this.clientId,
            'api-key': this.apiKey,
          },
        },
      ),
    );

    const raw: string = response.data?.token ?? '';
    this.cachedToken = raw.replace(/^Bearer\s+/i, '');
    this.tokenExpiresAt = new Date(Date.now() + 55 * 60 * 1000);
    return this.cachedToken;
  }

  // ClickPesa requires orderReference to be alphanumeric only
  private sanitizeOrderRef(ref: string): string {
    return ref.replace(/[^a-zA-Z0-9]/g, '');
  }

  private redisOrderKey(orderRef: string): string {
    return `payment:order:${orderRef}`;
  }

  async initiateCheckout(dto: ClickPesaCheckoutDto) {
    const orderRef = this.sanitizeOrderRef(dto.orderReference ?? dto.reference);
    const phone = dto.phoneNumber.replace(/^\+/, '');
    const token = await this.getToken();

    // Step 1: Preview — validate details and check payment method availability
    const previewResponse = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/third-parties/payments/preview-ussd-push-request`,
        {
          amount: String(dto.amount),
          currency: 'TZS',
          orderReference: orderRef,
          phoneNumber: phone,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    );

    const activeMethods: ClickPesaActiveMethod[] =
      previewResponse.data?.activeMethods ?? [];
    const availableMethod = activeMethods.find((m) => m.status === 'AVAILABLE');

    if (!availableMethod) {
      const reason =
        activeMethods[0]?.message ??
        'No payment methods available for this phone number';
      this.logger.warn(`ClickPesa preview failed for ${phone}: ${reason}`);
      throw new BadRequestException(reason);
    }

    this.logger.log(
      `ClickPesa preview OK — method: ${availableMethod.name}, fee: ${availableMethod.fee ?? 0}`,
    );

    // Step 2: Initiate USSD push
    const initiateResponse = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/third-parties/payments/initiate-ussd-push-request`,
        {
          amount: String(dto.amount),
          currency: 'TZS',
          orderReference: orderRef,
          phoneNumber: phone,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    );

    this.logger.log(
      `ClickPesa USSD push initiated — orderRef: ${orderRef}, status: ${initiateResponse.data?.status}`,
    );

    // Store orderRef → cvId mapping in Redis for webhook lookup
    if (dto.metadata?.cvId) {
      await this.redis.set(
        this.redisOrderKey(orderRef),
        JSON.stringify({ cvId: dto.metadata.cvId }),
        'EX',
        ORDER_TTL_SECONDS,
      );
    }

    return {
      sessionId: orderRef,
      provider: 'clickpesa',
      status: 'pending',
      message:
        initiateResponse.data?.message ?? 'Awaiting mobile money confirmation',
    };
  }

  // Step 3: Query payment status by orderReference
  async getSessionStatus(sessionId: string) {
    const orderRef = this.sanitizeOrderRef(sessionId);
    const token = await this.getToken();

    const response = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/third-parties/payments/${orderRef}`,
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    );

    const records: ClickPesaPaymentRecord[] = Array.isArray(response.data)
      ? response.data
      : (response.data?.data ?? []);

    const record =
      records.find((r) => r.orderReference === orderRef || r.id === orderRef) ??
      records[0];

    const rawStatus = (record?.status ?? '').toUpperCase();
    const status = this.mapStatus(rawStatus);

    this.logger.log(
      `ClickPesa status — orderRef: ${orderRef}, status: ${rawStatus} → ${status}`,
    );

    return {
      sessionId,
      provider: 'clickpesa',
      status,
      transactionId: record?.id,
      message: record?.message,
    };
  }

  // Webhook: verify signature and process event
  async handleWebhook(payload: Record<string, any>): Promise<void> {
    if (!this.verifyChecksum(payload)) {
      this.logger.warn('Webhook received with invalid checksum');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event: string = (payload.event ?? '')
      .replace(/ /g, '_')
      .toUpperCase();
    const data = payload.data ?? {};

    this.logger.log(
      `ClickPesa webhook received — event: ${event}, orderRef: ${data.orderReference}`,
    );

    switch (event) {
      case 'PAYMENT_RECEIVED':
        await this.onPaymentReceived(data);
        break;
      case 'PAYMENT_FAILED':
        await this.onPaymentFailed(data);
        break;
      default:
        this.logger.log(`Unhandled webhook event: ${event}`);
    }
  }

  private async onPaymentReceived(data: Record<string, any>): Promise<void> {
    const orderRef = data.orderReference as string;
    if (!orderRef) return;

    const stored = await this.redis.get(this.redisOrderKey(orderRef));
    if (!stored) {
      this.logger.warn(
        `Webhook PAYMENT_RECEIVED: no CV mapping for orderRef ${orderRef}`,
      );
      return;
    }

    const { cvId } = JSON.parse(stored) as { cvId: string };
    const cv = await this.prisma.cv.findUnique({ where: { id: cvId } });
    if (!cv) {
      this.logger.warn(`Webhook PAYMENT_RECEIVED: CV ${cvId} not found`);
      return;
    }

    const existing = (cv.contentJson as Record<string, any>) ?? {};
    await this.prisma.cv.update({
      where: { id: cvId },
      data: {
        contentJson: {
          ...existing,
          status: 'active',
          paymentStatus: 'success',
          hasPremiumEntitlement: true,
          activationTxId: data.id,
          activationUnlockedAt: new Date().toISOString(),
          paymentProvider: 'clickpesa',
          activationType: existing.activationType ?? 'one_time',
        },
      },
    });

    // Clean up Redis mapping
    await this.redis.del(this.redisOrderKey(orderRef));

    this.logger.log(`CV ${cvId} activated via webhook — txId: ${data.id}`);
  }

  private async onPaymentFailed(data: Record<string, any>): Promise<void> {
    const orderRef = data.orderReference as string;
    if (!orderRef) return;

    const stored = await this.redis.get(this.redisOrderKey(orderRef));
    if (!stored) return;

    const { cvId } = JSON.parse(stored) as { cvId: string };
    const cv = await this.prisma.cv.findUnique({ where: { id: cvId } });
    if (!cv) return;

    const existing = (cv.contentJson as Record<string, any>) ?? {};
    await this.prisma.cv.update({
      where: { id: cvId },
      data: {
        contentJson: {
          ...existing,
          paymentStatus: 'failed',
        },
      },
    });

    this.logger.log(`CV ${cvId} payment failed — orderRef: ${orderRef}`);
  }

  // HMAC-SHA256 checksum verification (ClickPesa spec)
  private verifyChecksum(payload: Record<string, any>): boolean {
    if (!this.webhookSecret) {
      this.logger.warn(
        'CLICKPESA_WEBHOOK_SECRET not set — skipping checksum verification',
      );
      return true;
    }

    const received = payload.checksum as string | undefined;
    if (!received) return false;

    const data: Record<string, any> = { ...payload };
    delete data.checksum;
    delete data.checksumMethod;

    const canonical = this.sortKeysRecursively(data);
    const serialized = JSON.stringify(canonical);
    const expected = createHmac('sha256', this.webhookSecret)
      .update(serialized)
      .digest('hex');

    try {
      return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  private sortKeysRecursively(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortKeysRecursively(item));
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce(
          (acc, key) => {
            acc[key] = this.sortKeysRecursively(
              (obj as Record<string, unknown>)[key],
            );
            return acc;
          },
          {} as Record<string, unknown>,
        );
    }
    return obj;
  }

  private mapStatus(
    raw: string,
  ): 'pending' | 'success' | 'failed' | 'cancelled' {
    switch (raw) {
      case 'SUCCESS':
      case 'SETTLED':
        return 'success';
      case 'FAILED':
      case 'REFUNDED':
      case 'REVERSED':
        return 'failed';
      case 'CANCELLED':
      case 'CANCELED':
        return 'cancelled';
      case 'ON-HOLD':
      case 'PROCESSING':
      case 'PENDING':
      default:
        return 'pending';
    }
  }
}
