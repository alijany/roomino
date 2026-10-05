"use client";

import { brand } from "@/config/brand.config";
import { Button } from "@/ui/atoms";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { IconMenu4, IconX } from "@tabler/icons-react";
import Link from "next/link";
import React, { Fragment } from "react";
import { MenuItems } from "./dashboard.component.menu-items";
import { NotificationDropdown } from "./dashboard.component.notification-dropdown";



export const Navbar = () => {

    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="flex items-center justify-between gap-4">
            <Button onClick={() => { setIsOpen(true) }} variant="secondary" className="!px-2 lg:hidden" aria-label="باز کردن منوی پیشخوان">
                <IconMenu4 size={20} />
            </Button>

            <Link href='/' className="flex items-center gap-1.5">
                <img src="/images/logo.svg" alt="Logo" className="h-7 lg:h-8" />
                <h1 className="text-base font-bold text-slate-900">{brand.name}</h1>
            </Link>

            <div className="flex items-center gap-3">
                <NotificationDropdown />
            </div>


            <Transition show={isOpen} as={Fragment}>
                <Dialog onClose={() => setIsOpen(false)} className="relative z-50">
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 backdrop-blur bg-black/30" />
                    </TransitionChild>

                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="translate-x-full"
                        enterTo="translate-x-0"
                        leave="ease-in duration-200"
                        leaveFrom="translate-x-0"
                        leaveTo="translate-x-full"
                    >
                        <DialogPanel className="fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white shadow-xl p-4 h-dvh flex flex-col">
                            <div className="flex shrink-0 justify-between items-center mb-5">
                                <div className="flex items-center space-x-reverse space-x-2">
                                    <img src="/images/logo.svg" alt="Logo" className="h-5" />
                                    <h1 className="text-xl font-bold">{brand.name}</h1>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className='p-2'
                                    onClick={() => setIsOpen(false)}
                                    aria-label="بستن منوی پیشخوان"
                                >
                                    <IconX className="size-4" />
                                </Button>
                            </div>

                            <MenuItems
                                className="flex min-h-0 flex-col gap-4 grow overflow-hidden"
                                onClose={() => setIsOpen(false)}
                            />
                        </DialogPanel>
                    </TransitionChild>
                </Dialog>
            </Transition>
        </div>
    )
}
