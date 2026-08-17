/**
 * Populates the finance module with demo data: vendors, payment sources,
 * recurring expenses, and payment requests across every status.
 *
 * Does NOT touch real accounts. It creates three dedicated demo users
 * (`+989210000001/2/3`, one each for employee/approver/finance) so seeded
 * requests never show up in a real approver's or Finance's queue by surprise.
 * Categories and approval rules already come from `FinanceBootstrapService`
 * on first boot — this script only adds what that one deliberately leaves
 * empty.
 *
 * Idempotent: exits immediately if the demo employee user already exists.
 *
 * Run with: pnpm --filter core-api seed:finance
 */
import { EntityManager, RequestContext } from '@mikro-orm/core';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { InvitationStatus, RolesEntity } from '../../roles/roles.entity';
import { Role } from '../../roles/roles.constants';
import { UserEntity } from '../../user/user.entity';
import { ExpenseCategoryEntity } from '../entities/expense-category.entity';
import { VendorEntity } from '../entities/vendor.entity';
import { PayeeAccountEntity } from '../entities/payee-account.entity';
import {
  BillingCalendar,
  Currency,
  PayeeAccountType,
  PaymentSourceType,
  RecurrenceCycle,
  VendorKind,
} from '../finance.constants';
import { PaymentRequestService } from '../services/payment-request.service';
import { PaymentSourceService } from '../services/payment-source.service';
import { RecurringExpenseService } from '../services/recurring-expense.service';
import { VendorService } from '../services/vendor.service';

/** 1 Toman = 10 Rial. Everything below is written in Toman for readability. */
const toman = (n: number) => n * 10;

const inDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

