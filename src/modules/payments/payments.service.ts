import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ClickPesaCheckoutDto } from './dto/clickpesa-checkout.dto';

interface ClickPesaPaymentRecord {
  id: string;
  status: string;
  orderReference: string;
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

  private async getToken(): Promise<string> {
    if (this.cachedToken && new Date() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/third-parties/generate-token`,
        {},
        {
          headers: {
            'client-id': this.clientId,
            'api-key': this.apiKey,
          },
        },
      ),
    );

    const raw: string = response.data?.token ?? '';
    // Strip the "Bearer " prefix if present — we'll add it back ourselves
    this.cachedToken = raw.replace(/^Bearer\s+/i, '');
    // Cache for 55 minutes (token valid for 1 hour)
    this.tokenExpiresAt = new Date(Date.now() + 55 * 60 * 1000);
    return this.cachedToken;
  }

  async initiateCheckout(dto: ClickPesaCheckoutDto) {
    const orderRef = dto.orderReference ?? dto.reference;
    // ClickPesa requires no '+' prefix on phone numbers
    const phone = dto.phoneNumber.replace(/^\+/, '');

    try {
      const token = await this.getToken();
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/third-parties/payments/initiate-ussd-push-request`,
          {
            amount: String(dto.amount),
            currency: dto.currency,
            orderReference: orderRef,
            phoneNumber: phone,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      );

      return {
        sessionId: orderRef,
        provider: 'clickpesa',
        status: 'pending',
        message: response.data?.message ?? 'Awaiting mobile money confirmation',
      };
    } catch (error) {
      this.logger.error(
        'ClickPesa checkout error:',
        error?.response?.data ?? error?.message,
      );
      throw error;
    }
  }

  async getSessionStatus(sessionId: string) {
    try {
      const token = await this.getToken();
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/third-parties/payments/${sessionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      );

      const records: ClickPesaPaymentRecord[] = Array.isArray(response.data)
        ? response.data
        : response.data?.data ?? [];

      const record = records.find(
        (r) => r.orderReference === sessionId || r.id === sessionId,
      ) ?? records[0];

      const rawStatus = (record?.status ?? '').toUpperCase();
      const status = this.mapStatus(rawStatus);

      return {
        sessionId,
        provider: 'clickpesa',
        status,
        transactionId: record?.id,
        message: record?.message,
      };
    } catch (error) {
      this.logger.error(
        'ClickPesa status error:',
        error?.response?.data ?? error?.message,
      );
      throw error;
    }
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
