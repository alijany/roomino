'use client';

import { useAuth } from '@/components/auth/auth.context.provider';
import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { Role, getRoleName } from '@/components/auth/auth.constants.roles';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Avatar, Button, CurrencyInput, Dropdown, Input, ToggleSwitch } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { BackButton, DataView, DatePickerField } from '@/ui/molecules';
import { fromCivilDate, jalaliLabel, tehranToday, toCivilDate } from '@/app/dashboard/attendance/attendance.util';
import { IconCash, IconFileText, IconId, IconShieldLock, IconUser, IconX } from '@tabler/icons-react';
import { useParams } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { toast } from 'react-toastify';
import { setUserTeam, useTeams } from '../../teams/teams.api';
import { useUpdateUserName, useUser } from '../users.api';
import { useFeatures } from '../../settings/settings.api';
import { ContractsCard } from '../contracts.component.card';
import { DeleteUserCard } from '../users.component.delete-user';
import { RolesEditor } from '../users.component.roles-editor';
import { User } from '../users.types';

/** One user for the admin: the basic facts and the roles. More sections will follow here. */
export default function EditUserPage() {
    return (
        <RoleProtectedRoute allowedRoles={[Role.ADMIN, Role.PERSONNEL, Role.SENIOR_FINANCE]}>
            <DashbaordLayout>
                <EditUserContent />
            </DashbaordLayout>
        </RoleProtectedRoute>
    );
}

const SECTIONS = [
    { id: 'sec-basic', label: 'اطلاعات پایه', icon: IconUser },
    { id: 'sec-identity', label: 'هویتی و استخدامی', icon: IconId },
    { id: 'sec-payroll', label: 'اطلاعات حقوقی', icon: IconCash },
    { id: 'sec-contract', label: 'قرارداد و NDA', icon: IconFileText },
    { id: 'sec-roles', label: 'نقش‌ها و دسترسی‌ها', icon: IconShieldLock },
] as const;

const SALARY_MODE_LABEL = { regular: 'حقوقی', hybrid: 'هیبرید', flat: 'ساده' } as const;

/** Whole years and months between two civil dates, as «۱ سال و ۳ ماه». */
function tenureLabel(from: string, to: string): string {
    const a = new Date(`${from}T12:00:00`);
    const b = new Date(`${to}T12:00:00`);
    const months = Math.max((b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) - (b.getDate() < a.getDate() ? 1 : 0), 0);
    const years = Math.floor(months / 12);
    const rest = months % 12;
    const fa = (n: number) => n.toLocaleString('fa-IR');
    if (!years && !rest) return 'کمتر از یک ماه';
    return [years ? `${fa(years)} سال` : '', rest ? `${fa(rest)} ماه` : ''].filter(Boolean).join(' و ');
}

/** A form section: an icon tile, a title and a line of what it holds, then its fields. */
function SectionCard({ id, icon: Icon, title, hint, children }: { id: string; icon: typeof IconUser; title: string; hint: string; children: ReactNode }) {
    return (
        <section id={id} className="ui-surface scroll-mt-3 overflow-hidden">
            <header className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 lg:px-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-card">
                    <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-800">{title}</h2>
                    <p className="truncate text-xs text-slate-400">{hint}</p>
                </div>
            </header>
            <div className="space-y-4 p-4 lg:p-5">{children}</div>
        </section>
    );
}

