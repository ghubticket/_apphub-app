import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';

type InputVariant = 'default' | 'password';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    hint?: string;
    error?: string;
    startIcon?: ReactNode;
    endIcon?: ReactNode;
    variant?: InputVariant;
}

const baseInputClasses =
    // Importante: fonte base 16px no mobile para evitar zoom automático em iOS
    'w-full rounded-xl border border-[#d7d2c8] bg-white px-4 py-3 text-base md:text-sm text-[#1f1d2b] placeholder:text-[#9894a5] shadow-[inset_0_1px_3px_rgba(18,18,36,0.08)] transition focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 disabled:cursor-not-allowed disabled:opacity-70';

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
    { label, hint, error, startIcon, endIcon, className = '', variant = 'default', ...props },
    ref
) {
    const id = useId();
    const describedById = hint || error ? `${id}-description` : undefined;
    const hasStartIcon = Boolean(startIcon);
    const hasEndIcon = Boolean(endIcon);

    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-xs font-semibold uppercase text-[#555068]">
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
                    aria-describedby={describedById}
                    aria-invalid={Boolean(error)}
                    className={`${baseInputClasses} ${hasStartIcon ? 'pl-11' : ''} ${
                        hasEndIcon ? 'pr-12' : ''
                    } ${className}`}
                    {...props}
                />
                {hasEndIcon ? (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8d879a]">{endIcon}</span>
                ) : null}
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

export default InputField;

