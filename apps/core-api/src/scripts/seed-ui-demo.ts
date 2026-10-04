/** Local UI fixtures. Adds named demo records in one transaction without running
 * the application, migrations, jobs, or outbound notification delivery.
 * Re-running keeps existing fixtures and adds only missing records.
 */
import 'reflect-metadata';
import {
  EntityClass,
  EntityData,
  EntityManager,
  FilterQuery,
  RequiredEntityData,
} from '@mikro-orm/core';
import { MikroORM } from '@mikro-orm/postgresql';
import { resolve } from 'node:path';
import {
  AttendanceSource,
  AttendanceStatus,
  LeaveType,
  PolicyRequestType,
  RequestStatus,
  RequestType,
  WorkMode,
} from '../attendance/attendance.constants';
import { AttendanceEntity } from '../attendance/entities/attendance.entity';
import { AttendanceRequestEntity } from '../attendance/entities/attendance-request.entity';
import { EmployeeProfileEntity } from '../attendance/entities/employee-profile.entity';
import { EmployeeShiftEntity } from '../attendance/entities/employee-shift.entity';
import { JobGroupEntity } from '../attendance/entities/job-group.entity';
import { LeaveBalanceEntity } from '../attendance/entities/leave-balance.entity';
import { ShiftDayEntity } from '../attendance/entities/shift-day.entity';
import { ShiftEntity } from '../attendance/entities/shift.entity';
import { WorkplaceEntity } from '../attendance/entities/workplace.entity';
import { WorkPolicyEntity } from '../attendance/entities/work-policy.entity';
import { WorkPolicyRuleEntity } from '../attendance/entities/work-policy-rule.entity';
import {
  addDays,
  composeInstant,
  currentJalali,
  iranWeekday,
  tehranToday,
} from '../attendance/utils/attendance-time.util';
import { ApprovalStepEntity } from '../finance/entities/approval-step.entity';
import { ExpenseCategoryEntity } from '../finance/entities/expense-category.entity';
import { FinanceActivityEntity } from '../finance/entities/finance-activity.entity';
import { PayeeAccountEntity } from '../finance/entities/payee-account.entity';
import { PaymentEntity } from '../finance/entities/payment.entity';
import { PaymentRequestEntity } from '../finance/entities/payment-request.entity';
import { PaymentSourceEntity } from '../finance/entities/payment-source.entity';
import { RecurringExpenseEntity } from '../finance/entities/recurring-expense.entity';
import { VendorEntity } from '../finance/entities/vendor.entity';
import {
  ApprovalStepStatus,
  BillingCalendar,
  Currency,
  FinanceActivityAction,
  PayeeAccountType,
  PaymentRequestStatus,
  PaymentSourceType,
  PaymentStatus,
  RecurrenceCycle,
} from '../finance/finance.constants';
import { MeetingRoomEntity } from '../meeting/entities/meeting-room.entity';
import { ReservationEntity } from '../meeting/entities/reservation.entity';
import {
  NotificationCategory,
  NotificationStatus,
  NotificationType,
} from '../notification/notification.constants';
import { NotificationEntity } from '../notification/notification.entity';
import { Role } from '../roles/roles.constants';
import { InvitationStatus, RolesEntity } from '../roles/roles.entity';
import { UserEntity } from '../user/user.entity';

