"use client";

import { cn } from '@/libs/style/style.util.helpers';
import React, { forwardRef } from 'react';

export type ToggleSwitchProps = {
    id?: string;
    name?: string;
    label?: string;
    labelClass?: string;
    className?: string;
    checked?: boolean; // controlled prop
    value?: boolean; // backwards compatibility
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    size?: 'sm' | 'md';
    labelPosition?: 'left' | 'right';
    'aria-label'?: string;
    onColor?: string;
    offColor?: string;
    knobOnLeftWhenChecked?: boolean;
};

export const ToggleSwitch = forwardRef<HTMLButtonElement, ToggleSwitchProps>(
    (
        {
            id,
            name,
            label,
            labelClass,
            className,
            checked,
            value,
            onChange,
            disabled = false,
            onColor = 'bg-slate-600',
            offColor = 'bg-slate-300',
            size = 'md',
            labelPosition = 'left',
            'aria-label': ariaLabel,
            knobOnLeftWhenChecked = false,
        },
        ref,
    ) => {
        const isChecked = checked ?? value ?? false;

        const handleToggle = () => {
            if (disabled) return;
            const newState = !isChecked;
            if (onChange) onChange(newState);
        };

        const sizeMap = {
            sm: {
                container: 'h-5 w-9',
                dotTranslateOn: 'translate-x-4',
                dotTranslateOff: 'translate-x-1',
                dotSize: 'h-3 w-3',
            },
            md: {
                container: 'h-6 w-11',
                dotTranslateOn: 'translate-x-6',
                dotTranslateOff: 'translate-x-1',
                dotSize: 'h-4 w-4',
            },
        } as const;

        const sizeConfig = sizeMap[size];

        // Optionally invert knob positions so that checked => left instead of right
        const dotTranslateOn = knobOnLeftWhenChecked ? sizeConfig.dotTranslateOff : sizeConfig.dotTranslateOn;
        const dotTranslateOff = knobOnLeftWhenChecked ? sizeConfig.dotTranslateOn : sizeConfig.dotTranslateOff;

        return (
            <div
                id={id}
                className={cn(
                    'flex items-center gap-2',
                    labelPosition === 'right' ? 'flex-row' : 'flex-row-reverse',
                    className,
                )}
            >
                {label && (
                    <span className={cn('font-medium text-slate-700 select-none', disabled && 'text-slate-400', labelClass)}>
                        {label}
                    </span>
                )}

                <button
                    ref={ref}
                    type="button"
                    name={name}
                    dir="ltr"
                    role="switch"
                    aria-checked={isChecked}
                    aria-label={ariaLabel || label}
                    onClick={handleToggle}
                    disabled={disabled}
                    className={cn(
                        isChecked ? onColor : offColor,
                        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                        'relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50',
                        sizeConfig.container,
                    )}
                >
                    <span className="sr-only">Toggle</span>
                    <span
                            className={cn(
                                isChecked ? dotTranslateOn : dotTranslateOff,
                            'inline-block transform rounded-full bg-white transition-transform',
                            sizeConfig.dotSize,
                        )}
                    />
                </button>
            </div>
        );
    },
);

ToggleSwitch.displayName = 'ToggleSwitch';
