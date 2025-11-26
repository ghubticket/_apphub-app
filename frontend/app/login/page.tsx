'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineUserPlus, HiOutlineIdentification } from 'react-icons/hi2';
import { useRouter } from 'next/navigation';
import InputField from '@/components/forms/InputField';
import PasswordField from '@/components/forms/PasswordField';
import Button from '@/components/shared/Button';
import Container from '@/components/shared/Container';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { sanitizeInput } from '@/utils/sanitize';

type LoginFormFields = 'email' | 'password';

const validators: Record<LoginFormFields, (value: string) => string> = {
    email: (value) => {
        if (!value.trim()) return 'Informe seu e-mail.';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) return 'Informe um e-mail válido.';
        return '';
    },
    password: (value) => {
        if (!value.trim()) return 'Informe sua senha.';
        if (value.trim().length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
        return '';
    },
};

const EMAIL_DOMAIN_SUGGESTIONS = [
    'gmail.com',
    'outlook.com',
    'hotmail.com',
    'icloud.com',
    'live.com',
    'me.com',
];

// Função para formatar CPF
const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

// Função para validar CPF básico
const validateCPF = (cpf: string): boolean => {
    const numbers = cpf.replace(/\D/g, '');
    return numbers.length === 11;
};

export default function LoginPage() {
    const router = useRouter();
    const { login: authLogin, isAuthenticated, isReady } = useAuth();
    
    useEffect(() => {
        if (isReady && isAuthenticated) {
            router.replace('/dashboard');
        }
    }, [isReady, isAuthenticated, router]);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        remember: true,
    });

    const [cpf, setCpf] = useState('');

    const [errors, setErrors] = useState<Record<LoginFormFields, string>>({
        email: '',
        password: '',
    });
    const [formMessage, setFormMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field: LoginFormFields) => (event: ChangeEvent<HTMLInputElement>) => {
        const rawValue = event.target.value;
        const value = field === 'email' ? sanitizeInput(rawValue) : rawValue;
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (formMessage) setFormMessage(null);
    };

    const handleCPFChange = (event: ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCPF(event.target.value);
        setCpf(formatted);
    };

    const handleRememberToggle = (event: ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, remember: event.target.checked }));
    };

    const validateField = (field: LoginFormFields, value: string) => {
        const message = validators[field](value);
        setErrors((prev) => ({ ...prev, [field]: message }));
        return message;
    };

    const handleBlur = (field: LoginFormFields) => () => {
        validateField(field, formData[field]);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const fieldErrors = {
            email: validators.email(formData.email),
            password: validators.password(formData.password),
        };
        setErrors(fieldErrors);

        const hasErrors = Object.values(fieldErrors).some(Boolean);
        if (hasErrors) return;

        setIsSubmitting(true);
        setFormMessage(null);

        try {
            const payload = {
                email: formData.email.trim(),
                password: formData.password,
            };

            const response = await api.post('/auth/login', payload);
            const { accessToken, refreshToken, user, sessionId } = response.data?.data ?? {};
            if (!accessToken || !refreshToken) {
                throw new Error('Tokens não recebidos do servidor.');
            }

            authLogin(
                {
                    user,
                    accessToken,
                    refreshToken,
                    sessionId,
                },
                formData.remember
            );

            setFormMessage({
                type: 'success',
                text: 'Login realizado com sucesso. Redirecionando...',
            });

            setTimeout(() => {
                router.replace('/');
            }, 600);
        } catch (error: any) {
            const status = error?.response?.status;
            const messageResponse = error?.response?.data?.message;
            const apiErrors: string[] | undefined = error?.response?.data?.errors;

            if (status === 401 || status === 403) {
                const invalidMessage = 'E-mail ou senha incorretos.';
                setErrors((prev) => ({
                    ...prev,
                    email: invalidMessage,
                    password: invalidMessage,
                }));
                setFormMessage({
                    type: 'error',
                    text: invalidMessage,
                });
            } else if (status === 429) {
                setFormMessage({
                    type: 'error',
                    text: messageResponse || 'Muitas tentativas. Tente novamente em instantes.',
                });
            } else {
                setFormMessage({
                    type: 'error',
                    text:
                        messageResponse ||
                        apiErrors?.[0] ||
                        (error instanceof Error ? error.message : '') ||
                        'Não foi possível realizar o login. Tente novamente.',
                });
            }
            if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.error('Erro no login', error?.response || error);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateAccount = () => {
        const cpfNumbers = cpf.replace(/\D/g, '');
        if (validateCPF(cpf)) {
            router.push(`/cadastro?cpf=${encodeURIComponent(cpfNumbers)}`);
        } else {
            // Se CPF não está completo, ainda pode ir para cadastro
            router.push('/cadastro');
        }
    };

    const emailSuggestions = (() => {
        const value = formData.email.trim();
        const atIndex = value.indexOf('@');
        if (atIndex === -1) return [] as string[];
        const localPart = value.slice(0, atIndex);
        const domainPart = value.slice(atIndex + 1);
        if (!localPart || domainPart.includes('.com.br')) return [] as string[];
        const matches = EMAIL_DOMAIN_SUGGESTIONS.filter((d) =>
            d.startsWith(domainPart.toLowerCase())
        );
        return matches.slice(0, 5).map((d) => `${localPart}@${d}`);
    })();

    return (
        <main className="min-h-screen bg-[#faf7f0] py-12">
            <Container>
                <div className="mb-12 text-center">
                    <h1 className="text-4xl uppercase font-bold text-[#1a1a1d]">
                        Bem-vindo à 5521
                    </h1>
                    <p className="mt-2 text-sm text-[#6f6b63]">
                        Entre com sua conta ou crie uma nova
                    </p>
                </div>

                <div className="relative grid gap-24 md:grid-cols-2">
                    {/* Divider vertical no meio */}
                    <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-[#ded7ca] md:block" />

                    {/* Box de Login */}
                    <div className="rounded-3xl border border-[#ded7ca] bg-white/80 p-8 ">
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-[#1a1a1d]">
                                Entrar
                            </h2>
                            <p className="mt-1 text-sm text-[#6f6b63]">
                                Use seus dados de acesso para continuar
                            </p>
                        </div>

                        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                            <div className="space-y-1">
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
                                {emailSuggestions.length > 0 && (
                                    <div className="mt-1 overflow-hidden rounded-xl border border-[#e1dbcf] bg-white shadow-sm">
                                        {emailSuggestions.map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                type="button"
                                                className="block w-full px-3 py-2 text-left text-xs text-[#6f6b63] hover:bg-[#f5f1e8]"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        email: suggestion,
                                                    }))
                                                }
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <PasswordField
                                    label="Senha"
                                    placeholder="Digite sua senha"
                                    startIcon={<HiOutlineLockClosed className="h-5 w-5" />}
                                    autoComplete="current-password"
                                    value={formData.password}
                                    onChange={handleChange('password')}
                                    onBlur={handleBlur('password')}
                                    error={errors.password}
                                />

                            <div className="flex items-center justify-between text-xs text-[#6f6b63]">
                                    <label className="inline-flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border border-[#ded7ca] text-[#f97316] focus:ring-[#f97316]/40"
                                            checked={formData.remember}
                                            onChange={handleRememberToggle}
                                        />
                                        Lembrar-me
                                    </label>
                                    <Link
                                        href="/recuperar-senha"
                                        className="font-medium text-[#f97316] underline-offset-4 hover:underline"
                                    >
                                        Esqueci minha senha
                                    </Link>
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-[#1a1a1d] text-white transition hover:bg-[#f97316] hover:text-[#1a1a1d] disabled:cursor-not-allowed disabled:bg-[#1a1a1d]/60 disabled:hover:bg-[#1a1a1d]/60"
                            >
                                {isSubmitting ? 'Entrando...' : 'Entrar'}
                            </Button>

                            {formMessage && (
                                <div
                                    className={`rounded-xl border p-4 text-sm text-center ${
                                        formMessage.type === 'error'
                                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    }`}
                                >
                                    {formMessage.text}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Box de Criar Conta */}
                    <div className="rounded-3xl border border-[#ded7ca] bg-[#f5f1e8]/40 p-8">
                        <div className="mb-6">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f5f1e8] text-[#a38f78]">
                                <HiOutlineUserPlus className="text-2xl" />
                            </div>
                            <h2 className="text-2xl font-semibold text-[#1a1a1d]">
                                Vamos criar sua conta?
                            </h2>
                            <p className="mt-1 text-sm text-[#6f6b63]">
                                Digite seu CPF para continuar
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <InputField
                                    label="CPF"
                                    type="text"
                                    placeholder="000.000.000-00"
                                    startIcon={<HiOutlineIdentification className="h-5 w-5" />}
                                    value={cpf}
                                    onChange={handleCPFChange}
                                    maxLength={14}
                                />
                            </div>

                            <Button
                                type="button"
                                onClick={handleCreateAccount}
                                className="w-full border-2 border-[#1a1a1d] bg-transparent text-[#1a1a1d] transition hover:bg-[#1a1a1d] hover:text-white"
                            >
                                Continuar
                            </Button>

                            <p className="text-center text-xs text-[#6f6b63]">
                                Ao continuar, você concorda com nossos{' '}
                                <Link href="/termos" className="font-medium text-[#f97316] underline-offset-4 hover:underline">
                                    Termos de Uso
                                </Link>
                                {' '}e{' '}
                                <Link href="/privacidade" className="font-medium text-[#f97316] underline-offset-4 hover:underline">
                                    Política de Privacidade
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </Container>
        </main>
    );
}
