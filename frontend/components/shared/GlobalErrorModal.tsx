'use client';

import { useEffect, useState } from 'react';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';
import { useGlobalError } from '@/context/GlobalErrorContext';

/**
 * Modal global de erro para avisar sobre instabilidades do sistema
 * Exibe quando há erros de rede, servidor (500+), ou manutenção
 */
export default function GlobalErrorModal() {
    const { error, hideError } = useGlobalError();
    const [mounted, setMounted] = useState(false);
    const [entering, setEntering] = useState(false);

    useEffect(() => {
        if (error.isOpen) {
            setMounted(true);
            const frame = requestAnimationFrame(() => {
                setEntering(true);
            });
            return () => cancelAnimationFrame(frame);
        } else {
            setEntering(false);
            const timeout = setTimeout(() => {
                setMounted(false);
            }, 250);
            return () => clearTimeout(timeout);
        }
    }, [error.isOpen]);

    // Fechar com ESC
    useEffect(() => {
        if (!error.isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                hideError();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [error.isOpen, hideError]);

    // Bloquear scroll do body quando modal estiver aberta
    useEffect(() => {
        if (!error.isOpen) return;

        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = original;
        };
    }, [error.isOpen]);

    if (!mounted || !error.isOpen) return null;

    const activeClass = entering
        ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
        : 'opacity-0 translate-y-3 pointer-events-none scale-95';

    // Definir título e mensagem baseado no tipo de erro
    const getErrorContent = () => {
        switch (error.errorType) {
            case 'network':
                return {
                    title: error.title || 'Problema de conexão',
                    message:
                        error.message ||
                        'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.',
                };
            case 'server':
                return {
                    title: error.title || 'Serviço temporariamente indisponível',
                    message:
                        error.message ||
                        'Estamos enfrentando uma instabilidade técnica. Nossa equipe já foi notificada e está trabalhando para resolver o problema. Por favor, tente novamente em alguns minutos.',
                };
            case 'maintenance':
                return {
                    title: error.title || 'Manutenção programada',
                    message:
                        error.message ||
                        'Estamos realizando uma manutenção programada. O serviço voltará em breve. Agradecemos sua compreensão.',
                };
            default:
                return {
                    title: error.title || 'Erro inesperado',
                    message:
                        error.message ||
                        'Ocorreu um erro inesperado. Nossa equipe foi notificada. Por favor, tente novamente em alguns instantes.',
                };
        }
    };

    const { title, message } = getErrorContent();

    return (
        <div
            className={`fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-all duration-300 ${entering ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={hideError}
        >
            <div
                className={`relative w-full max-w-lg rounded-2xl bg-white shadow-2xl transition-all duration-300 ${activeClass}`}
                style={{ margin: 'auto' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col items-center gap-6 p-8 text-center">
                    {/* Ícone de erro */}
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500">
                        <HiOutlineExclamationTriangle className="h-12 w-12 text-white" />
                    </div>

                    {/* Título */}
                    <h2 className="text-2xl font-bold uppercase text-amber-700">{title}</h2>

                    {/* Mensagem */}
                    <div className="space-y-2 text-sm leading-relaxed text-gray-700">
                        <p>{message}</p>
                        <p className="mt-4 text-xs text-gray-500">
                            Se o problema persistir, entre em contato com o suporte.
                        </p>
                    </div>

                    {/* Botão de ação */}
                    <div className="flex w-full flex-col gap-3">
                        <button
                            type="button"
                            onClick={hideError}
                            className="rounded-full bg-amber-600 px-8 py-3 text-sm font-semibold uppercase tracking-normal text-white transition hover:bg-amber-700"
                        >
                            Entendi
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                window.location.reload();
                            }}
                            className="rounded-full border border-amber-300 bg-white px-8 py-3 text-sm font-semibold uppercase tracking-normal text-amber-700 transition hover:border-amber-400 hover:bg-amber-50"
                        >
                            Recarregar página
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

