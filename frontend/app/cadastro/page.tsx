'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import Link from 'next/link';
import {
    HiOutlineEnvelope,
    HiOutlinePhone,
    HiOutlineIdentification,
    HiOutlineUser,
    HiOutlineLockClosed,
} from 'react-icons/hi2';
import InputField from '@/components/forms/InputField';
import PasswordField from '@/components/forms/PasswordField';
import Button from '@/components/shared/Button';
import Container from '@/components/shared/Container';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
    sanitizeInput,
    normalizePhone,
    normalizeCpf,
    formatPhoneDisplay,
    formatCpfDisplay,
} from '@/utils/sanitize';

type SignupField = 'name' | 'email' | 'password' | 'confirmPassword' | 'phone' | 'cpf';

const validators: Record<SignupField, (value: string, data?: Record<SignupField, string>) => string> = {
    name: (value) => {
        if (!value.trim()) return 'Informe seu nome completo.';
        if (value.trim().length < 3) return 'Nome deve ter ao menos 3 caracteres.';
        return '';
    },
    email: (value) => {
        if (!value.trim()) return 'Informe seu e-mail.';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) return 'Informe um e-mail válido.';
        return '';
    },
    password: (value) => {
        if (!value.trim()) return 'Crie uma senha.';
        if (value.length < 6) return 'Senha deve ter no mínimo 6 caracteres.';
        if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Use letras e números na senha.';
        return '';
    },
    confirmPassword: (value, data) => {
        if (!value.trim()) return 'Confirme sua senha.';
        if (value !== data?.password) return 'As senhas não coincidem.';
        return '';
    },
    phone: (value) => {
        if (!value) return '';
        const digits = value.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 11) return 'Informe um telefone válido.';
        return '';
    },
    cpf: (value) => {
        if (!value) return '';
        const digits = value.replace(/\D/g, '');
        if (digits.length !== 11) return 'CPF deve ter 11 dígitos.';
        return '';
    },
};

