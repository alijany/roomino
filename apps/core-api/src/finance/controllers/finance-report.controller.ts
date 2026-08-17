import {
  Controller,
  Get,
  Header,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../roles/roles.constants';
import {
  ExportQueryDto,
  MonthQueryDto,
  RangeQueryDto,
} from '../dtos/report.dto';
import { FinanceReportService } from '../services/finance-report.service';
import { toCsv } from '../utils/csv.util';

/**
 * Reporting. Finance and admin only — these endpoints aggregate every payment
 * the company has made.
 */
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class FinanceReportController {
  constructor(private readonly reports: FinanceReportService) {}

  /** Defaults to the last 30 days when no range is given. */
  private resolveRange(query: RangeQueryDto): { from: Date; to: Date } {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 30 * 86_400_000);

    return { from, to };
  }

  @Get('dashboard')
  @Roles(Role.FINANCE, Role.ADMIN)
  dashboard(@Query() query: RangeQueryDto) {
    const { from, to } = this.resolveRange(query);
    return this.reports.dashboard(from, to);
  }

  @Get('reports/by-category')
  @Roles(Role.FINANCE, Role.ADMIN)
  async byCategory(@Query() query: RangeQueryDto) {
    const { from, to } = this.resolveRange(query);
    return { items: await this.reports.byCategory(from, to) };
  }

  @Get('reports/by-vendor')
  @Roles(Role.FINANCE, Role.ADMIN)
  async byVendor(@Query() query: RangeQueryDto) {
    const { from, to } = this.resolveRange(query);
    return { items: await this.reports.byVendor(from, to) };
  }

  @Get('reports/trend')
  @Roles(Role.FINANCE, Role.ADMIN)
  async trend(@Query('months') months?: string) {
    const parsed = Number(months);
    return {
      items: await this.reports.trend(
        Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 36) : 12,
      ),
    };
  }

  @Get('reports/upcoming')
  @Roles(Role.FINANCE, Role.ADMIN)
  upcoming(@Query('days') days?: string) {
    const parsed = Number(days);
    return this.reports.upcoming(
      Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 365) : 30,
    );
  }

  @Get('reports/monthly')
  @Roles(Role.FINANCE, Role.ADMIN)
  monthly(@Query() query: MonthQueryDto) {
    const now = new Date();
    return this.reports.monthly(
      query.year ?? now.getUTCFullYear(),
      query.month ?? now.getUTCMonth() + 1,
    );
  }

  /**
   * CSV for the accountant.
   *
   * The UTF-8 BOM is not decoration: without it Excel on Windows opens Persian
   * text as mojibake, which turns into a support ticket every single month.
   */
  @Get('reports/export')
  @Roles(Role.FINANCE, Role.ADMIN)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="finance-export.csv"')
  async exportCsv(@Query() query: ExportQueryDto): Promise<string> {
    const { from, to } = this.resolveRange(query);
    const rows = await this.reports.exportRows(from, to);

    return toCsv(
      [
        { key: 'request_id', header: 'شناسه درخواست' },
        { key: 'title', header: 'عنوان' },
        { key: 'category', header: 'دسته هزینه' },
        { key: 'payee', header: 'طرف‌حساب' },
        { key: 'amount_minor', header: 'مبلغ درخواست (واحد خرد)' },
        { key: 'currency', header: 'واحد پول' },
        { key: 'settled_amount_rial', header: 'مبلغ پرداخت‌شده (ریال)' },
        { key: 'fx_rate_rial_per_unit', header: 'نرخ تبدیل (ریال)' },
        { key: 'fee_rial', header: 'کارمزد (ریال)' },
        { key: 'intermediary', header: 'واسط پرداخت' },
        { key: 'reference_number', header: 'شماره پیگیری' },
        { key: 'paid_at', header: 'تاریخ پرداخت' },
        { key: 'payment_source', header: 'منبع پرداخت' },
        { key: 'requester', header: 'ثبت‌کننده' },
        { key: 'paid_by', header: 'ثبت پرداخت توسط' },
      ],
      rows,
    );
  }
}
