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
            className={`w-full max-w-lg rounded-3xl border border-[#ded7ca] bg-white/80 p-8  ${className}`}
        >
            <header className="mb-6 space-y-2 ">
                <h1 className="text-2xl font-semibold uppercase tracking-normal text-[#1a1a1d]">
                    {title}
                </h1>
                {description ? <p className="m-0 p-0 text-sm text-[#4c4c55]">{description}</p> : null}
            </header>
            <hr />
            <div className={`space-y-4 mt-6 ${bodyClassName}`}>{children}</div>
        </div>
    );
}

