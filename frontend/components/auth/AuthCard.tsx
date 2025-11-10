import { ReactNode } from 'react';

interface AuthCardProps {
    title: string;
    description?: string;
    children: ReactNode;
}

export default function AuthCard({ title, description, children }: AuthCardProps) {
    return (
        <div className="w-full max-w-lg rounded-3xl border border-black/5 bg-[#f8f6f2] p-8 shadow-[0_35px_60px_-15px_rgba(15,15,45,0.45)]">
            <header className="mb-6 space-y-2 text-center">
                <h1 className="text-2xl font-semibold uppercase tracking-[0.35em] text-[#1a1a1d]">
                    {title}
                </h1>
                {description ? (
                    <p className="text-sm p-0 m-0 text-[#4c4c55]">{description}</p>
                ) : null}
            </header>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

