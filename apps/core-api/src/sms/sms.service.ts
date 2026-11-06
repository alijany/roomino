import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { isNil } from 'lodash';
import { firstValueFrom } from 'rxjs';
import {
  IntegrationSettingsService,
  SmsConfig,
} from '../settings/integration-settings.service';

@Injectable()
export class SmsService {
  constructor(
    private readonly integrations: IntegrationSettingsService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Sends a one-time code. With sms.ir and a template id saved, it goes by the
   * template (`/v1/send/verify`); otherwise as the plain `text`.
   */
  async sendOtp(code: string, destination: string, text: string) {
    const cfg = await this.integrations.sms();
    if (cfg.provider !== 'smsir' || !cfg.smsirOtpTemplate) {
      return this.sendSms(text, destination);
    }
    if (isNil(cfg.smsirApiKey)) {
      throw new Error('SMS service credentials are not configured');
    }
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.sms.ir/v1/send/verify',
          {
            mobile: this.smsIrMobile(destination),
            templateId: cfg.smsirOtpTemplate,
            parameters: [{ name: cfg.smsirOtpParam, value: code }],
          },
          { headers: { 'x-api-key': cfg.smsirApiKey } },
        ),
      );
      if (response.data?.status !== 1) {
        return {
          success: false,
          error: response.data?.message ?? response.data,
        };
      }
      return { success: true, data: response.data };
    } catch (error) {
      if (process.env.NODE_ENV !== 'development')
        console.error('Error sending OTP SMS:', error);
      return { success: false, error: error?.response?.data || error.message };
    }
  }

  /** sms.ir takes mobiles as `09xxxxxxxxx`. */
  private smsIrMobile(m: string): string {
    const digits = m.replace(/\D/g, '').replace(/^98/, '');
    return digits.startsWith('0') ? digits : `0${digits}`;
  }

  /**
   * Send SMS using Asanak API
   * @param message - Message content to send
   * @param destination - Recipient phone number (e.g., 989XXXXXXXXX)
   * @returns Promise with the API response
   */
  async sendSms(message: string, destination: string | string[]): Promise<any> {
    const cfg = await this.integrations.sms();
    if (cfg.provider === 'smsir')
      return this.sendViaSmsIr(cfg, message, destination);
    const { apiUrl, username, password, source } = cfg;

    if (isNil(apiUrl) || isNil(username) || isNil(password)) {
      throw new Error('SMS service credentials are not configured');
    }

    const isArray = Array.isArray(destination);

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('source', source);
    formData.append('message', message);
    formData.append(
      'destination',
      isArray ? destination.join(',') : destination,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(apiUrl, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      if (process.env.NODE_ENV !== 'development')
        console.error('Error sending SMS:', error);
      return {
        success: false,
        error: error?.response?.data || error.message,
      };
    }
  }

  /** sms.ir: POST /v1/send/bulk with the panel's API key in `x-api-key`. */
  private async sendViaSmsIr(
    cfg: SmsConfig,
    message: string,
    destination: string | string[],
  ) {
    if (isNil(cfg.smsirApiKey) || isNil(cfg.smsirLine)) {
      throw new Error('SMS service credentials are not configured');
    }
    const mobiles = (
      Array.isArray(destination) ? destination : [destination]
    ).map((m) => this.smsIrMobile(m));
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.sms.ir/v1/send/bulk',
          {
            lineNumber: Number(cfg.smsirLine),
            messageText: message,
            mobiles,
          },
          { headers: { 'x-api-key': cfg.smsirApiKey } },
        ),
      );
      // The API answers 200 with `status: 1` on success.
      if (response.data?.status !== 1) {
        return {
          success: false,
          error: response.data?.message ?? response.data,
        };
      }
      return { success: true, data: response.data };
    } catch (error) {
      if (process.env.NODE_ENV !== 'development')
        console.error('Error sending SMS:', error);
      return {
        success: false,
        error: error?.response?.data || error.message,
      };
    }
  }
}