const prefix = 'نمونه UI';
const demoDescription = 'DEMO_UI — داده نمونه برای بررسی رابط کاربری';
const personas: Array<{
  phone: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  attendance?: boolean;
}> = [
  {
    phone: '+989210000101',
    firstName: 'مدیر',
    lastName: 'نمونه',
    roles: [Role.ADMIN, Role.USER],
  },
  {
    phone: '+989210000102',
    firstName: 'نگار',
    lastName: 'مالی',
    roles: [Role.FINANCE, Role.USER],
  },
  {
    phone: '+989210000103',
    firstName: 'رضا',
    lastName: 'تأییدکننده',
    roles: [Role.APPROVER, Role.USER],
  },
  {
    phone: '+989210000104',
    firstName: 'مینا',
    lastName: 'منابع انسانی',
    roles: [Role.HR, Role.USER],
  },
  {
    phone: '+989210000105',
    firstName: 'سارا',
    lastName: 'توسعه',
    roles: [Role.USER],
  },
  {
    phone: '+989210000106',
    firstName: 'علی',
    lastName: 'پشتیبانی',
    roles: [Role.USER],
  },
  {
    phone: '+989210000107',
    firstName: 'مدیر',
    lastName: 'چندنقشی',
    roles: [Role.ADMIN, Role.FINANCE, Role.APPROVER, Role.HR, Role.USER],
  },
  {
    phone: '+989210000108',
    firstName: 'کاربر',
    lastName: 'بدون پرونده',
    roles: [Role.USER],
    attendance: false,
  },
];

