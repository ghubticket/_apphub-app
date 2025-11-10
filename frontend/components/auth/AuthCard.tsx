import { ReactNode } from 'react';

interface AuthCardProps {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
    bodyClassName?: string;
}

export default function AuthCard({ title, description, children, className = '', bodyClassName = '' }: AuthCardProps) {
    return (
        <div
            className={`w-full max-w-lg rounded-3xl border border-black/5 bg-[#f8f6f2] p-8 shadow-[0_35px_60px_-15px_rgba(15,15,45,0.45)] ${className}`}
        >
            <header className="mb-6 space-y-2 text-center">
                <h1 className="text-2xl font-semibold uppercase tracking-[0.35em] text-[#1a1a1d]">
                    {title}
                </h1>
                {description ? <p className="m-0 p-0 text-sm text-[#4c4c55]">{description}</p> : null}
            </header>
            <div className={`space-y-4 ${bodyClassName}`}>{children}</div>
        </div>
    );
}

