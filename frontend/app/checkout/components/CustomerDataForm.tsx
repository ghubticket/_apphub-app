'use client';

import { HiOutlineEnvelope, HiOutlineIdentification, HiOutlinePhone, HiOutlineUser } from 'react-icons/hi2';
import type { CheckoutCustomerData } from '../types';
import { INPUT_BASE_CLASS } from '../constants';

type CustomerDataFormProps = {
    data: CheckoutCustomerData;
    disabled: boolean;
    onChange: (field: keyof CheckoutCustomerData, value: string) => void;
    docTypeReady: boolean;
};

export function CustomerDataForm({ data, disabled, onChange, docTypeReady }: CustomerDataFormProps) {
    const sharedClass = `${INPUT_BASE_CLASS} py-3 pl-11 pr-4 ${disabled ? 'cursor-not-allowed bg-[#f0ece2] text-[#7d796c]' : ''}`;

    return (
        <div className="rounded-3xl border border-[#ded7ca] bg-white p-6 shadow-[0_25px_55px_-30px_rgba(20,20,32,0.35)] relative">
            <h2 className="text-lg font-semibold uppercase tracking-normal text-[#1a1a1d]">Dados do comprador</h2>
            <p className="text-xs text-[#7d796c]">Usaremos essas informações para gerar o pedido e os ingressos.</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d]">
                    Nome completo
                    <div className="relative">
                        <HiOutlineUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                        <input
                            type="text"
                            value={data.name}
                            onChange={(event) => onChange('name', event.target.value)}
                            readOnly={disabled}
                            aria-readonly={disabled}
                            className={sharedClass}
                            placeholder="Como aparece no documento"
                        />
                    </div>
                </label>
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d]">
                    E-mail
                    <div className="relative">
                        <HiOutlineEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                        <input
                            type="email"
                            value={data.email}
                            onChange={(event) => onChange('email', event.target.value)}
                            readOnly={disabled}
                            aria-readonly={disabled}
                            className={sharedClass}
                            placeholder="email@exemplo.com"
                        />
                    </div>
                </label>
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d]">
                    CPF
                    <div className="relative">
                        <HiOutlineIdentification
                            className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${docTypeReady ? 'text-[#a38f78]' : 'text-[#d3c7b5]'}`}
                        />
                        <input
                            type="text"
                            value={data.cpf}
                            onChange={(event) => onChange('cpf', event.target.value)}
                            readOnly={disabled}
                            aria-readonly={disabled}
                            className={sharedClass}
                            placeholder="000.000.000-00"
                        />
                    </div>
                </label>
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1a1a1d]">
                    Celular
                    <div className="relative">
                        <HiOutlinePhone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a38f78]" />
                        <input
                            type="tel"
                            value={data.phone}
                            onChange={(event) => onChange('phone', event.target.value)}
                            readOnly={disabled}
                            aria-readonly={disabled}
                            className={sharedClass}
                            placeholder="(11) 99999-9999"
                        />
                    </div>
                </label>
            </div>
        </div>
    );
}