async function seed(em: EntityManager) {
  async function ensure<T extends object>(
    entity: EntityClass<T>,
    where: FilterQuery<T>,
    data: EntityData<T>,
  ): Promise<T> {
    const existing = await em.findOne(entity, where);
    if (existing) return existing;
    const record = em.create(entity, data as RequiredEntityData<T>);
    await em.persistAndFlush(record);
    return record;
  }

  const now = new Date();
  const today = tehranToday(now);
  const { year } = currentJalali();
  const users: UserEntity[] = [];
  for (const persona of personas) {
    const user = await ensure(
      UserEntity,
      { phone: persona.phone },
      {
        phone: persona.phone,
        firstName: persona.firstName,
        lastName: persona.lastName,
        isApproved: true,
      },
    );
    users.push(user);
    for (const role of persona.roles) {
      await ensure(
        RolesEntity,
        { user, role },
        {
          user,
          role,
          invitationStatus: InvitationStatus.ACCEPTED,
          description: demoDescription,
        },
      );
    }
  }
  const [admin, finance, approver, hr, employee] = users;

  const workplace = await ensure(
    WorkplaceEntity,
    { name: `${prefix} · دفتر تهران` },
    {
      name: `${prefix} · دفتر تهران`,
      city: 'تهران',
      address: 'دفتر نمونه',
      lat: 35.7006,
      lng: 51.4091,
      radiusMeters: 300,
    },
  );
  const group = await ensure(
    JobGroupEntity,
    { name: `${prefix} · محصول و توسعه` },
    { name: `${prefix} · محصول و توسعه` },
  );
  await em.populate(group, ['approvers']);
  if (!group.approvers.contains(admin)) group.approvers.add(admin);
  if (!group.approvers.contains(approver)) group.approvers.add(approver);
  const shift = await ensure(
    ShiftEntity,
    { name: `${prefix} · شیفت اداری`, year },
    { name: `${prefix} · شیفت اداری`, year, flexMinutes: 15 },
  );
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    await ensure(
      ShiftDayEntity,
      { shift, dayOfWeek },
      {
        shift,
        dayOfWeek,
        isActive: dayOfWeek < 5,
        startTime: dayOfWeek < 5 ? '08:00' : null,
        endTime: dayOfWeek < 5 ? '16:00' : null,
      },
    );
  }
  const policy = await ensure(
    WorkPolicyEntity,
    { name: `${prefix} · سیاست اداری` },
    {
      name: `${prefix} · سیاست اداری`,
      description: demoDescription,
      isDefault: false,
    },
  );
  await ensure(
    WorkPolicyRuleEntity,
    {
      policy,
      requestType: PolicyRequestType.LEAVE_ENTITLED,
      year,
      period: null,
    },
    {
      policy,
      requestType: PolicyRequestType.LEAVE_ENTITLED,
      year,
      yearlyCapMinutes: 26 * 480,
      monthlyCapMinutes: 3 * 480,
    },
  );
  for (const [i, user] of users.entries()) {
    if (personas[i].attendance === false) continue;
    const profile = await ensure(
      EmployeeProfileEntity,
      { user },
      {
        user,
        workplace,
        jobGroup: group,
        workPolicy: policy,
        personnelCode: `DEMO-UI-${i + 1}`,
        jobTitle: user.lastName,
        useGps: false,
        remoteDays: i === 5 ? [1, 3] : [],
      },
    );
    await ensure(
      EmployeeShiftEntity,
      { employee: profile, shift },
      { employee: profile, shift, startDate: addDays(today, -60) },
    );
    await ensure(
      LeaveBalanceEntity,
      { employee: profile, leaveType: LeaveType.ENTITLED, year },
      {
        employee: profile,
        leaveType: LeaveType.ENTITLED,
        year,
        accruedMinutes: 26 * 480,
        usedMinutes: i === 5 ? 480 : 0,
      },
    );
    for (let offset = -24; offset < 0; offset++) {
      const date = addDays(today, offset);
      if (iranWeekday(date) >= 5 || (offset + i) % 11 === 0) continue;
      await ensure(
        AttendanceEntity,
        { employee: profile, date },
        {
          employee: profile,
          workplace,
          date,
          checkInAt: composeInstant(date, i % 3 === 0 ? '08:20' : '08:00'),
          checkOutAt: composeInstant(date, i % 2 === 0 ? '16:30' : '16:00'),
          checkInSource: AttendanceSource.MANUAL,
          checkOutSource: AttendanceSource.MANUAL,
          workMode: (offset + i) % 4 === 0 ? WorkMode.REMOTE : WorkMode.OFFICE,
        },
      );
    }
    if (i !== 5) {
      await ensure(
        AttendanceEntity,
        { employee: profile, date: today },
        {
          employee: profile,
          workplace,
          date: today,
          checkInAt: new Date(now.getTime() - 2 * 3600000),
          checkOutAt:
            i % 2 === 0 ? undefined : new Date(now.getTime() - 15 * 60000),
          checkInSource: AttendanceSource.MANUAL,
          workMode: i === 4 ? WorkMode.REMOTE : WorkMode.OFFICE,
          status: AttendanceStatus.PRESENT,
        },
      );
    }
    const description = `${prefix} · درخواست مرخصی ${i + 1}`;
    const date = addDays(today, i === 5 ? 0 : i + 2);
    await ensure(
      AttendanceRequestEntity,
      { employee: profile, description },
      {
        employee: profile,
        workplace,
        type: RequestType.LEAVE_ENTITLED_DAILY,
        dateFrom: date,
        dateTo: date,
        description,
        durationMinutes: 480,
        status:
          i === 5
            ? RequestStatus.APPROVED
            : i === 2
            ? RequestStatus.REJECTED
            : RequestStatus.PENDING,
        reviewedBy: [2, 5].includes(i) ? hr : undefined,
        reviewedAt: [2, 5].includes(i) ? now : undefined,
        reviewNote: i === 2 ? 'درخواست نمونه ردشده' : undefined,
      },
    );
  }

  for (const [i, name] of [
    'اتاق آفتاب',
    'اتاق باران',
    'اتاق گفتگو',
  ].entries()) {
    const room = await ensure(
      MeetingRoomEntity,
      { name: `${prefix} · ${name}` },
      {
        name: `${prefix} · ${name}`,
        description: demoDescription,
        capacity: [8, 4, 12][i],
        location: `طبقه ${i + 1}`,
      },
    );
    for (const offset of [-14, -7, -3, -1, 0, 1, 2]) {
      const date = addDays(today, offset);
      const startAt = composeInstant(
        date,
        `${String(9 + i).padStart(2, '0')}:00`,
      );
      await ensure(
        ReservationEntity,
        { room, startAt },
        {
          room,
          user: offset % 2 === 0 ? admin : employee,
          startAt,
          endAt: new Date(startAt.getTime() + 3600000),
          title: `${prefix} · جلسه ${['برنامه‌ریزی', 'طراحی', 'هماهنگی'][i]}`,
          purpose: 'رزرو نمونه برای بررسی تقویم',
        },
      );
    }
  }

  const category = await em.findOne(ExpenseCategoryEntity, { code: 'other' });
  if (!category)
    throw new Error(
      'Start the local API once to create default finance categories.',
    );
  const source = await ensure(
    PaymentSourceEntity,
    { label: `${prefix} · تنخواه اداری` },
    {
      label: `${prefix} · تنخواه اداری`,
      type: PaymentSourceType.PETTY_CASH,
      notes: demoDescription,
    },
  );
  const vendors: VendorEntity[] = [];
  const accounts: PayeeAccountEntity[] = [];
  for (const name of ['تجهیزات اداری', 'خدمات ابری', 'اینترنت دفتر']) {
    const vendor = await ensure(
      VendorEntity,
      { name: `${prefix} · ${name}` },
      { name: `${prefix} · ${name}`, notes: demoDescription },
    );
    vendors.push(vendor);
    accounts.push(
      await ensure(
        PayeeAccountEntity,
        { vendor, label: 'حساب نمونه' },
        {
          vendor,
          label: 'حساب نمونه',
          type: PayeeAccountType.SHEBA,
          holderName: vendor.name,
          sheba: 'IR820540102680020817909002',
          isDefault: true,
        },
      ),
    );
  }
  const statuses = Object.values(PaymentRequestStatus);
  for (const [i, status] of statuses.entries()) {
    const title = `${prefix} · پرداخت ${status}`;
    const vendor = vendors[i % vendors.length];
    const account = accounts[i % accounts.length];
    const pending = status === PaymentRequestStatus.PENDING_APPROVAL;
    const paid = status === PaymentRequestStatus.PAID;
    const decided = [
      PaymentRequestStatus.APPROVED,
      PaymentRequestStatus.SCHEDULED,
      PaymentRequestStatus.PAID,
      PaymentRequestStatus.REJECTED,
      PaymentRequestStatus.FAILED,
    ].includes(status);
    const request = await ensure(
      PaymentRequestEntity,
      { requester: admin, title },
      {
        requester: admin,
        title,
        description: demoDescription,
        category,
        vendor,
        payeeAccount: account,
        payeeName: vendor.name,
        payeeAccountType: account.type,
        payeeAccountHolder: vendor.name,
        payeeSheba: account.sheba,
        amountMinor: (i + 1) * 1250000,
        currency: Currency.IRR,
        status,
        dueDate: composeInstant(addDays(today, i - 4), '12:00'),
        submittedAt:
          status === PaymentRequestStatus.DRAFT
            ? undefined
            : composeInstant(addDays(today, -7), '10:00'),
        decidedAt: decided
          ? composeInstant(addDays(today, -3), '11:00')
          : undefined,
        paidAt: paid ? composeInstant(addDays(today, -2), '12:00') : undefined,
        pendingRole: pending ? Role.APPROVER : undefined,
        pendingSequence: pending ? 0 : undefined,
        lastDecisionComment:
          status === PaymentRequestStatus.NEEDS_INFO
            ? 'لطفاً فاکتور نمونه را اضافه کنید.'
            : status === PaymentRequestStatus.REJECTED
            ? 'بودجه نمونه کافی نیست.'
            : undefined,
      },
    );
    if (pending || decided) {
      await ensure(
        ApprovalStepEntity,
        { request, sequence: 0 },
        {
          request,
          sequence: 0,
          requiredRole: Role.APPROVER,
          status: pending
            ? ApprovalStepStatus.PENDING
            : status === PaymentRequestStatus.REJECTED
            ? ApprovalStepStatus.REJECTED
            : ApprovalStepStatus.APPROVED,
          actor: pending ? undefined : approver,
          decidedAt: request.decidedAt,
        },
      );
    }
    await ensure(
      FinanceActivityEntity,
      { request, action: FinanceActivityAction.CREATED },
      {
        request,
        actor: admin,
        action: FinanceActivityAction.CREATED,
        toStatus: PaymentRequestStatus.DRAFT,
        comment: demoDescription,
      },
    );
    if (paid || status === PaymentRequestStatus.FAILED) {
      await ensure(
        PaymentEntity,
        { request },
        {
          request,
          paymentSource: source,
          paidBy: finance,
          paidAt: request.paidAt ?? now,
          settledAmountRial: request.amountMinor,
          status: paid ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED,
          referenceNumber: `DEMO-UI-${status}`,
          notes: demoDescription,
          failureReason: paid ? undefined : 'خطای انتقال نمونه',
        },
      );
    }
  }
  for (const requiredRole of [Role.ADMIN, Role.APPROVER]) {
    const title = `${prefix} · تأیید هزینه ${requiredRole}`;
    const request = await ensure(
      PaymentRequestEntity,
      { requester: employee, title },
      {
        requester: employee,
        title,
        description: demoDescription,
        category,
        vendor: vendors[0],
        payeeAccount: accounts[0],
        payeeName: vendors[0].name,
        payeeAccountType: PayeeAccountType.SHEBA,
        payeeSheba: accounts[0].sheba,
        amountMinor: 75000000,
        dueDate: composeInstant(addDays(today, 5), '12:00'),
        status: PaymentRequestStatus.PENDING_APPROVAL,
        pendingRole: requiredRole,
        pendingSequence: 0,
        submittedAt: now,
      },
    );
    await ensure(
      ApprovalStepEntity,
      { request, sequence: 0 },
      { request, sequence: 0, requiredRole },
    );
    await ensure(
      FinanceActivityEntity,
      { request, action: FinanceActivityAction.SUBMITTED },
      {
        request,
        actor: employee,
        action: FinanceActivityAction.SUBMITTED,
        toStatus: PaymentRequestStatus.PENDING_APPROVAL,
        comment: demoDescription,
      },
    );
  }
  for (const [i, vendor] of vendors.entries()) {
    await ensure(
      RecurringExpenseEntity,
      { title: `${prefix} · هزینه ماهانه ${i + 1}` },
      {
        title: `${prefix} · هزینه ماهانه ${i + 1}`,
        vendor,
        category,
        payeeAccount: accounts[i],
        defaultPaymentSource: source,
        amountMinor: (i + 1) * 12000000,
        cycle: RecurrenceCycle.MONTHLY,
        calendar: BillingCalendar.JALALI,
        nextDueDate: composeInstant(addDays(today, 15 + i * 5), '12:00'),
        owner: admin,
        reminderDays: [],
        notes: demoDescription,
      },
    );
  }
  for (const [message, link] of [
    [
      'به محیط نمونه خوش آمدید؛ ابزارهای سازمان در بخش مدیریت قرار دارند.',
      '/dashboard/management',
    ],
    [
      'یک درخواست پرداخت نمونه در انتظار تأیید شماست.',
      '/dashboard/finance/approvals',
    ],
    [
      'درخواست‌های مرخصی نمونه آماده بررسی هستند.',
      '/dashboard/attendance/requests',
    ],
  ]) {
    await ensure(
      NotificationEntity,
      { user: admin, message },
      {
        user: admin,
        message,
        link,
        type: NotificationType.SYSTEM,
        category: NotificationCategory.SYSTEM,
        status: NotificationStatus.SENT,
        metadata: { demo: 'ui' },
        sentAt: now,
        isRead: false,
      },
    );
  }
  await em.flush();
}

async function run() {
  process.loadEnvFile(resolve(__dirname, '../../.env'));
  if (process.env.NODE_ENV !== 'development')
    throw new Error(
      'UI demo seeding is only allowed with NODE_ENV=development.',
    );
  const orm = await MikroORM.init({
    host: process.env.DB_HOST,
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    dbName: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    entities: [resolve(__dirname, '../**/*.entity.ts')],
    entitiesTs: [resolve(__dirname, '../**/*.entity.ts')],
    debug: false,
  });
  try {
    await orm.em.fork().transactional(seed);
    console.log('UI demo fixtures ready. Existing records were kept.');
    console.table(
      personas.map((person) => ({
        phone: person.phone,
        roles: person.roles.join(', '),
      })),
    );
    console.log(
      'Sign in with a demo phone. Development OTP appears in the API terminal.',
    );
  } finally {
    await orm.close();
  }
}

run().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