export default function CadastroPage() {
    const router = useRouter();
    const { login: authLogin, updateUser } = useAuth();
    const [formData, setFormData] = useState<Record<SignupField, string>>({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        cpf: '',
    });

    const [errors, setErrors] = useState<Record<SignupField, string>>({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        cpf: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formMessage, setFormMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const [apiErrorsList, setApiErrorsList] = useState<Array<{ field?: string; message: string }>>([]);

    const handleChange = (field: SignupField) => (event: ChangeEvent<HTMLInputElement>) => {
        let value = event.target.value;

        if (field === 'phone') {
            const normalized = normalizePhone(value);
            value = formatPhoneDisplay(normalized);
        } else if (field === 'cpf') {
            const normalized = normalizeCpf(value);
            value = formatCpfDisplay(normalized);
        } else {
            value = sanitizeInput(value);
        }

        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            const normalizedValue =
                field === 'phone'
                    ? normalizePhone(value)
                    : field === 'cpf'
                    ? normalizeCpf(value)
                    : value;
            const message = validators[field](normalizedValue, {
                ...formData,
                [field]: normalizedValue,
            });
            setErrors((prev) => ({ ...prev, [field]: message }));
        }
        if (formMessage) setFormMessage(null);
    };

    const handleBlur = (field: SignupField) => () => {
        let normalizedValue: string;
        if (field === 'phone') {
            normalizedValue = normalizePhone(formData[field]);
        } else if (field === 'cpf') {
            normalizedValue = normalizeCpf(formData[field]);
        } else {
            normalizedValue = sanitizeInput(formData[field]);
        }

        const message = validators[field](normalizedValue, {
            ...formData,
            [field]: normalizedValue,
        });
        setErrors((prev) => ({ ...prev, [field]: message }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const fieldErrors = {
            name: validators.name(sanitizeInput(formData.name)),
            email: validators.email(sanitizeInput(formData.email)),
            password: validators.password(formData.password),
            confirmPassword: validators.confirmPassword(formData.confirmPassword, {
                ...formData,
                password: formData.password,
            }),
            phone: validators.phone(normalizePhone(formData.phone)),
            cpf: validators.cpf(normalizeCpf(formData.cpf)),
        };
        setErrors(fieldErrors);

        const hasErrors = Object.values(fieldErrors).some(Boolean);
        if (hasErrors) return;

        setIsSubmitting(true);
        setFormMessage(null);
        try {
            const nameSanitized = sanitizeInput(formData.name);
            const emailSanitized = sanitizeInput(formData.email).toLowerCase();
            const phoneDigits = normalizePhone(formData.phone);
            const cpfDigits = normalizeCpf(formData.cpf);
            const payload = {
                name: nameSanitized,
                email: emailSanitized,
                password: formData.password,
                phone: phoneDigits ? formatPhoneDisplay(phoneDigits) : undefined,
                cpf: cpfDigits ? formatCpfDisplay(cpfDigits) : undefined,
            };

            const response = await api.post('/auth/register', payload);
            const data = response.data?.data;
            const userResponse = data?.user ?? payload;

            if (data?.token && data?.user) {
                authLogin(
                    {
                        user: data.user,
                        accessToken: data.token,
                        refreshToken: data.refreshToken ?? data.token,
                        sessionId: data.sessionId,
                    },
                    true
                );
            } else if (data?.user) {
                updateUser(data.user);
            }

            setFormMessage({
                type: 'success',
                text: 'Conta criada com sucesso! Redirecionando...',
            });
            setTimeout(() => {
                router.replace('/');
            }, 800);
        } catch (error: any) {
            const status = error?.response?.status;
            const messageResponse = error?.response?.data?.message;
            const apiErrors = error?.response?.data?.errors;

            if (status === 409) {
                setErrors((prev) => ({
                    ...prev,
                    email: 'Este e-mail já está cadastrado.',
                }));
                setFormMessage({
                    type: 'error',
                    text: messageResponse || 'E-mail já cadastrado. Faça login ou use outro e-mail.',
                });
            } else if (status === 400 && Array.isArray(apiErrors) && apiErrors.length > 0) {
                const updatedErrors: Partial<Record<SignupField, string>> = {};
                const friendlyErrors: string[] = [];
                const listForDisplay: Array<{ field?: string; message: string }> = [];
                apiErrors.forEach((err: any) => {
                    if (!err || typeof err !== 'object') return;
                    const field = err.field as SignupField | undefined;
                    const message = err.message as string | undefined;
                    if (field && field !== ('role' as SignupField) && message && field in formData) {
                        updatedErrors[field] = message;
                    }
                    if (message && field !== ('role' as SignupField)) {
                        friendlyErrors.push(message);
                        listForDisplay.push({ field, message });
                    }
                });
                setErrors((prev) => ({ ...prev, ...updatedErrors }));
                setApiErrorsList(listForDisplay);
                const combinedMessage = [messageResponse, friendlyErrors.join(' • ')]
                    .filter(Boolean)
                    .join(' • ');
                setFormMessage({
                    type: 'error',
                    text:
                        combinedMessage ||
                        apiErrors[0]?.message ||
                        'Dados inválidos. Verifique e tente novamente.',
                });
            } else {
                setFormMessage({
                    type: 'error',
                    text:
                        messageResponse ||
                        apiErrors?.[0] ||
                        (error instanceof Error ? error.message : '') ||
                        'Não foi possível criar sua conta. Tente novamente.',
                });
            }

            if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.error('Erro ao cadastrar usuário', error?.response || error);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#faf7f0] py-12">
            <Container>
                <div className="mb-12 text-center">
                    <h1 className="text-4xl uppercase font-bold text-[#1a1a1d]">
                        Criar Conta
                    </h1>
                    <p className="mt-2 text-sm text-[#6f6b63]">
                        Preencha os dados abaixo para criar sua conta
                    </p>
                </div>

                <div className="mx-auto max-w-3xl">
                    <div className="rounded-3xl border border-[#ded7ca] bg-white/80 p-8">
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-[#1a1a1d]">
                                Nova Conta
                            </h2>
                            <p className="mt-1 text-sm text-[#6f6b63]">
                                Para liberar acessos, precisamos de algumas informações básicas. Seus dados são protegidos e usados apenas para sua experiência dentro da 5521.
                            </p>
                        </div>

                        <form className="space-y-6" noValidate onSubmit={handleSubmit}>
                        <div className="grid gap-5 md:grid-cols-2">
                            <InputField
                                label="Nome completo"
                                placeholder="Seu nome"
                                startIcon={<HiOutlineUser className="h-5 w-5" />}
                                value={formData.name}
                                onChange={handleChange('name')}
                                onBlur={handleBlur('name')}
                                error={errors.name}
                            />

                            <InputField
                                label="E-mail"
                                type="email"
                                placeholder="seu@email.com"
                                startIcon={<HiOutlineEnvelope className="h-5 w-5" />}
                                autoComplete="email"
                                value={formData.email}
                                onChange={handleChange('email')}
                                onBlur={handleBlur('email')}
                                error={errors.email}
                            />

                            <InputField
                                label="Telefone"
                                placeholder="(21) 99999-9999"
                                startIcon={<HiOutlinePhone className="h-5 w-5" />}
                                value={formData.phone}
                                onChange={handleChange('phone')}
                                onBlur={handleBlur('phone')}
                                hint="Opcional"
                                error={errors.phone}
                                inputMode="tel"
                                maxLength={15}
                            />

                            <InputField
                                label="CPF"
                                placeholder="000.000.000-00"
                                startIcon={<HiOutlineIdentification className="h-5 w-5" />}
                                value={formData.cpf}
                                onChange={handleChange('cpf')}
                                onBlur={handleBlur('cpf')}
                                hint="Opcional"
                                error={errors.cpf}
                                inputMode="numeric"
                                maxLength={14}
                            />
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <PasswordField
                                label="Senha"
                                placeholder="Crie uma senha forte"
                                startIcon={<HiOutlineLockClosed className="h-5 w-5" />}
                                autoComplete="new-password"
                                value={formData.password}
                                onChange={handleChange('password')}
                                onBlur={handleBlur('password')}
                                error={errors.password}
                            />

                            <PasswordField
                                label="Confirmar senha"
                                placeholder="Repita sua senha"
                                startIcon={<HiOutlineLockClosed className="h-5 w-5" />}
                                autoComplete="new-password"
                                value={formData.confirmPassword}
                                onChange={handleChange('confirmPassword')}
                                onBlur={handleBlur('confirmPassword')}
                                error={errors.confirmPassword}
                            />
                        </div>

                        <div className="rounded-xl border border-[#ded7ca] bg-[#f5f1e8]/40 p-4 text-xs text-[#6f6b63]">
                            <p className="leading-relaxed">
                                Ao criar a conta você concorda com os{' '}
                                <Link href="/termos" className="font-medium text-[#f97316] underline-offset-4 hover:underline">
                                    Termos de Uso
                                </Link>
                                {' '}e{' '}
                                <Link href="/privacidade" className="font-medium text-[#f97316] underline-offset-4 hover:underline">
                                    Política de Privacidade
                                </Link>
                                {' '}da 5521. Usamos os dados para personalizar sua experiência, emitir comprovantes fiscais e garantir segurança nos acessos.
                            </p>
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-[#1a1a1d] text-white transition hover:bg-[#f97316] hover:text-[#1a1a1d] disabled:cursor-not-allowed disabled:bg-[#1a1a1d]/60"
                        >
                            {isSubmitting ? 'Criando conta...' : 'Criar conta'}
                        </Button>

                        {formMessage && (
                            <div
                                className={`rounded-xl border p-4 text-sm text-center ${
                                    formMessage.type === 'error'
                                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                }`}
                            >
                                <div className="space-y-2">
                                    <p>{formMessage.text}</p>
                                    {formMessage.type === 'error' && apiErrorsList.length > 0 && (
                                        <ul className="list-inside list-disc text-left text-xs mt-2">
                                            {apiErrorsList.map(
                                                (err: { field?: string; message: string }, index: number) => (
                                                    <li key={`${err.field ?? 'erro'}-${index}`}>{err.message}</li>
                                                )
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        )}

                        <p className="text-center text-xs text-[#6f6b63]">
                            Já possui uma conta?{' '}
                            <Link href="/login" className="font-medium text-[#f97316] underline-offset-4 hover:underline">
                                Acessar agora
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </Container>
        </main>
    );
}