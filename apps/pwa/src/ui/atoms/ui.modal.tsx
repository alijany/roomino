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
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
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
                            <DialogPanel className={`w-full transform transition-all flex flex-col motion-reduce:transition-none
                                    ${fullScreen ? 'h-screen' : 'rounded-t-3xl pb-[env(safe-area-inset-bottom)] lg:w-auto lg:max-w-2xl lg:rounded-2xl lg:pb-0 max-h-[calc(100dvh-1.5rem)] lg:max-h-[calc(100dvh-8rem)]'}
                                    bg-slate-50 shadow-pop ring-1 ring-slate-900/5
                                    overflow-hidden
                                    ${className}`}>
                                {/* Grab handle: on a phone this is a bottom sheet. */}
                                {!fullScreen && (
                                    <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-300 lg:hidden" />
                                )}
                                {children}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
