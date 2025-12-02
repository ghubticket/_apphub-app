'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MouseEvent, useCallback } from 'react';
import { HiOutlineShieldCheck } from 'react-icons/hi2';
import Container from '@/components/shared/Container';
import { useCheckoutNavigation } from '@/app/checkout/hooks/useCheckoutNavigation';
import { APP_LOGO, APP_LOGO_ALT } from '@/lib/config';

export default function CheckoutHeader() {
    const navigation = useCheckoutNavigation();

    const handleLogoClick = useCallback(
        (event: MouseEvent<HTMLAnchorElement>) => {
            // Impedir navegação padrão para usar a navegação centralizada
            event.preventDefault();
            // Usa navigateToHome, que já limpa pedido, carrinho e flags de navegação
            navigation.navigateToHome();
        },
        [navigation]
    );

    return (
        <header className="bg-[#ffffff]">
            <Container className="flex items-center justify-between py-3 md:py-5">
                <Link href="/" className="flex items-center gap-3" onClick={handleLogoClick}>
                    <Image
                        src={APP_LOGO}
                        alt={APP_LOGO_ALT}
                        width={120}
                        height={48}
                        className="h-6 w-auto"
                        priority
                    />
                </Link>

                <div className="flex items-center gap-2 rounded-full border border-[#ded7ca] bg-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-normal text-[#fff] shadow-[0_10px_25px_-18px_rgba(20,20,32,0.35)]">
                    <HiOutlineShieldCheck className="text-base text-white" />
                    Ambiente seguro
                </div>
            </Container>
        </header>
    );
}

