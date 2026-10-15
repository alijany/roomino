import { cn } from "@/libs/style/style.util.helpers";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { IconChevronDown } from "@tabler/icons-react";
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
                                "group inline-flex w-full items-center justify-between gap-2 rounded-xl text-sm font-medium text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100",
                                {
                                    "bg-rose-500 text-white hover:bg-rose-500/90": variant === "primary",
                                    "bg-slate-500 text-primary hover:bg-slate-500/90": variant === "secondary",
                                    "border border-slate-200 bg-white shadow-card hover:border-slate-300 data-[open]:border-brand-500 data-[open]:ring-4 data-[open]:ring-brand-100": variant === "outline",
                                    "border-rose-500 bg-rose-50": error,
                                    "min-h-10 px-3 lg:min-h-9": size === "sm",
                                    "min-h-11 px-3.5 lg:min-h-10": size === "md",
                                    "min-h-12 px-4": size === "lg",
                                    "opacity-50 cursor-not-allowed": disabled,
                                },
                                buttonClassName
                            )}
                            disabled={disabled}
                        >
                            {buttonLabel}
                            <IconChevronDown className="size-4 shrink-0 text-slate-400 transition-transform group-data-[open]:rotate-180" aria-hidden="true" />
                        </MenuButton>
                    )}
                </div>
                {/* Anchored, so the menu is portalled and positioned against the
                    button: a modal's scrolling body would otherwise clip it. */}
                <MenuItems
                    anchor="bottom"
                    transition
                    className={cn(
                        "z-[60] w-[var(--button-width)] min-w-40 max-h-72 overflow-y-auto [--anchor-gap:6px] rounded-xl border border-slate-200/80 bg-white p-1 shadow-pop focus:outline-none",
                        "origin-top transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0",
                        itemsClassName
                    )}
                >
                    <div className="space-y-0.5">
                        {items.map((item, index) => (
                            <MenuItem key={getKey?.(item.value, index) ?? item.label} >
                                {({ focus }) => (
                                    <button
                                        type="button"
                                        className={cn(
                                            focus ? "bg-slate-100 text-slate-900" : "text-slate-700",
                                            item.value === value && "font-semibold text-brand-700",
                                            item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                                            "block min-h-10 w-full rounded-lg px-3 py-2 text-right text-sm"
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
