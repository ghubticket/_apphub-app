'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaInstagram, FaYoutube, FaSpotify } from 'react-icons/fa';
import Container from '@/components/shared/Container';
import api from '@/lib/api';
import styles from './Footer.module.scss';
import { APP_NAME, APP_LOGO, APP_LOGO_ALT, APP_CONFIG } from '@/lib/config';

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
    { label: APP_NAME, href: '/5521' },
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

export default function Footer() {
    const leftColumn = institutionalLinks.slice(0, 3);
    const rightColumn = institutionalLinks.slice(3);
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleNewsletterSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setFeedback({ type: 'error', message: 'Informe um e-mail válido.' });
            return;
        }

        setIsSubmitting(true);
        setFeedback(null);

        try {
            const response = await api.post('/novidades', {
                email: trimmedEmail,
                source: 'footer',
            });

            const alreadyRegistered = Boolean(response.data?.data?.alreadyRegistered);

            setFeedback({
                type: 'success',
                message: alreadyRegistered
                    ? 'Você já está inscrito nas novidades! ✨'
                    : 'Inscrição realizada com sucesso! 🎉',
            });

            if (!alreadyRegistered) {
                setEmail('');
            }
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                'Não foi possível concluir sua inscrição. Tente novamente em instantes.';

            setFeedback({
                type: 'error',
                message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

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
                            <span className="tracking-normal font-black text-[#f97316]">{APP_NAME}</span>
                            <span className="tracking-normal text-white/90">
                                {place.city} | {place.state}
                            </span>
                        </span>
                    ))}
                </div>
            </div>

            <div className="py-10 md:py-20 lg:py-15">
                <Container className="flex flex-col gap-12 items-center lg:flex-row lg:justify-between lg:gap-16">
                    <div className="hidden w-full space-y-8 text-left lg:max-w-sm lg:text-center ">
                        <div className='w-full'>
                            <Image
                                src={APP_LOGO}
                                alt={APP_LOGO_ALT}
                                width={250}
                                height={80}
                                className=""
                                priority
                            />
                            <h3 className="mt-5 text-xl font-semibold uppercase text-white lg:text-center">
                                Institucional
                            </h3>
                            <div className="mt-4 flex flex-wrap items-start justify-start text-[0.9rem] text-white/80 lg:justify-center">
                                <ul className="flex min-w-[120px] flex-col items-start justify-start space-y-0.5 lg:items-center">
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
                                <ul className="flex min-w-[120px] flex-col items-start space-y-0.5 lg:items-center">
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

                        <div className="w-full flex flex-wrap items-center justify-start gap-3 lg:justify-center">
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

                    <div className="w-full space-y-6 lg:max-w-md">
                        <div className="space-y-4">

                            <img className='w-40' src='/images/pagode-do-principe-branco.png' alt='Festa do Branco' />
                            
                            <h2 className="text-2xl  font-bold uppercase leading-tight sm:text-3xl">
                                Festa do Branco com Suel, Bruno Diegues, BG e Davi Quaresma
                            </h2>
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-normal text-[#f97316]">
                                    Vem com a gente no dia 23 de Dezembro
                                </span>
                              
                            </div>
                            <Link
                                href="mailto:falecom@oprincipe.com.br"
                                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-xs font-semibold uppercase  text-black transition hover:bg-orange-100"
                            >
                                falecom@oprincipe.com.br
                            </Link>
                        </div>
                    </div>

                    <div className="w-full space-y-6 lg:max-w-sm lg:text-right">
                        <div className="md:space-y-4 lg:items-end lg:text-right">
                            <h3 className="text-sm pb-3 md:pb-0 font-semibold uppercase tracking-[0.3em] text-white">
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

                        <div className="pt-2 lg:items-end lg:text-right">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">
                                Newsletter
                            </h3>
                            <p className="text-sm text-white/70 py-3">
                                Receba line-ups em primeira mão <br /> pré-venda exclusiva e conteúdos especiais.
                            </p>
                            <form
                                onSubmit={handleNewsletterSubmit}
                                className="flex w-full my-3 max-w-md items-center rounded-md border border-white/20 bg-white/5 pl-4 pr-1"
                            >
                                <input
                                    className="flex-1 bg-transparent py-3 text-base md:text-sm text-white placeholder:text-white/40 focus:outline-none"
                                    type="email"
                                    placeholder="Seu e-mail"
                                    aria-label="E-mail para newsletter"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="submit"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-orange-500 text-sm font-semibold text-[#1c1c24] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-500/50"
                                    disabled={isSubmitting}
                                >
                                    OK
                                </button>
                            </form>
                            <div aria-live="polite" className="min-h-[1.5rem]">
                                {feedback && (
                                    <p
                                        className={`text-xs ${feedback.type === 'success' ? 'text-emerald-300' : 'text-orange-300'
                                            }`}
                                    >
                                        {feedback.message}
                                    </p>
                                )}
                            </div>
                            <p className="text-xs text-white/50">
                                Ao assinar, você concorda com nossa política de privacidade.
                            </p>
                        </div>
                    </div>
                </Container>
            </div>

            <div className="border-t border-white/10 bg-black/30 py-6">
                <Container className="flex flex-col gap-4 text-xs text-white/60">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex flex-col gap-2">
                            <span>© {new Date().getFullYear()} {APP_NAME} © Todos os direitos reservados</span>
                            <span>CNPJ: 45.380.558/0001-88</span>
                            <span className="text-white/50">
                                Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <p>Feito com <span className="text-orange-400">❤️</span> por <Link href="https://www.instagram.com/5521/" target="_blank" className="text-orange-400 hover:text-orange-300 transition-colors">Guilherme Henrique</Link></p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-white/5 flex flex-wrap gap-x-4 gap-y-2 text-white/50">
                        <Link href="/privacidade" className="hover:text-white/70 transition-colors">
                            Política de Privacidade
                        </Link>
                        <span>•</span>
                        <Link href="/termos" className="hover:text-white/70 transition-colors">
                            Termos de Uso
                        </Link>
                        <span>•</span>
                        <span>Proteção de Dados Pessoais</span>
                    </div>
                </Container>
            </div>
        </footer>
    );
}

