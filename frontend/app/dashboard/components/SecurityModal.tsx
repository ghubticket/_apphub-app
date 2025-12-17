'use client';

import { HiOutlineExclamationTriangle } from 'react-icons/hi2';

interface SecurityModalProps {
    isOpen: boolean;
    isEntering: boolean;
    onClose: () => void;
}

export default function SecurityModal({ isOpen, isEntering, onClose }: SecurityModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-300 ${
                isEntering ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={onClose}
        >
            <div
                className={`relative w-full max-w-md rounded-2xl border border-[#ded7ca] bg-white/95 p-6 shadow-2xl transition-all duration-300 ${
                    isEntering
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 translate-y-3 scale-95'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 text-[#7d796c] hover:text-[#1a1a1d] transition"
                >
                    <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>

                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                        <HiOutlineExclamationTriangle className="h-6 w-6 text-amber-600" />
                    </div>
                    <h3 className="text-lg leading-0 font-semibold uppercase tracking-normal text-[#1a1a1d]">
                        Segurança e Comodidade
                    </h3>
                </div>

                <div className="space-y-4 text-sm text-[#4c4c55]">
                    <p>
                        Para sua <strong className="text-[#1a1a1d]">SEGURANÇA</strong> e{' '}
                        <strong className="text-[#1a1a1d]">MAIOR COMODIDADE</strong>, seus ingressos
                        estão disponíveis somente no{' '}
                        <strong className="text-[#1a1a1d]">mobile</strong>.
                    </p>

                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-normal text-amber-800 mb-2">
                            Proteções Ativas:
                        </p>
                        <ul className="space-y-2 text-xs text-amber-700">
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5">•</span>
                                <span>Detecção de prints de tela</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5">•</span>
                                <span>Identificação de atividades suspeitas</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5">•</span>
                                <span>Proteção contra tentativas de burlar o sistema</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5">•</span>
                                <span>Visualização otimizada para dispositivos móveis</span>
                            </li>
                        </ul>
                    </div>

                    <p className="text-xs text-[#7d796c]">
                        Acesse seus ingressos através do seu celular ou tablet para uma experiência
                        segura e completa.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="mt-6 w-full rounded-full bg-[#1a1a1d] px-6 py-3 text-xs font-semibold uppercase tracking-normal text-white shadow-lg transition hover:bg-[#f97316] hover:text-white"
                >
                    Entendi
                </button>
            </div>
        </div>
    );
}
