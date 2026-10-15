import { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import { cn } from "@/libs/style/style.util.helpers";

type InputBaseProps = {
  icon?: ReactNode;
  id?: string;
  error?: string;
  label?: string;
  labelRight?: ReactNode; // Added prop for text next to label
  packageId?: string;
  className?: string;
  containerClassName?: string;
  variant?: 'light' | 'dark';
};

type TextareaInputProps = InputBaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & {
  textarea: true;
};

type StandardInputProps = InputBaseProps & InputHTMLAttributes<HTMLInputElement> & {
  textarea?: false;
};

type InputProps = TextareaInputProps | StandardInputProps;

export function Input({ className, icon, error, label, labelRight, packageId, textarea, variant = 'light', containerClassName, ...props }: InputProps) {
  const isDark = variant === 'dark';
  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <label htmlFor={packageId ?? label} className={cn("mb-1.5 flex items-center gap-2 text-sm font-medium", isDark ? "text-neutral-50" : "text-slate-700")}>
          <span>{label}</span>
          {labelRight && (
            <span>{labelRight}</span>
          )}
        </label>
      )}
      <div className={cn(
        "flex items-center gap-2 rounded-xl border px-3.5 transition-[border-color,box-shadow] duration-150 focus-within:ring-4 motion-reduce:transition-none",
        textarea ? "py-1" : "min-h-11 lg:min-h-10",
        isDark
          ? "border-neutral-50 focus-within:border-neutral-100 focus-within:ring-white/20"
          : cn("bg-white shadow-card", error ? "border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-100" : "border-slate-200 hover:border-slate-300 focus-within:border-brand-500 focus-within:ring-brand-100")
      )}>
        {icon && (
          <span className="flex items-center justify-center" aria-hidden="true">
            {icon}
          </span>
        )}
        {textarea ? (
          <textarea
            className={cn(
              "text-sm w-full py-2 bg-transparent outline-none placeholder:text-slate-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none",
              isDark ? "text-white placeholder:text-slate-100" : "text-slate-700",
              className
            )}
            id={packageId ?? label}
            {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            className={cn(
              "text-sm w-full py-2 bg-transparent outline-none placeholder:text-slate-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              isDark ? "text-white placeholder:text-slate-100" : "text-slate-700",
              className
            )}
            id={packageId ?? label}
            {...(props as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-600" role="alert">{error}</p>}
    </div>
  );
}