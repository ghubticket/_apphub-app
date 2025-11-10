'use client';

import { forwardRef, InputHTMLAttributes, ReactNode, useId, useState } from 'react';
import { HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';

const baseInputClasses =
    'w-full rounded-xl border border-[#d7d2c8] bg-white px-4 py-3 text-sm text-[#1f1d2b] placeholder:text-[#9894a5] shadow-[inset_0_1px_3px_rgba(18,18,36,0.08)] transition focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 disabled:cursor-not-allowed disabled:opacity-70';

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    hint?: string;
    error?: string;
    startIcon?: ReactNode;
}

const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
    { label, hint, error, startIcon, className = '', ...props },
    ref
) {
    const id = useId();
    const describedById = hint || error ? `${id}-description` : undefined;
    const [isVisible, setIsVisible] = useState(false);
    const hasStartIcon = Boolean(startIcon);

    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-[0.35em] text-[#555068]">
                {label}
            </label>
            <div className="relative">
                {hasStartIcon ? (
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#f97316]">
                        {startIcon}
                    </span>
                ) : null}
                <input
                    id={id}
                    ref={ref}
                    type={isVisible ? 'text' : 'password'}
                    aria-describedby={describedById}
                    aria-invalid={Boolean(error)}
                    className={`${baseInputClasses} pr-12 ${hasStartIcon ? 'pl-11' : ''} ${className}`}
                    {...props}
                />
                <button
                    type="button"
                    onClick={() => setIsVisible((prev) => !prev)}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#f3f0ea] text-[#6e6a7a] transition hover:bg-[#f97316]/10 hover:text-[#f97316]"
                    aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
                >
                    {isVisible ? <HiOutlineEyeSlash /> : <HiOutlineEye />}
                </button>
            </div>
            {(hint || error) && (
                <p
                    id={describedById}
                    className={`text-xs ${error ? 'text-[#d24c4c]' : 'text-[#7a7588]'}`}
                >
                    {error || hint}
                </p>
            )}
        </div>
    );
});

export default PasswordField;

