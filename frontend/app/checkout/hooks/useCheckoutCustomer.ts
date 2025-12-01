'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { sanitizeInput, formatCpfDisplay, formatPhoneDisplay } from '@/utils/sanitize';
import type { CheckoutCustomerData } from '../types';
import { storageHelpers } from '../utils/storageHelpers';

export function useCheckoutCustomer() {
    const { user } = useAuth();
    const userId = user?._id || user?.id || null;
    
    // CRÍTICO: Carregar dados validando o userId para evitar dados de outro usuário
    // IMPORTANTE: Inicializar sempre vazio e carregar depois para evitar race conditions
    const [customerData, setCustomerData] = useState<CheckoutCustomerData>(() => {
        // Sempre começar vazio na inicialização - os dados serão carregados no useEffect
        console.log('[useCheckoutCustomer] 🚀 Inicializando hook, começando com dados vazios');
        return { name: '', email: '', cpf: '', phone: '' };
    });
    const [persistCustomerData, setPersistCustomerData] = useState(true);

    // CRÍTICO: Limpar dados quando o usuário mudar (logout/login de outro usuário)
    useEffect(() => {
        if (!userId) {
            // Usuário deslogado - limpar dados
            console.log('[useCheckoutCustomer] 🧹 Usuário deslogado, limpando dados');
            storageHelpers.clearCustomerData();
            setCustomerData({ name: '', email: '', cpf: '', phone: '' });
            return;
        }

        // Verificar se os dados salvos pertencem ao usuário atual
        const savedData = storageHelpers.loadCustomerData(userId);
        const savedUserId = typeof window !== 'undefined' 
            ? window.localStorage.getItem('checkout:customer-user-id')
            : null;

        console.log('[useCheckoutCustomer] 🔍 Verificando dados salvos:', {
            currentUserId: userId,
            savedUserId,
            hasSavedData: !!(savedData && (savedData.name || savedData.email)),
            savedDataName: savedData?.name,
            savedDataEmail: savedData?.email,
        });

        // Se há dados salvos mas são de outro usuário, limpar e recarregar
        if (savedUserId && savedUserId !== userId) {
            console.log('[useCheckoutCustomer] 🔒 Usuário diferente detectado, limpando dados antigos:', {
                savedUserId,
                currentUserId: userId,
            });
            storageHelpers.clearCustomerData();
            setCustomerData({ name: '', email: '', cpf: '', phone: '' });
        } else if (savedData && (savedData.name || savedData.email)) {
            // Carregar dados válidos do usuário atual
            console.log('[useCheckoutCustomer] ✅ Carregando dados salvos do usuário atual:', {
                name: savedData.name,
                email: savedData.email,
            });
            setCustomerData(savedData);
        } else {
            // Não há dados salvos - começar vazio
            console.log('[useCheckoutCustomer] 📝 Nenhum dado salvo encontrado, iniciando vazio');
            setCustomerData({ name: '', email: '', cpf: '', phone: '' });
        }
    }, [userId]);

    // CRÍTICO: Limpar dados quando o componente montar se não houver userId válido
    useEffect(() => {
        if (!userId && typeof window !== 'undefined') {
            // Forçar limpeza completa ao montar se não há usuário
            console.log('[useCheckoutCustomer] 🧹 Sem userId ao montar, forçando limpeza completa');
            storageHelpers.clearCustomerData();
            setCustomerData({ name: '', email: '', cpf: '', phone: '' });
        }
    }, []); // Executar apenas uma vez ao montar

    // Preencher dados do usuário logado quando disponível
    // CRÍTICO: Só preencher se os campos estiverem vazios E se os dados vierem do usuário atual
    // IMPORTANTE: Não preencher automaticamente se já há dados no storage (mesmo que vazios)
    useEffect(() => {
        if (!user || !userId) return;

        // DEBUG: Log para identificar de onde vêm os dados
        console.log('[useCheckoutCustomer] 👤 Dados do usuário do AuthContext:', {
            userId,
            userName: user.name,
            userEmail: user.email,
            userCpf: user.cpf,
            userPhone: user.phone,
        });

        // Verificar se há dados salvos no storage primeiro
        const savedData = storageHelpers.loadCustomerData(userId);
        const hasAnySavedData = savedData && (savedData.name || savedData.email || savedData.cpf || savedData.phone);
        
        // Se há dados salvos (mesmo que parcialmente), não preencher automaticamente do user
        if (hasAnySavedData) {
            console.log('[useCheckoutCustomer] ⚠️ Dados salvos encontrados, não preenchendo automaticamente do user');
            return;
        }

        setCustomerData((prev) => {
            // CRÍTICO: Só preencher campos vazios, nunca sobrescrever dados existentes
            const next = { ...prev };
            let changed = false;

            // Só preencher se TODOS os campos estiverem vazios (primeira vez)
            const allFieldsEmpty = !next.name && !next.email && !next.cpf && !next.phone;
            
            if (!allFieldsEmpty) {
                console.log('[useCheckoutCustomer] ⚠️ Campos já preenchidos, não sobrescrevendo:', {
                    hasName: !!next.name,
                    hasEmail: !!next.email,
                    hasCpf: !!next.cpf,
                    hasPhone: !!next.phone,
                });
                return prev;
            }

            // Função auxiliar para detectar se um valor está criptografado
            const isEncrypted = (value: string | undefined): boolean => {
                if (!value) return false;
                // Dados criptografados têm formato "iv:authTag:encryptedData" (3 partes separadas por :)
                return value.includes(':') && value.split(':').length === 3;
            };

            // Só preencher se o campo estiver vazio E se o usuário tiver esse dado
            if (!next.name && user.name) {
                next.name = sanitizeInput(user.name);
                changed = true;
                console.log('[useCheckoutCustomer] ✅ Preenchendo nome do usuário:', user.name);
            }
            if (!next.email && user.email) {
                next.email = sanitizeInput(user.email).toLowerCase();
                changed = true;
                console.log('[useCheckoutCustomer] ✅ Preenchendo email do usuário:', user.email);
            }
            // CRÍTICO: Não preencher CPF se estiver criptografado (dados não descriptografados pelo backend)
            if (!next.cpf && user.cpf) {
                if (isEncrypted(user.cpf)) {
                    console.warn('[useCheckoutCustomer] ⚠️ CPF do usuário está criptografado, não preenchendo:', user.cpf);
                    // Não preencher dados criptografados
                } else {
                    next.cpf = formatCpfDisplay(user.cpf);
                    changed = true;
                    console.log('[useCheckoutCustomer] ✅ Preenchendo CPF do usuário:', user.cpf);
                }
            }
            // CRÍTICO: Não preencher telefone se estiver criptografado (dados não descriptografados pelo backend)
            if (!next.phone && user.phone) {
                if (isEncrypted(user.phone)) {
                    console.warn('[useCheckoutCustomer] ⚠️ Telefone do usuário está criptografado, não preenchendo:', user.phone);
                    // Não preencher dados criptografados
                } else {
                    next.phone = formatPhoneDisplay(user.phone);
                    changed = true;
                    console.log('[useCheckoutCustomer] ✅ Preenchendo telefone do usuário:', user.phone);
                }
            }

            return changed ? next : prev;
        });
    }, [user, userId]);

    // Salvar dados no storage quando mudarem (sempre com userId para validação)
    useEffect(() => {
        if (!persistCustomerData) return;
        if (!userId) {
            // Não salvar dados se não há usuário logado
            return;
        }
        storageHelpers.saveCustomerData(customerData, userId);
    }, [customerData, persistCustomerData, userId]);

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

