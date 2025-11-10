'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import CheckoutHeader from './CheckoutHeader';

const NO_CHROME_ROUTES = ['/checkout'];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const isCheckoutRoute = useMemo(() => {
        if (!pathname) return false;
        return NO_CHROME_ROUTES.some((route) => pathname.startsWith(route));
    }, [pathname]);

    return (
        <>
            {isCheckoutRoute ? <CheckoutHeader /> : <Header />}
            {children}
            {!isCheckoutRoute ? <Footer /> : null}
        </>
    );
}


