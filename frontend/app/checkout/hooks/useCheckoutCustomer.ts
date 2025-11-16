'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { sanitizeInput, formatCpfDisplay, formatPhoneDisplay } from '@/utils/sanitize';
import type { CheckoutCustomerData } from '../types';
import { storageHelpers } from '../utils/storageHelpers';

export function useCheckoutCustomer() {
    const { user } = useAuth();
    const [customerData, setCustomerData] = useState<CheckoutCustomerData>(() => storageHelpers.loadCustomerData());
    const [persistCustomerData, setPersistCustomerData] = useState(true);

    // Preencher dados do usuário logado quando disponível
    useEffect(() => {
        if (!user) return;

        setCustomerData((prev) => {
            const next = { ...prev };
            let changed = false;

            if (!next.name && user.name) {
                next.name = sanitizeInput(user.name);
                changed = true;
            }
            if (!next.email && user.email) {
                next.email = sanitizeInput(user.email).toLowerCase();
                changed = true;
            }
            if (!next.cpf && user.cpf) {
                next.cpf = formatCpfDisplay(user.cpf);
                changed = true;
            }
            if (!next.phone && user.phone) {
                next.phone = formatPhoneDisplay(user.phone);
                changed = true;
            }

            return changed ? next : prev;
        });
    }, [user]);

    // Salvar dados no storage quando mudarem
    useEffect(() => {
        if (!persistCustomerData) return;
        storageHelpers.saveCustomerData(customerData);
    }, [customerData, persistCustomerData]);

    const handleChange = useCallback((field: keyof CheckoutCustomerData, value: string) => {
        setPersistCustomerData(true);
        setCustomerData((prev) => {
            const next = { ...prev };
            if (field === 'name') {
                next.name = sanitizeInput(value);
            } else if (field === 'email') {
                next.email = sanitizeInput(value).toLowerCase();
            } else if (field === 'cpf') {
                next.cpf = formatCpfDisplay(value);
            } else if (field === 'phone') {
                next.phone = formatPhoneDisplay(value);
            }
            return next;
        });
    }, []);

    const validateCustomerData = useCallback(() => {
        const normalizedCpf = customerData.cpf.replace(/\D/g, '');
        const normalizedPhone = customerData.phone.replace(/\D/g, '');

        if (!customerData.name.trim()) {
            return { valid: false, error: 'Informe o nome completo.' };
        }
        if (!customerData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
            return { valid: false, error: 'Informe um e-mail válido.' };
        }
        if (normalizedCpf.length !== 11) {
            return { valid: false, error: 'Informe um CPF válido (11 dígitos).' };
        }
        if (normalizedPhone.length < 10) {
            return { valid: false, error: 'Informe um telefone válido com DDD.' };
        }
        return { valid: true };
    }, [customerData]);

    return {
        customerData,
        handleChange,
        validateCustomerData,
        setPersistCustomerData,
    };
}

