import { cn } from "@/libs/style/style.util.helpers";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { IconArrowDown } from "@tabler/icons-react";
import { ReactNode } from "react";

export interface DropdownItem<T> {
    label: string;
    value: T | null;
    disabled?: boolean;
}

interface DropdownProps<T> {
    items: DropdownItem<T>[];
    value?: T | null;
    getKey?: (item: T | null, index: number) => string | number;
    onChange: (value: T | null) => void | Promise<void>;
    placeholder?: string;
    variant?: "primary" | "secondary" | "outline";
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    className?: string;
    buttonClassName?: string;
    itemsClassName?: string;
    error?: string;
    renderButton?: (buttonLabel: string, isDisabled: boolean) => ReactNode;
}

export function Dropdown<T>({
    items,
    value,
    onChange,
    getKey,
    placeholder = "Select an option",
    variant = "primary",
    size = "md",
    disabled = false,
    className,
    buttonClassName,
    itemsClassName,
    error,
    renderButton,
}: DropdownProps<T>) {
    // Find the currently selected item's label
    const selectedItem = items.find((item) => item.value === value);
    const buttonLabel = selectedItem ? selectedItem.label : placeholder;

    return (
        <div className="w-full">
            <Menu as="div" className={cn("relative inline-block text-left w-full", className)}>
                <div>
                    {renderButton ? (
                        <MenuButton as="div" disabled={disabled}>
                            {renderButton(buttonLabel, disabled)}
                        </MenuButton>
                    ) : (
                        <MenuButton
                            className={cn(
                                "inline-flex w-full text-slate-700 items-center justify-between rounded-xl font-medium transition-colors",
                                {
                                    "bg-rose-500 text-white hover:bg-rose-500/90": variant === "primary",
                                    "bg-slate-500 text-primary hover:bg-slate-500/90": variant === "secondary",
                                    "border border-input bg-transparent hover:bg-accent": variant === "outline",
                                    "border-rose-500 bg-rose-50": error,
                                    "px-3 py-1.5 lg:px-3.5 lg:py-1.5": size === "sm",
                                    "px-4 py-2 lg:px-6 lg:py-2": size === "md",
                                    "px-5 py-2.5 lg:px-8 lg:py-3": size === "lg",
                                    "opacity-50 cursor-not-allowed": disabled,
                                },
                                buttonClassName
                            )}
                            disabled={disabled}
                        >
                            {buttonLabel}
                            <IconArrowDown className="mr-2 -ml-1 h-5 w-5" aria-hidden="true" />
                        </MenuButton>
                    )}
                </div>
                {/* Anchored, so the menu is portalled and positioned against the
                    button: a modal's scrolling body would otherwise clip it. */}
                <MenuItems
                    anchor="bottom"
                    transition
                    className={cn(
                        "z-[60] w-[var(--button-width)] max-h-72 overflow-y-auto [--anchor-gap:8px] rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
                        "origin-top transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0",
                        itemsClassName
                    )}
                >
                    <div className="py-1">
                        {items.map((item, index) => (
                            <MenuItem key={getKey?.(item.value, index) ?? item.label} >
                                {({ focus }) => (
                                    <button
                                        type="button"
                                        className={cn(
                                            focus ? "bg-slate-100 text-slate-900" : "text-slate-700",
                                            item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                                            "block w-full px-4 py-2 text-right text-sm"
                                        )}
                                        onClick={() => onChange(item.value)}
                                        disabled={item.disabled}
                                    >
                                        {item.label}
                                    </button>
                                )}
                            </MenuItem>
                        ))}
                    </div>
                </MenuItems>
            </Menu>
            {error && <p className="text-rose-500 text-xs mt-1">{error}</p>}
        </div>
    );
}
