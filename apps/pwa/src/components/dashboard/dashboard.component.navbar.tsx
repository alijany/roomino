"use client";

import { brand } from "@/config/brand.config";
import { Button } from "@/ui/atoms";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { IconMenu4, IconX } from "@tabler/icons-react";
import Link from "next/link";
import React, { Fragment } from "react";
import { SupportModal } from "../modals/modals.component.support";
import { MenuItems } from "./dashboard.component.menu-items";
import { NotificationDropdown } from "./dashboard.component.notification-dropdown";



export const Navbar = () => {

    const [isOpen, setIsOpen] = React.useState(false);

    const [supportModalOpen, setSupportModalOpen] = React.useState(false);

    const openSupportModal = () => {
        setSupportModalOpen(true);
    };

    const closeSupportModal = () => {
        setSupportModalOpen(false);
    };


    return (
        <div className="flex items-center justify-between gap-4">
            <Button onClick={() => { setIsOpen(true) }} variant="secondary" className="!px-2 lg:hidden">
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
                        <DialogPanel className="fixed inset-y-0 right-0 w-[80%] max-w-sm bg-white shadow-xl p-6 h-screen flex flex-col">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center space-x-reverse space-x-2">
                                    <img src="/images/logo.svg" alt="Logo" className="h-5" />
                                    <h1 className="text-xl font-bold">{brand.name}</h1>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className='p-2'
                                    onClick={() => setIsOpen(false)}
                                >
                                    <IconX className="size-4" />
                                </Button>
                            </div>

                            <MenuItems
                                className="flex flex-col space-y-4 grow overflow-hidden lg:overflow-auto"
                                itemClassName="text-slate-600 hover:text-slate-800 text-lg"
                                onClose={() => setIsOpen(false)}
                            />
                        </DialogPanel>
                    </TransitionChild>
                </Dialog>
            </Transition>
        </div>
    )
}