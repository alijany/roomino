'use client';

import { getRoleName, Role } from '@/components/auth/auth.constants.roles';
import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { formatMoney } from '@/libs/format/format.util';
import { Button, CurrencyInput } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView } from '@/ui/molecules';
import { IconPlus, IconSettings, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  useApprovalRules,
  useExpenseCategories,
  useReplaceApprovalRules,
} from '../finance.api';
import { ApprovalRuleInput } from '../finance.types';

/** Only these roles may sit in a chain — Finance pays, it does not approve. */
const APPROVER_ROLES: Role[] = [Role.APPROVER, Role.ADMIN];

/**
 * The approval matrix, editable without a deploy.
 *
 * Bands are edited as a set and saved together, because a half-saved matrix
 * with an overlap or a gap is worse than either version of it.
 */
export default function FinanceSettingsPage() {
  const { data, error, isLoading, refresh } = useApprovalRules();
  const { data: categoriesData } = useExpenseCategories(false);
  const save = useReplaceApprovalRules();

  const [rules, setRules] = useState<ApprovalRuleInput[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data?.items) return;
    setRules(
      data.items.map((rule) => ({
        minAmountRial: rule.minAmountRial,
        maxAmountRial: rule.maxAmountRial,
        categoryId: rule.categoryId ?? undefined,
        approverChain: rule.approverChain,
        priority: rule.priority,
        description: rule.description,
      }))
    );
    setDirty(false);
  }, [data]);

  const patch = (index: number, changes: Partial<ApprovalRuleInput>) => {
    setRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, ...changes } : rule))
    );
    setDirty(true);
  };

  const toggleRole = (index: number, role: Role) => {
    const chain = rules[index].approverChain;
    patch(index, {
      approverChain: chain.includes(role)
        ? chain.filter((r) => r !== role)
        : [...chain, role],
    });
  };

  const handleSave = async () => {
    try {
      await save.submit({ rules });
      toast.success('قوانین تأیید ذخیره شد');
      refresh();
    } catch (saveError) {
      toast.error((saveError as Error)?.message ?? 'ذخیره قوانین انجام نشد');
    }
  };

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.financeSettings.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col space-y-3 overflow-auto">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
              <IconSettings className="size-6" />
            </div>
            <div className="grow">
              <h1 className="font-bold text-slate-800">تنظیمات مالی</h1>
              <p className="text-sm text-slate-500">
                تعیین کنید هر مبلغ چه مسیر تأییدی را طی کند.
              </p>
            </div>
            {dirty && (
              <Button disabled={save.isLoading} onClick={handleSave}>
                {save.isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
              </Button>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5">
            <DataView
              data={data}
              error={error}
              isLoading={isLoading}
              variant="inline"
              onRetry={refresh}
            >
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <div
                    key={index}
                    className="space-y-3 rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="w-40">
                        <CurrencyInput
                          label="از (تومان)"
                          unit="toman"
                          value={rule.minAmountRial}
                          onValueChange={(value) =>
                            patch(index, { minAmountRial: value ?? 0 })
                          }
                        />
                      </div>
                      <div className="w-40">
                        <CurrencyInput
                          label="تا (تومان)"
                          unit="toman"
                          value={rule.maxAmountRial ?? null}
                          onValueChange={(value) => patch(index, { maxAmountRial: value })}
                          placeholder="بدون سقف"
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="!px-2 border-none text-rose-500"
                        onClick={() => {
                          setRules((prev) => prev.filter((_, i) => i !== index));
                          setDirty(true);
                        }}
                        aria-label="حذف این بازه"
                      >
                        <IconTrash className="size-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-slate-500">تأییدکنندگان:</span>
                      {APPROVER_ROLES.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => toggleRole(index, role)}
                          className="focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-full"
                        >
                          <Badge
                            tone={rule.approverChain.includes(role) ? 'info' : 'neutral'}
                            withDot={rule.approverChain.includes(role)}
                            size="md"
                          >
                            {getRoleName(role)}
                          </Badge>
                        </button>
                      ))}
                      {rule.approverChain.length === 0 && (
                        <span className="text-xs text-slate-400">
                          بدون تأییدکننده — مستقیم به صف مالی
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500">
                      {formatMoney(rule.minAmountRial)} تا{' '}
                      {rule.maxAmountRial ? formatMoney(rule.maxAmountRial) : 'بدون سقف'}
                      {rule.categoryId
                        ? ` — فقط دسته ${
                            categoriesData?.items.find((c) => c.id === rule.categoryId)?.name ??
                            rule.categoryId
                          }`
                        : ''}
                    </p>
                  </div>
                ))}

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    setRules((prev) => [
                      ...prev,
                      { minAmountRial: 0, maxAmountRial: null, approverChain: [] },
                    ]);
                    setDirty(true);
                  }}
                >
                  <IconPlus className="size-4" />
                  افزودن بازه
                </Button>
              </div>
            </DataView>
          </div>

          <div className="rounded-2xl bg-white p-5">
            <h2 className="mb-3 font-bold text-slate-800">دسته‌های هزینه</h2>
            <div className="flex flex-wrap gap-2">
              {categoriesData?.items.map((category) => (
                <Badge
                  key={category.id}
                  tone={category.active ? 'neutral' : 'muted'}
                  size="md"
                  withDot={false}
                >
                  {category.name}
                  {category.requiresInvoice && (
                    <span className="text-[10px] text-slate-400">فاکتور لازم است</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
