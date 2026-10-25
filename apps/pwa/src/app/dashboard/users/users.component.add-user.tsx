'use client';

import { Role, getRoleName } from '@/components/auth/auth.constants.roles';
import { Button, Input } from '@/ui/atoms';
import { Dropdown } from '@/ui/atoms/ui.dropdown';
import { Modal } from '@/ui/atoms/ui.modal';
import { ResultModal } from '@/ui/molecules/result-modal';
import { IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useAddUser } from './users.api';

interface AddUserFormProps {
    onSuccess?: () => void;
}

export function AddUserForm({ onSuccess }: AddUserFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [phone, setPhone] = useState('');
    // const [name, setName] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [role, setRole] = useState<Role | ''>('');
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);

    const { submit, isLoading, error, reset } = useAddUser();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await submit({
                phone,
                // name: name || undefined,
                firstName: firstName || undefined,
                lastName: lastName || undefined,
                jobTitle: jobTitle.trim() || undefined,
                role: role || undefined
            });
            setIsResultModalOpen(true);
            setPhone('');
            // setName('');
            setFirstName('');
            setLastName('');
            setJobTitle('');
            setRole('');
            setIsOpen(false);
            if (onSuccess) onSuccess();
        } catch {
            setIsResultModalOpen(true);
        }
    };

    // Available roles for the dropdown
    const availableRoles = [
        { value: Role.USER, label: 'کاربر عادی' },
        { value: Role.ADMIN, label: getRoleName(Role.ADMIN) }
    ];

    const handleCloseResultModal = () => {
        setIsResultModalOpen(false);
        reset();
    };

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>افزودن کاربر جدید</Button>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                className='lg:min-w-[500px] bg-white'
            >
                <div className="p-6 flex flex-col gap-4">
                    <div className='flex justify-between items-center'>
                        <div className='font-bold text-lg lg:text-xl text-slate-700'>
                            افزودن کاربر جدید
                        </div>

                        <Button variant='outline' className='!px-2' onClick={() => setIsOpen(false)}>
                            <IconX className='size-5' />
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                                نقش کاربر
                            </label>
                            <Dropdown
                                items={availableRoles}
                                value={role}
                                onChange={(value) => setRole(value as Role)}
                                placeholder="انتخاب نقش کاربر"
                                variant="outline"
                            />
                        </div>

                        <Input
                            id="phone"
                            label='شماره موبایل کاربر'
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="0912-345-6789"
                            required
                        />

                        {/* <Input
                            id="name"
                            label='نام کاربر'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="نام کامل"
                        /> */}

                        <Input
                            id="firstName"
                            label='نام (اختیاری)'
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="نام"
                        />

                        <Input
                            id="lastName"
                            label='نام خانوادگی (اختیاری)'
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="نام خانوادگی"
                        />

                        <Input
                            id="jobTitle"
                            label='عنوان شغلی (اختیاری)'
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder="مثلاً کارشناس مالی"
                        />
                        <p className="-mt-2 text-xs text-slate-400">کد پرسنلی خودکار ساخته می‌شود و بعداً قابل ویرایش است.</p>

                        <div className="flex gap-4 pt-4">
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={isLoading || !phone}
                            >
                                {isLoading ? "در حال ارسال..." : "افزودن"}
                            </Button>
                            <Button
                                type="button"
                                variant='ghost'
                                className="flex-1"
                                onClick={() => setIsOpen(false)}
                            >
                                لغو
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>

            <ResultModal
                isOpen={isResultModalOpen}
                onClose={handleCloseResultModal}
                status={error ? 'error' : 'success'}
                title="افزودن کاربر"
                successMessage="کاربر با موفقیت به افزوده شد"
                errorMessage={error?.message || "خطا در افزودن کاربر"}
            />
        </>
    );
}