/** The person at a glance: who, what they hold, and the dates that matter. */
function UserHero({ user }: { user: User }) {
    const today = tehranToday();
    const { data: teams } = useTeams();
    const team = teams?.items.find((t) => t.id === user.teamId);
    const left = user.cooperationEnded || Boolean(user.endDate && user.endDate < today);
    const probation = user.probationEndDate ? (user.probationEndDate >= today ? 'در دوره‌ی آزمایشی' : 'آزمایشی بود') : null;
    const facts: Array<[string, string]> = [
        ['نقش', user.roles.length ? user.roles.map((r) => getRoleName(r.role)).join('، ') : '—'],
        ['تیم', team?.name ?? '—'],
        ['شروع همکاری', user.hireDate ? jalaliLabel(user.hireDate) : '—'],
        ['سابقه', user.hireDate ? tenureLabel(user.hireDate, left && user.endDate && user.endDate < today ? user.endDate : today) : '—'],
        ['نوع حقوق', SALARY_MODE_LABEL[user.salaryMode ?? 'regular']],
        ['کد پرسنلی', user.personnelCode ?? '—'],
        ['تلگرام', user.telegramConnected ? 'فعال' : 'غیرفعال'],
    ];

    return (
        <section className="ui-surface overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 p-3 lg:p-4">
                <BackButton href="/admin/users" label="بازگشت به کاربران" />
                <div className="min-w-0 flex-1 basis-56 space-y-1">
                    <h1 className="truncate text-base font-bold text-slate-900 lg:text-lg">{user.name ?? 'بدون نام'}</h1>
                    <p className="text-sm text-slate-500">{user.jobTitle ?? 'عنوان شغلی ثبت نشده'}</p>
                    {(probation || left) && (
                        <div className="flex flex-wrap gap-1.5">
                            {left ? (
                                <Badge tone="neutral">پایان همکاری</Badge>
                            ) : (
                                probation && <Badge tone={probation === 'آزمایشی بود' ? 'neutral' : 'warning'}>{probation}</Badge>
                            )}
                        </div>
                    )}
                </div>
                <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-slate-100 lg:size-12">
                    <Avatar src={user.profilePicture} name={user.name} className="size-full rounded-[inherit]" />
                </div>
            </div>
            <dl className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-100 border-t border-slate-100 bg-slate-50/60 sm:grid-cols-[repeat(6,minmax(0,1fr))_auto]">
                {facts.map(([label, value]) => (
                    <div key={label} className="px-4 py-2.5 lg:px-5">
                        <dt className="text-xs text-slate-400">{label}</dt>
                        <dd className="mt-0.5 text-sm font-semibold text-slate-800">{value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

function EditUserContent() {
    const { id } = useParams<{ id: string }>();
    const { data: user, error, isLoading, refresh } = useUser(Number(id));
    // Roles, permissions and deleting a user stay with the admin.
    const isAdmin = useAuth().hasRole(Role.ADMIN);

    return (
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
            <DataView data={user} error={error} isLoading={isLoading} onRetry={refresh}>
                {user && (
                    <div className="space-y-4">
                        <UserHero user={user} />
                        {/* Keyed by what the server holds, so a save starts the fields from it. */}
                        <BasicInfoForm key={`${user.firstName}|${user.lastName}|${user.displayName}|${user.fatherName}|${user.teamId}|${user.phone}|${user.nationalId}|${user.personnelCode}|${user.jobTitle}`} user={user} onSaved={refresh}
                            below={
                            <>
                                <SectionCard id="sec-contract" icon={IconFileText} title="قرارداد و NDA" hint="سابقه‌ی قراردادها، تمدید و امضای NDA؛ هر تغییر همان لحظه ذخیره می‌شود">
                                    <ContractsCard userId={user.id} />
                                </SectionCard>
                            {isAdmin && (
                            <SectionCard id="sec-roles" icon={IconShieldLock} title="نقش‌ها و دسترسی‌ها" hint="هر تغییر همان لحظه ذخیره می‌شود">
                                <RolesEditor user={user} onChanged={refresh} />
                            </SectionCard>
                            )}
                            </>
                            }
                            danger={isAdmin ? <DeleteUserCard user={user} /> : undefined}
                        />
                    </div>
                )}
            </DataView>
        </div>
    );
}

/** Name, mobile, national ID, personnel code and job title — saved together with the button. */
function BasicInfoForm({ user, onSaved, below, danger }: { user: User; onSaved: () => void; below?: ReactNode; danger?: ReactNode }) {
    const isAdmin = useAuth().hasRole(Role.ADMIN);
    const [firstName, setFirstName] = useState(user.firstName ?? '');
    const [lastName, setLastName] = useState(user.lastName ?? '');
    const [displayName, setDisplayName] = useState(user.displayName ?? '');
    const [phone, setPhone] = useState(user.phone ?? '');
    const [nationalId, setNationalId] = useState(user.nationalId ?? '');
    const [personnelCode, setPersonnelCode] = useState(user.personnelCode ?? '');
    const [jobTitle, setJobTitle] = useState(user.jobTitle ?? '');
    const [hireDate, setHireDate] = useState(user.hireDate ?? '');
    const [endDate, setEndDate] = useState(user.endDate ?? '');
    const [probationEndDate, setProbationEndDate] = useState(user.probationEndDate ?? '');
    const [insuranceNumber, setInsuranceNumber] = useState(user.insuranceNumber ?? '');
    const [fatherName, setFatherName] = useState(user.fatherName ?? '');
    const [birthDate, setBirthDate] = useState(user.birthDate ?? '');
    const [insuranceStartDate, setInsuranceStartDate] = useState(user.insuranceStartDate ?? '');
    const [bankCardNumber, setBankCardNumber] = useState(user.bankCardNumber ?? '');
    const [bankAccountNumber, setBankAccountNumber] = useState(user.bankAccountNumber ?? '');
    const [address, setAddress] = useState(user.address ?? '');
    const [sheba, setSheba] = useState(user.sheba ?? '');
    const [email, setEmail] = useState(user.email ?? '');
    const [married, setMarried] = useState(Boolean(user.married));
    const [children, setChildren] = useState(String(user.childrenCount ?? 0));
    const [insured, setInsured] = useState(user.insured !== false);
    const [insuranceType, setInsuranceType] = useState<'worker' | 'board'>(user.insuranceType ?? 'worker');
    const [taxExempt, setTaxExempt] = useState(Boolean(user.taxExempt));
    const [supp, setSupp] = useState(Boolean(user.supplementaryInsurance));
    const [suppStart, setSuppStart] = useState(user.supplementaryInsuranceStart ?? '');
    const [suppAmount, setSuppAmount] = useState<number | null>(user.supplementaryInsuranceAmount ?? null);
    const [introduce, setIntroduce] = useState(Boolean(user.introduce));
    const [cooperationEnded, setCooperationEnded] = useState(Boolean(user.cooperationEnded));
    const [agreementType, setAgreementType] = useState<'gross' | 'net'>(user.agreementType ?? 'gross');
    const [salaryMode, setSalaryMode] = useState<'regular' | 'hybrid' | 'flat'>(user.salaryMode ?? 'regular');
    // A flat salary has no legal basis, so these facts do not move it.
    const dim = salaryMode === 'flat' ? 'opacity-40' : '';
    const { submit, isLoading, error } = useUpdateUserName();
    const teams = useTeams();
    const [teamId, setTeamId] = useState<number | null>(user.teamId ?? null);
    const features = useFeatures();

    const unchanged =
        firstName.trim() === (user.firstName ?? '') &&
        lastName.trim() === (user.lastName ?? '') &&
        displayName.trim() === (user.displayName ?? '') &&
        phone.trim() === (user.phone ?? '') &&
        nationalId.trim() === (user.nationalId ?? '') &&
        personnelCode.trim() === (user.personnelCode ?? '') &&
        jobTitle.trim() === (user.jobTitle ?? '') &&
        hireDate === (user.hireDate ?? '') &&
        endDate === (user.endDate ?? '') &&
        probationEndDate === (user.probationEndDate ?? '') &&
        insuranceNumber.trim() === (user.insuranceNumber ?? '') &&
        teamId === (user.teamId ?? null) &&
        fatherName.trim() === (user.fatherName ?? '') &&
        birthDate === (user.birthDate ?? '') &&
        insuranceStartDate === (user.insuranceStartDate ?? '') &&
        bankCardNumber.trim() === (user.bankCardNumber ?? '') &&
        bankAccountNumber.trim() === (user.bankAccountNumber ?? '') &&
        address.trim() === (user.address ?? '') &&
        sheba.trim() === (user.sheba ?? '') &&
        email.trim() === (user.email ?? '') &&
        married === Boolean(user.married) &&
        Number(children) === (user.childrenCount ?? 0) &&
        insured === (user.insured !== false) &&
        insuranceType === (user.insuranceType ?? 'worker') &&
        taxExempt === Boolean(user.taxExempt) &&
        supp === Boolean(user.supplementaryInsurance) &&
        suppStart === (user.supplementaryInsuranceStart ?? '') &&
        suppAmount === (user.supplementaryInsuranceAmount ?? null) &&
        introduce === Boolean(user.introduce) &&
        cooperationEnded === Boolean(user.cooperationEnded) &&
        agreementType === (user.agreementType ?? 'gross') &&
        salaryMode === (user.salaryMode ?? 'regular');

    const missing = [
        !firstName.trim() && 'نام',
        !lastName.trim() && 'نام خانوادگی',
        !phone.trim() && 'موبایل',
        !personnelCode.trim() && 'کد پرسنلی',
        !jobTitle.trim() && 'عنوان شغلی',
        cooperationEnded && !endDate && 'تاریخ پایان همکاری',
    ].filter(Boolean) as string[];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await submit({
                id: user.id,
                data: {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    displayName: displayName.trim(),
                    phone: phone.trim(),
                    nationalId: nationalId.trim(),
                    personnelCode: personnelCode.trim() || undefined,
                    jobTitle: jobTitle.trim(),
                    hireDate,
                    endDate,
                    probationEndDate,
                    insuranceNumber: insuranceNumber.trim(),
                    fatherName: fatherName.trim(),
                    birthDate,
                    insuranceStartDate,
                    bankCardNumber: bankCardNumber.trim(),
                    bankAccountNumber: bankAccountNumber.trim(),
                    address: address.trim(),
                    sheba: sheba.trim(),
                    email: email.trim(),
                    married,
                    childrenCount: Math.max(0, Math.floor(Number(children) || 0)),
                    insured,
                    insuranceType,
                    taxExempt,
                    supplementaryInsurance: supp,
                    supplementaryInsuranceStart: suppStart,
                    supplementaryInsuranceAmount: suppAmount,
                    cooperationEnded,
                    introduce: hireDate ? introduce : false,
                    agreementType,
                    salaryMode,
                },
            });
            if (teamId !== (user.teamId ?? null)) await setUserTeam(user.id, teamId);
            toast.success('تغییرات ذخیره شد');
            onSaved();
        } catch {
            // `error` is shown under the fields.
        }
    };

    return (
        <div className="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
            <aside className="ui-surface hidden overflow-hidden lg:sticky lg:top-0 lg:block">
                <nav aria-label="بخش‌های صفحه" className="space-y-0.5 p-2">
                    {SECTIONS.filter(({ id: sectionId }) => sectionId !== 'sec-roles' || isAdmin).map(({ id: sectionId, label, icon: Icon }) => (
                        <button
                            key={sectionId}
                            type="button"
                            onClick={() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        >
                            <Icon className="size-4 text-slate-400" aria-hidden="true" />
                            {label}
                        </button>
                    ))}
                </nav>
                <div className="border-t border-slate-100 p-2">
                    <Button type="submit" form="user-edit-form" className="w-full" disabled={isLoading || unchanged || missing.length > 0}>
                        {isLoading ? 'در حال ذخیره...' : 'ذخیره'}
                    </Button>
                </div>
            </aside>
            <div className="min-w-0 space-y-3">
        <form id="user-edit-form" onSubmit={handleSubmit} className="space-y-3">
            {error && (
                <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600" role="alert">
                    {(error.message || 'ذخیره انجام نشد').split(',').map((m: string) => (
                        <span key={m} className="block">{m}</span>
                    ))}
                </p>
            )}

            <SectionCard id="sec-basic" icon={IconUser} title="اطلاعات پایه" hint="نام، موبایل، کد ملی و عنوان شغلی">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
                <Input
                    id="edit-first-name"
                    containerClassName="lg:col-span-3"
                    packageId="edit-first-name"
                    label="نام"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    maxLength={50}
                    required
                />
                <Input
                    id="edit-last-name"
                    containerClassName="lg:col-span-3"
                    packageId="edit-last-name"
                    label="نام خانوادگی"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    maxLength={50}
                    required
                />
                <Input
                    id="edit-display-name"
                    containerClassName="lg:col-span-6"
                    packageId="edit-display-name"
                    label="نام نمایشی (اختیاری)"
                    placeholder="نامی که همکاران می‌بینند؛ خالی یعنی همان نام و نام خانوادگی"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={60}
                />
                <Input
                    id="edit-phone"
                    containerClassName="lg:col-span-3"
                    packageId="edit-phone"
                    label="شماره موبایل"
                    dir="ltr"
                    className="text-left"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={16}
                    required
                />
                <Input
                    id="edit-national-id"
                    containerClassName="lg:col-span-3"
                    packageId="edit-national-id"
                    label="کد ملی"
                    dir="ltr"
                    className="text-left"
                    inputMode="numeric"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value.replace(/[^0-9۰-۹٠-٩]/g, ''))}
                    maxLength={10}
                />
                <Input
                    id="edit-father-name"
                    containerClassName="lg:col-span-3"
                    packageId="edit-father-name"
                    label="نام پدر"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    maxLength={60}
                />
                <div className="lg:col-span-3"><OptionalDate label="تاریخ تولد" value={birthDate} onChange={setBirthDate} min={new Date('1940-01-01')} initial="1995-01-01" /></div>
                <Input
                    id="edit-personnel-code"
                    containerClassName="lg:col-span-3"
                    packageId="edit-personnel-code"
                    label="کد پرسنلی"
                    dir="ltr"
                    className="text-left"
                    value={personnelCode}
                    onChange={(e) => setPersonnelCode(e.target.value)}
                    maxLength={50}
                    required
                />
                <Input
                    id="edit-job-title"
                    containerClassName="lg:col-span-6 sm:col-span-2"
                    packageId="edit-job-title"
                    label="عنوان شغلی"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    maxLength={100}
                    required
                />
                <div className="space-y-1.5 lg:col-span-6 sm:col-span-2">
                    <div className="text-sm font-medium text-slate-700">تیم</div>
                    <Dropdown
                        items={[
                            { label: 'بدون تیم', value: null as number | null },
                            ...(teams.data?.items ?? []).map((t) => ({
                                label: t.parentName ? `${t.name} (زیر ${t.parentName})` : t.name,
                                value: t.id as number | null,
                            })),
                        ]}
                        value={teamId}
                        onChange={(value) => setTeamId(value ?? null)}
                        placeholder="بدون تیم"
                        variant="outline"
                    />
                </div>
                <Input
                    id="edit-email"
                    containerClassName="lg:col-span-3"
                    packageId="edit-email"
                    label="ایمیل"
                    dir="ltr"
                    className="text-left"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={100}
                />
            </div>

            </SectionCard>

            <SectionCard id="sec-identity" icon={IconId} title="اطلاعات هویتی و استخدامی" hint="تاریخ‌های همکاری، دوره‌ی آزمایشی و اطلاعات بانکی و بیمه">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
                <div className="lg:col-span-6"><OptionalDate label="شروع همکاری" value={hireDate} onChange={setHireDate} /></div>
                <div className="lg:col-span-6"><OptionalDate label="پایان دوره آزمایشی" value={probationEndDate} onChange={setProbationEndDate} /></div>
                {hireDate && (
                    <div className="lg:col-span-12">
                        <PayrollToggle label="معرفی در داشبورد همکاران (تا یک ماه از شروع همکاری)" checked={introduce} onChange={setIntroduce} />
                    </div>
                )}
                <Input
                    id="edit-insurance-number"
                    containerClassName="lg:col-span-6"
                    packageId="edit-insurance-number"
                    label="شماره بیمه"
                    dir="ltr"
                    className="text-left"
                    inputMode="numeric"
                    value={insuranceNumber}
                    onChange={(e) => setInsuranceNumber(e.target.value)}
                    maxLength={20}
                />
                <div className="lg:col-span-6"><OptionalDate label="تاریخ شروع بیمه" value={insuranceStartDate} onChange={setInsuranceStartDate} /></div>
                <Input
                    id="edit-sheba"
                    containerClassName="lg:col-span-4"
                    packageId="edit-sheba"
                    label="شماره شبا"
                    dir="ltr"
                    className="text-left"
                    placeholder="IR…"
                    value={sheba}
                    onChange={(e) => setSheba(e.target.value)}
                    maxLength={26}
                />
                <Input
                    id="edit-bank-card"
                    containerClassName="lg:col-span-4"
                    packageId="edit-bank-card"
                    label="شماره کارت بانکی"
                    dir="ltr"
                    className="text-left"
                    inputMode="numeric"
                    placeholder="۱۶ رقم"
                    value={bankCardNumber}
                    onChange={(e) => setBankCardNumber(e.target.value)}
                    maxLength={19}
                />
                <Input
                    id="edit-bank-account"
                    containerClassName="lg:col-span-4"
                    packageId="edit-bank-account"
                    label="شماره حساب بانکی"
                    dir="ltr"
                    className="text-left"
                    inputMode="numeric"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    maxLength={30}
                />
                <Input
                    id="edit-address"
                    containerClassName="lg:col-span-12"
                    packageId="edit-address"
                    label="آدرس محل سکونت"
                    textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={500}
                />
            </div>

            </SectionCard>

            <SectionCard id="sec-payroll" icon={IconCash} title="اطلاعات حقوقی" hint="نوع حقوق و مواردی که روی محاسبه اثر می‌گذارند">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
                <div className={`space-y-1.5 lg:col-span-3 ${dim}`}>
                    <div className="text-sm font-medium text-slate-700">نوع توافق حقوق</div>
                    <Dropdown
                        items={[
                            { value: 'gross', label: 'ناخالص (قبل از بیمه)' },
                            { value: 'net', label: 'خالص (دریافتی نهایی)' },
                        ]}
                        value={agreementType}
                        onChange={(v) => {
                            if (v) setAgreementType(v as 'gross' | 'net');
                        }}
                        variant="outline"
                    />
                </div>
                <div className="space-y-1.5 lg:col-span-3">
                    <div className="text-sm font-medium text-slate-700">نوع حقوق</div>
                    <Dropdown
                        items={[
                            { value: 'regular', label: 'حقوقی (مشمول قوانین)' },
                            { value: 'hybrid', label: 'هیبرید (بسته‌ی قانونی + مازاد)' },
                            { value: 'flat', label: 'ساده (بدون قوانین)' },
                        ]}
                        value={salaryMode}
                        onChange={(v) => {
                            if (v) setSalaryMode(v as 'regular' | 'hybrid' | 'flat');
                        }}
                        variant="outline"
                    />
                </div>
                <div className={`space-y-1.5 lg:col-span-3 ${dim}`}>
                    <div className="text-sm font-medium text-slate-700">نوع بیمه</div>
                    <Dropdown
                        items={[
                            { value: 'worker', label: 'کارگر' },
                            { value: 'board', label: 'هیئت‌مدیره (بدون بیمه‌ی بیکاری)' },
                        ]}
                        value={insuranceType}
                        onChange={(v) => {
                            if (v) setInsuranceType(v as 'worker' | 'board');
                        }}
                        variant="outline"
                        disabled={!insured}
                    />
                </div>
                <div className={`lg:col-span-3 ${dim}`}>
                <Input
                    id="edit-children"
                    packageId="edit-children"
                    label="تعداد فرزند"
                    dir="ltr"
                    className="text-left"
                    inputMode="numeric"
                    value={children}
                    onChange={(e) => setChildren(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={2}
                />
                </div>
            </div>
            <div className={`flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-3 ${dim}`}>
                <PayrollToggle label="متأهل" checked={married} onChange={setMarried} />
                <PayrollToggle label="مشمول بیمه" checked={insured} onChange={setInsured} />
                <PayrollToggle label="معاف از مالیات" checked={taxExempt} onChange={setTaxExempt} />
            </div>

            {/* The premium comes off the take-home whatever the salary type, so it is not dimmed with the legal facts. */}
            {features.data?.supplementaryInsurance && (
            <div className="space-y-3 border-t border-slate-100 pt-3">
                <PayrollToggle label="بیمه تکمیلی (کسر ماهانه از حقوق)" checked={supp} onChange={setSupp} />
                {supp && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
                        <div className="lg:col-span-6">
                            <OptionalDate label="تاریخ شروع بیمه تکمیلی" value={suppStart} onChange={setSuppStart} />
                        </div>
                        <div className="lg:col-span-6">
                            <CurrencyInput
                                label="مبلغ ماهانه‌ی اختصاصی (ریال)"
                                unit="rial"
                                placeholder="خالی: مبلغ تنظیمات سال"
                                value={suppAmount}
                                onValueChange={setSuppAmount}
                            />
                        </div>
                    </div>
                )}
            </div>
            )}

            </SectionCard>

            <div className="flex gap-3 lg:hidden">
                <Button type="submit" disabled={isLoading || unchanged || missing.length > 0}>
                    {isLoading ? 'در حال ذخیره...' : 'ذخیره'}
                </Button>
            </div>
        </form>
                {below}
                <div className="grid gap-3 lg:grid-cols-2">
                    <section className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 lg:p-5">
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-amber-700">پایان همکاری</h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                با روشن بودن، فرد نمی‌تواند وارد سیستم شود و در هیچ فهرستی جز فهرست کاربران دیده نمی‌شود. با دکمه‌ی ذخیره اعمال می‌شود.
                            </p>
                        </div>
                        <PayrollToggle
                            label="همکاری این فرد پایان یافته است"
                            checked={cooperationEnded}
                            onChange={(on) => {
                                setCooperationEnded(on);
                                if (!on) setEndDate('');
                            }}
                        />
                        {cooperationEnded && <OptionalDate label="تاریخ پایان همکاری (الزامی)" value={endDate} onChange={setEndDate} />}
                    </section>
                    {danger}
                </div>
            </div>
        </div>
    );
}

/** A Jalali date that may be empty: «تعیین تاریخ» starts it at today, ✕ clears it. */
function OptionalDate({ label, value, onChange, min = new Date('2000-01-01'), initial }: { label: string; value: string; onChange: (value: string) => void; min?: Date; initial?: string }) {
    return (
        <div className="w-full min-w-0">
            <div className="mb-1.5 text-sm font-medium text-slate-700">{label}</div>
            <div className="flex items-center gap-2">
                {value ? (
                    <>
                        <DatePickerField
                            hideLabel
                            className="min-w-0 flex-1 justify-start gap-2 !px-3"
                            label={label}
                            value={fromCivilDate(value)}
                            minSelectableDate={min}
                            onSelect={(d) => onChange(toCivilDate(d))}
                        />
                        <Button type="button" variant="ghost" size="sm" className="shrink-0 !px-2 text-slate-400" aria-label={`پاک کردن ${label}`} onClick={() => onChange('')}>
                            <IconX className="size-4" />
                        </Button>
                    </>
                ) : (
                    <Button type="button" variant="outline" size="sm" className="w-full justify-start text-slate-500" onClick={() => onChange(initial ?? tehranToday())}>
                        تعیین تاریخ
                    </Button>
                )}
            </div>
        </div>
    );
}

/** A yes/no with the switch on the right and the label beside it. */
function PayrollToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <div dir="rtl" className="flex items-center gap-3">
            <ToggleSwitch size="sm" aria-label={label} checked={checked} onChange={onChange} />
            <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
    );
}
