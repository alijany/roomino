'use client';

import { Role, Roles, getRoleName } from '@/components/auth/auth.constants.roles';
import { Dropdown } from '@/ui/atoms/ui.dropdown';
import { IconPlus, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useAddUserRole, useRemoveUserRole } from './users.api';
import { User, UserRole } from './users.types';

/** Roles take effect at once, apart from the Save button, and keep at least one. */
export function RolesEditor({ user, onChanged }: { user: User; onChanged: () => void }) {
    const addRole = useAddUserRole();
    const removeRole = useRemoveUserRole();
    const [error, setError] = useState<string | null>(null);
    const busy = addRole.isLoading || removeRole.isLoading;

    const run = async (action: () => Promise<unknown>) => {
        setError(null);
        try {
            await action();
            onChanged();
        } catch (e) {
            setError((e as Error)?.message || 'تغییر نقش انجام نشد');
        }
    };

    const addable = Roles.filter((role) => !user.roles.some((r) => r.role === role)).map((role) => ({
        value: role,
        label: getRoleName(role),
    }));

    return (
        <div className="space-y-2">
            <div className="text-sm font-medium text-slate-700">نقش‌ها</div>
            <div className="flex flex-wrap items-center gap-1.5">
                {user.roles.map((role: UserRole) => (
                    <span
                        key={role.id}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600"
                    >
                        {getRoleName(role.role)}
                        {user.roles.length > 1 && (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => run(() => removeRole.submit({ id: user.id, roleId: role.id }))}
                                className="text-slate-400 hover:text-rose-500"
                                aria-label={`حذف نقش ${getRoleName(role.role)}`}
                            >
                                <IconX size={13} />
                            </button>
                        )}
                    </span>
                ))}
                {addable.length > 0 && (
                    <span className="inline-block">
                    <Dropdown
                        items={addable}
                        value={null}
                        onChange={async (role: Role | null) => {
                            if (role) await run(() => addRole.submit({ id: user.id, data: { role } }));
                        }}
                        disabled={busy}
                        renderButton={() => (
                            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-1 text-xs font-medium text-slate-500 hover:border-primary/50 hover:text-primary">
                                <IconPlus size={13} />
                                نقش جدید
                            </span>
                        )}
                    />
                    </span>
                )}
            </div>
            {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}
        </div>
    );
}
