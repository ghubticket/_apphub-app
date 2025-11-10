import Image from 'next/image';
import Link from 'next/link';
import { FaInstagram, FaYoutube, FaSpotify } from 'react-icons/fa';
import Container from '@/components/shared/Container';
import styles from './Footer.module.scss';

const marqueeLocations = [
    { city: 'Rio de Janeiro', state: 'RJ' },
    { city: 'Praia do Rosa', state: 'SC' },
    { city: 'Lisboa', state: 'Portugal' },
    { city: 'Porto Alegre', state: 'RS' },
    { city: 'Maracaípe', state: 'PE' },
    { city: 'Fernando de Noronha', state: 'PE' },
    { city: 'Jericoacoara', state: 'CE' },
    { city: 'Itaipava', state: 'RJ' },
    { city: 'São Miguel do Gostoso', state: 'RN' },
];

const institutionalLinks = [
    { label: '5521', href: '/5521' },
    { label: 'Banda', href: '/banda' },
    { label: 'DJ Crias', href: '/dj-crias' },
    { label: 'Agenda', href: '/agenda' },
    { label: 'Fotos', href: '/fotos' },
    { label: 'Vídeos', href: '/videos' },
];

const supportLinks = [
    { label: 'Política de Privacidade', href: '/privacidade' },
    { label: 'Termos de Uso', href: '/termos' },
];

const socialLinks = [
    { label: 'Instagram', href: 'https://instagram.com', icon: FaInstagram },
    { label: 'YouTube', href: 'https://youtube.com', icon: FaYoutube },
    { label: 'Spotify', href: 'https://spotify.com', icon: FaSpotify },
];

const storeLink = { label: 'Loja', href: '/loja' };

export default function Footer() {
    const leftColumn = institutionalLinks.slice(0, 3);
    const rightColumn = institutionalLinks.slice(3);

    return (
        <footer className={`${styles.footerBackground} relative overflow-hidden text-white`}>
            <div className="overflow-hidden bg-[#1a1a1d] py-4" aria-hidden="true">
                <div
                    className={`${styles.marquee} flex gap-10 text-xs font-semibold uppercase tracking-[0.35em] text-white md:text-sm`}
                >
                    {[...marqueeLocations, ...marqueeLocations].map((place, index) => (
                        <span
                            key={`${place.city}-${index}`}
                            className={`${styles.marqueeItem} flex items-center gap-4`}
                        >
                            <span className="font-black text-[#f97316]">5521</span>
                            <span className="tracking-[0.25em] text-white/90">
                                {place.city} | {place.state}
                            </span>
                        </span>
                    ))}
                </div>
            </div>

            <div className="py-16 md:py-20 lg:py-24">
                <Container className="flex flex-col items-center gap-12 lg:flex-row lg:justify-between lg:gap-12">
                    <div className="space-y-8 lg:max-w-sm text-center">
                        <div>
                            <Image
                                src="/images/5521.avif"
                                alt="Logomarca 5521"
                                width={250}
                                height={80}
                                className="mx-auto h-16 w-auto"
                                priority
                            />
                            <h3 className="mt-5 text-xl font-semibold uppercase text-white">
                                Institucional
                            </h3>
                            <div className="mt-4 flex items-center justify-center flex-wrap text-[0.9rem] text-white/80">
                                <ul className="flex items-center justify-center min-w-[120px] flex-col space-y-0.5">
                                    {leftColumn.map((item) => (
                                        <li key={item.label}>
                                            <Link
                                                href={item.href}
                                                className="uppercase tracking-[0.1em] transition-colors hover:text-white"
                                            >
                                                {item.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                <ul className="flex min-w-[120px] flex-col space-y-0.5">
                                    {rightColumn.map((item) => (
                                        <li key={item.label}>
                                            <Link
                                                href={item.href}
                                                className="uppercase tracking-[0.1em] transition-colors hover:text-white"
                                            >
                                                {item.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-3">
                            {socialLinks.map((social) => {
                                const Icon = social.icon;
                                return (
                                    <Link
                                        key={social.label}
                                        href={social.href}
                                        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-white/70 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
                                        aria-label={social.label}
                                    >
                                        <Icon />
                                    </Link>
                                );
                            })}

                        </div>
                    </div>

                    <div className="space-y-6 lg:max-w-md lg:text-center">
                        <h1 className="text-4xl font-black tracking-[0.35em] text-orange-400">5521</h1>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-bold uppercase leading-tight sm:text-4xl">
                                A mais<br />
                                Carioca do Mundo
                            </h2>
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-[0.4em] text-white">
                                    Vem com a gente
                                </span>
                                <p className="mt-4 text-sm text-white/70">
                                    Eventos, casamentos, formaturas e confraternizações.
                                </p>
                            </div>
                            <Link
                                href="mailto:comercial@somos5521.com"
                                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-xs font-semibold uppercase  text-black transition hover:bg-orange-100"
                            >
                                comercial@somos5521.com
                            </Link>
                        </div>
                    </div>

                    <div className="space-y-6 lg:max-w-sm lg:text-right">
                        <div className="space-y-4 pt-15 lg:items-end lg:text-right">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
                                Suporte
                            </h3>
                            <ul className="space-y-3 text-sm text-white/70 lg:inline-flex lg:flex-col lg:items-end lg:[&>li>a]:inline-block">
                                {supportLinks.map((item) => (
                                    <li key={item.label}>
                                        <Link
                                            href={item.href}
                                            className="relative inline-block transition-colors hover:text-white"
                                        >
                                            <span className="after:absolute after:left-0 after:bottom-[-0.2rem] after:h-[2px] after:w-0 after:bg-orange-400 after:transition-all hover:after:w-full">
                                                {item.label}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <hr />

                        <div className="lg:items-end pt-2 lg:text-right">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
                                Newsletter
                            </h3>
                            <p className="text-sm text-white/70 py-3">
                                Receba line-ups em primeira mão <br /> pré-venda exclusiva e conteúdos especiais.
                            </p>
                            <form className="flex w-full my-3 max-w-md items-center rounded-md border border-white/20 bg-white/5 pl-4 pr-1">
                                <input
                                    className="flex-1 bg-transparent py-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                                    type="email"
                                    placeholder="Seu e-mail"
                                    aria-label="E-mail para newsletter"
                                />
                                <button
                                    type="submit"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-orange-500 text-sm font-semibold text-[#1c1c24] transition hover:bg-orange-400"
                                >
                                    OK
                                </button>
                            </form>
                            <p className="text-xs text-white/50">
                                Ao assinar, você concorda com nossa política de privacidade.
                            </p>
                        </div>
                    </div>
                </Container>
            </div>

            <div className="border-t border-white/10 bg-black/30 py-6">
                <Container className="flex flex-col gap-4 text-xs text-white/60 md:flex-row md:items-center md:justify-between">
                    <span>© {new Date().getFullYear()} 5521 © Todos os direitos reservados | CNPJ 45.380.558/0001-88</span>
                    <div className="flex flex-wrap gap-4">
                        {socialLinks.map((social) => (
                            <Link
                                key={social.label}
                                href={social.href}
                                className="text-[0.65rem] uppercase tracking-[0.5em] text-white/50 transition hover:text-orange-400"
                                aria-label={social.label}
                            >
                                {social.label}
                            </Link>
                        ))}
                    </div>
                </Container>
            </div>
        </footer>
    );
}

