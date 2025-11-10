'use client';

import Link from 'next/link';
import Image from 'next/image';
import { HiOutlineShieldCheck } from 'react-icons/hi2';
import Container from '@/components/shared/Container';

export default function CheckoutHeader() {
    return (
        <header className="bg-[#f5f1e8]">
            <Container className="flex items-center justify-between py-6">
                <Link href="/" className="flex items-center gap-3">
                    <Image
                        src="/images/5521.avif"
                        alt="Logotipo 5521"
                        width={120}
                        height={48}
                        className="h-10 w-auto"
                        priority
                    />
                </Link>

                <div className="flex items-center gap-2 rounded-full border border-[#ded7ca] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#4c4c55] shadow-[0_10px_25px_-18px_rgba(20,20,32,0.35)]">
                    <HiOutlineShieldCheck className="text-base text-emerald-500" />
                    Ambiente seguro
                </div>
            </Container>
        </header>
    );
}