async function createDemoUser(
  em: EntityManager,
  phone: string,
  firstName: string,
  lastName: string,
  role: Role,
): Promise<UserEntity> {
  const user = em.create(UserEntity, {
    phone,
    firstName,
    lastName,
    isApproved: true,
  } as never);

  const roleEntity = em.create(RolesEntity, {
    user,
    role,
    invitationStatus: InvitationStatus.ACCEPTED,
    description: 'داده نمونه ماژول مالی',
  } as never);

  await em.persistAndFlush([user, roleEntity]);
  return user;
}

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const em = app.get(EntityManager);

  await RequestContext.create(em, async () => {
    const existing = await em.findOne(UserEntity, { phone: '+989210000001' });
    if (existing) {
      console.log('داده‌های نمونه مالی قبلاً ایجاد شده‌اند — خروج بدون تغییر.');
      return;
    }

    const employee = await createDemoUser(
      em,
      '+989210000001',
      'کارمند',
      'نمونه',
      Role.USER,
    );
    const approver = await createDemoUser(
      em,
      '+989210000002',
      'تأییدکننده',
      'نمونه',
      Role.APPROVER,
    );
    const finance = await createDemoUser(
      em,
      '+989210000003',
      'مالی',
      'نمونه',
      Role.FINANCE,
    );
    console.log('کاربران نمونه (کارمند، تأییدکننده، مالی) ایجاد شدند.');

    const categories = await em.find(ExpenseCategoryEntity, {});
    const byCode = new Map(categories.map((c) => [c.code, c]));
    const other = byCode.get('other');
    const rent = byCode.get('rent');
    const saas = byCode.get('saas');
    const internet = byCode.get('internet');

    if (!other || !rent || !saas || !internet) {
      throw new Error(
        'دسته‌های هزینه پیش‌فرض یافت نشدند — ابتدا سرور را یک‌بار اجرا کنید تا FinanceBootstrapService آن‌ها را بسازد.',
      );
    }

    const vendorService = app.get(VendorService);
    const sourceService = app.get(PaymentSourceService);
    const recurringService = app.get(RecurringExpenseService);
    const requestService = app.get(PaymentRequestService);

    // --- vendors + payee accounts ------------------------------------------

    const hosting: VendorEntity = await vendorService.createVendor({
      name: 'میزبان‌ابر پارس',
      kind: VendorKind.DOMESTIC,
      contactName: 'واحد فروش',
      contactPhone: '02191234567',
      defaultCurrency: Currency.IRR,
    });
    const hostingAccount: PayeeAccountEntity = await vendorService.addAccount(
      hosting.id,
      {
        label: 'حساب اصلی',
        type: PayeeAccountType.SHEBA,
        holderName: 'شرکت میزبان‌ابر پارس',
        sheba: 'IR820540102680020817909002',
        isDefault: true,
      },
    );

    const telecom: VendorEntity = await vendorService.createVendor({
      name: 'شرکت مخابرات ایران',
      kind: VendorKind.DOMESTIC,
      defaultCurrency: Currency.IRR,
    });
    const telecomAccount: PayeeAccountEntity = await vendorService.addAccount(
      telecom.id,
      {
        label: 'حساب اصلی',
        type: PayeeAccountType.SHEBA,
        holderName: 'شرکت مخابرات ایران',
        sheba: 'IR060570028180010549501001',
        isDefault: true,
      },
    );

    const landlord: VendorEntity = await vendorService.createVendor({
      name: 'املاک بهار - موجر دفتر مرکزی',
      kind: VendorKind.DOMESTIC,
      defaultCurrency: Currency.IRR,
    });
    const landlordAccount: PayeeAccountEntity = await vendorService.addAccount(
      landlord.id,
      {
        label: 'حساب موجر',
        type: PayeeAccountType.CARD,
        holderName: 'رضا بهاری',
        cardNumber: '6037991234567890',
        isDefault: true,
      },
    );

    const aws: VendorEntity = await vendorService.createVendor({
      name: 'Amazon Web Services',
      nameEn: 'Amazon Web Services',
      kind: VendorKind.FOREIGN,
      defaultCurrency: Currency.USD,
      website: 'https://aws.amazon.com',
    });
    await vendorService.addAccount(aws.id, {
      label: 'AWS Billing',
      type: PayeeAccountType.PAYPAL,
      holderName: 'Amazon Web Services Inc.',
      details: 'billing@aws.amazon.com',
      isDefault: true,
    });

    const accountingSoftware: VendorEntity = await vendorService.createVendor({
      name: 'نرم‌افزار حسابداری پارسه',
      kind: VendorKind.DOMESTIC,
      defaultCurrency: Currency.IRR,
    });
    const accountingSoftwareAccount: PayeeAccountEntity =
      await vendorService.addAccount(accountingSoftware.id, {
        label: 'حساب اصلی',
        type: PayeeAccountType.SHEBA,
        holderName: 'شرکت نرم‌افزار پارسه',
        sheba: 'IR910120010000001234567890',
        isDefault: true,
      });

    console.log('طرف‌حساب‌ها و حساب‌های نمونه ایجاد شدند.');

    // --- payment sources -----------------------------------------------------

    const bankSource = await sourceService.createSource({
      label: 'حساب جاری بانک ملت',
      type: PaymentSourceType.BANK_ACCOUNT,
      bankName: 'بانک ملت',
      sheba: 'IR350120010000001111222233',
      accountHolder: 'شرکت روومینو',
      currency: Currency.IRR,
    });
    await sourceService.createSource({
      label: 'تنخواه اداری',
      type: PaymentSourceType.PETTY_CASH,
      currency: Currency.IRR,
    });
    console.log('منابع پرداخت نمونه ایجاد شدند.');

    // --- recurring expenses ----------------------------------------------------

    await recurringService.createSchedule(
      {
        title: 'اجاره ماهانه دفتر مرکزی',
        vendorId: landlord.id,
        categoryId: rent.id,
        payeeAccountId: landlordAccount.id,
        defaultPaymentSourceId: bankSource.id,
        amountMinor: toman(10_000_000),
        currency: Currency.IRR,
        cycle: RecurrenceCycle.MONTHLY,
        calendar: BillingCalendar.JALALI,
        nextDueDate: inDays(18),
      } as never,
      employee.id,
    );

    await recurringService.createSchedule(
      {
        title: 'اینترنت پرسرعت دفتر',
        vendorId: telecom.id,
        categoryId: internet.id,
        payeeAccountId: telecomAccount.id,
        defaultPaymentSourceId: bankSource.id,
        amountMinor: toman(1_800_000),
        currency: Currency.IRR,
        cycle: RecurrenceCycle.MONTHLY,
        calendar: BillingCalendar.GREGORIAN,
        nextDueDate: inDays(12),
      } as never,
      employee.id,
    );

    await recurringService.createSchedule(
      {
        title: 'اشتراک ماهانه AWS',
        vendorId: aws.id,
        categoryId: saas.id,
        defaultPaymentSourceId: bankSource.id,
        amountMinor: 5_000, // $50.00 in cents
        currency: Currency.USD,
        cycle: RecurrenceCycle.MONTHLY,
        calendar: BillingCalendar.GREGORIAN,
        nextDueDate: inDays(25),
      } as never,
      employee.id,
    );

    const accountingSchedule = await recurringService.createSchedule(
      {
        title: 'اشتراک نرم‌افزار حسابداری',
        vendorId: accountingSoftware.id,
        categoryId: saas.id,
        payeeAccountId: accountingSoftwareAccount.id,
        defaultPaymentSourceId: bankSource.id,
        amountMinor: toman(1_000_000),
        currency: Currency.IRR,
        cycle: RecurrenceCycle.MONTHLY,
        calendar: BillingCalendar.GREGORIAN,
        nextDueDate: new Date().toISOString(),
      } as never,
      employee.id,
    );

    console.log('هزینه‌های دوره‌ای نمونه ایجاد شدند.');

    // Below the no-approver band → materialises straight into SCHEDULED.
    await recurringService.generateNow(accountingSchedule.id);

    // --- payment requests, one per status -----------------------------------

    const base = (overrides: Record<string, unknown>) => ({
      payeeAccountType: PayeeAccountType.SHEBA,
      currency: Currency.IRR,
      dueDate: inDays(7),
      ...overrides,
    });

    // DRAFT — saved, never submitted.
    await requestService.createRequest(
      employee,
      base({
        title: 'خرید تجهیزات اداری',
        categoryId: other.id,
        amountMinor: toman(800_000),
        payeeName: 'فروشگاه تجهیزات اداری آریا',
      }) as never,
    );

    // PENDING_APPROVAL — band 2, left open for the demo approver to act on.
    await requestService.createRequest(
      employee,
      base({
        title: 'اجاره دفتر - دی ماه',
        categoryId: rent.id,
        vendorId: landlord.id,
        payeeAccountId: landlordAccount.id,
        payeeAccountType: PayeeAccountType.CARD,
        payeeCardNumber: '6037991234567890',
        amountMinor: toman(8_000_000),
        payeeName: landlord.name,
        submit: true,
      }) as never,
    );

    // NEEDS_INFO — submitted, then sent back by the demo approver.
    const needsInfoReq = await requestService.createRequest(
      employee,
      base({
        title: 'پرداخت تأمین‌کننده تدارکات',
        categoryId: other.id,
        amountMinor: toman(5_000_000),
        payeeName: 'تدارکات اداری نوین',
        submit: true,
      }) as never,
    );
    await requestService.requestInfo(
      needsInfoReq.id,
      approver,
      'لطفاً فاکتور رسمی را پیوست کنید.',
    );

    // REJECTED
    const rejectedReq = await requestService.createRequest(
      employee,
      base({
        title: 'هزینه پذیرایی رویداد داخلی',
        categoryId: other.id,
        amountMinor: toman(6_000_000),
        payeeName: 'کترینگ نمونه',
        submit: true,
      }) as never,
    );
    await requestService.reject(
      rejectedReq.id,
      approver,
      'بودجه این مورد برای این ماه تمام شده است.',
    );

    // APPROVED — band 1, straight to the finance queue.
    await requestService.createRequest(
      employee,
      base({
        title: 'خرید لایسنس نرم‌افزار طراحی',
        categoryId: other.id,
        vendorId: hosting.id,
        payeeAccountId: hostingAccount.id,
        amountMinor: toman(1_200_000),
        payeeName: hosting.name,
        submit: true,
      }) as never,
    );

    // PAID
    const paidReq = await requestService.createRequest(
      employee,
      base({
        title: 'قبض تلفن دفتر مرکزی',
        categoryId: other.id,
        vendorId: telecom.id,
        payeeAccountId: telecomAccount.id,
        amountMinor: toman(350_000),
        payeeName: telecom.name,
        submit: true,
      }) as never,
    );
    await requestService.recordPayment(paidReq.id, finance, {
      paymentSourceId: bankSource.id,
      paidAt: new Date().toISOString(),
      settledAmountRial: toman(350_000),
      referenceNumber: 'REF-DEMO-0001',
      notes: 'پرداخت نمونه برای دمو',
    } as never);

    // FAILED — approved, but the transfer bounced.
    const failedReq = await requestService.createRequest(
      employee,
      base({
        title: 'واریز به تأمین‌کننده - شماره شبا اشتباه',
        categoryId: other.id,
        amountMinor: toman(900_000),
        payeeName: 'تأمین‌کننده نمونه',
        submit: true,
      }) as never,
    );
    await requestService.failPayment(
      failedReq.id,
      finance,
      'شماره شبا نامعتبر بود، نیاز به اصلاح دارد.',
    );

    // CANCELLED — requester changed their mind.
    const cancelledReq = await requestService.createRequest(
      employee,
      base({
        title: 'درخواست لغوشده نمونه',
        categoryId: other.id,
        amountMinor: toman(500_000),
        payeeName: 'فروشنده نمونه',
        submit: true,
      }) as never,
    );
    await requestService.cancel(cancelledReq.id, employee);

    console.log(
      'درخواست‌های پرداخت نمونه در همهٔ وضعیت‌ها (پیش‌نویس، در انتظار تأیید، نیازمند اصلاح، ردشده، تأییدشده، پرداخت‌شده، ناموفق، لغوشده، زمان‌بندی‌شده) ایجاد شدند.',
    );
  });

  await app.close();
  console.log('تمام شد.');
}

run().catch((error) => {
  console.error('اجرای اسکریپت دادهٔ نمونه مالی ناموفق بود:', error);
  process.exit(1);
});
