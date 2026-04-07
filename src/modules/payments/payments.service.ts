import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
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

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly apiKey: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt: Date = new Date(0);

  constructor(private readonly httpService: HttpService) {
    this.baseUrl =
      process.env.CLICKPESA_BASE_URL ?? 'https://api.clickpesa.com';
    this.clientId = process.env.CLICKPESA_CLIENT_ID ?? '';
    this.apiKey = process.env.CLICKPESA_API_KEY ?? '';
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

  async initiateCheckout(dto: ClickPesaCheckoutDto) {
    const orderRef = this.sanitizeOrderRef(dto.orderReference ?? dto.reference);
    // ClickPesa requires no '+' prefix on phone numbers
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
      : response.data?.data ?? [];

    const record =
      records.find(
        (r) => r.orderReference === orderRef || r.id === orderRef,
      ) ?? records[0];

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
