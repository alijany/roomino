"use client";

import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Fragment, type ReactNode } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    hasBackdrop?: boolean;
    children: ReactNode;
    className?: string;
    fullScreen?: boolean;
}

export function Modal({ isOpen, onClose, children, className = '', fullScreen = false, hasBackdrop = true }: ModalProps) {
    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog onClose={onClose} className="relative z-50">
                {hasBackdrop && <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 backdrop-blur bg-black/30" />
                </TransitionChild>}

                <div className="fixed inset-0">
                    <div className={`flex min-h-full justify-center p-0 ${fullScreen ? '' : 'lg:p-4 items-end lg:items-center'}`}>
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom={fullScreen ? "opacity-0" : "translate-y-full lg:translate-y-0 lg:scale-95 lg:opacity-0"}
                            enterTo={fullScreen ? "opacity-100" : "translate-y-0 lg:scale-100 lg:opacity-100"}
                            leave="ease-in duration-200"
                            leaveFrom={fullScreen ? "opacity-100" : "translate-y-0 lg:scale-100 lg:opacity-100"}
                            leaveTo={fullScreen ? "opacity-0" : "translate-y-full lg:translate-y-0 lg:scale-95 lg:opacity-0"}
                        >
                            {/* A flex column so panel content can split into a fixed
                                header, a scrolling body and a footer that stays visible
                                however short the viewport is. */}
                            <DialogPanel className={`w-full transform transition-all flex flex-col
                                    ${fullScreen ? 'h-screen' : 'lg:w-auto lg:max-w-2xl lg:rounded-2xl max-h-[calc(100dvh-2rem)] lg:max-h-[calc(100dvh-8rem)]'}
                                    bg-slate-50 shadow-xl shadow-black/5
                                    overflow-hidden
                                    ${className}`}>
                                {children}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
