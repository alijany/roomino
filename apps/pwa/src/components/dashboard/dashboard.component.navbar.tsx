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
        <header className="sticky top-0 z-30 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 bg-white/85 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md supports-[backdrop-filter]:bg-white/70 lg:min-h-16 lg:border-b-0 lg:bg-transparent lg:px-6 lg:backdrop-blur-none">
            <Button onClick={() => { setIsOpen(true) }} variant="ghost" className="!min-h-10 !px-2.5 lg:hidden" aria-label="باز کردن منوی پیشخوان">
                <IconMenu4 size={22} />
            </Button>

            {/* The brand lives in the sidebar on desktop. */}
            <Link href='/dashboard' className="flex items-center gap-1.5 rounded-lg lg:hidden">
                <img src="/images/logo.svg" alt="" className="h-7" />
                <span className="text-base font-bold text-slate-900">{brand.name}</span>
            </Link>

            <div className="flex items-center gap-2 lg:mr-auto">
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
                        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
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
                        <DialogPanel className="fixed inset-y-0 right-0 flex h-dvh w-[85%] max-w-sm flex-col bg-white p-4 pb-safe pt-[max(1rem,env(safe-area-inset-top))] shadow-pop">
                            <div className="flex shrink-0 justify-between items-center mb-5">
                                <div className="flex items-center space-x-reverse space-x-2">
                                    <img src="/images/logo.svg" alt="" className="h-6" />
                                    <span className="text-lg font-bold text-slate-900">{brand.name}</span>
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
        </header>
    )
}
