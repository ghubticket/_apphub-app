'use client';

import { ChangeEvent, FormEvent, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineUserPlus, HiOutlineIdentification } from 'react-icons/hi2';
import { useRouter, useSearchParams } from 'next/navigation';
import InputField from '@/components/forms/InputField';
import PasswordField from '@/components/forms/PasswordField';
import Button from '@/components/shared/Button';
import PageContainer from '@/components/shared/PageContainer';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { sanitizeInput, isValidCpf } from '@/utils/sanitize';
import { useEmailSuggestions } from '@/hooks/useEmailSuggestions';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import DynamicMetadata from '@/components/seo/DynamicMetadata';

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

// Função para formatar CPF
const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

// Componente interno que usa useSearchParams - precisa estar em Suspense
function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login: authLogin, isAuthenticated, isReady } = useAuth();

    // Obter returnUrl da query string
    const returnUrl = searchParams.get('returnUrl');

    useEffect(() => {
        if (isReady && isAuthenticated) {
            // Se há returnUrl, redirecionar para ele, senão ir para dashboard
            const redirectTo = returnUrl || '/dashboard';
            router.replace(redirectTo);
        }
    }, [isReady, isAuthenticated, router, returnUrl]);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        remember: true,
    });

    const [cpf, setCpf] = useState('');
    const [cpfError, setCpfError] = useState('');

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
        if (cpfError) {
            setCpfError('');
        }
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
                // CRÍTICO: Usar returnUrl da query string se disponível, senão ir para dashboard
                const redirectTo = returnUrl || '/dashboard';
                router.replace(redirectTo);
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
            // Log omitido em produção
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateAccount = () => {
        const cpfNumbers = cpf.replace(/\D/g, '');
        if (!cpfNumbers) {
            setCpfError('Informe seu CPF para continuar.');
            return;
        }
        if (!isValidCpf(cpfNumbers)) {
            setCpfError('CPF inválido. Confira os números antes de continuar.');
            return;
        }

        // CPF válido: seguir para cadastro já com o CPF preenchido
        router.push(`/cadastro?cpf=${encodeURIComponent(cpfNumbers)}`);
    };

    const emailSuggestions = useEmailSuggestions(formData.email);

    if (isSubmitting) {
        return (
            <PageContainer bgColor="bg-[#faf7f0]">
                <LoadingSpinner 
                    message="Entrando..." 
                    submessage="Aguarde enquanto validamos suas informações"
                    fullscreen={false}
                />
            </PageContainer>
        );
    }

    return (
        <>
            <DynamicMetadata
                title="Login"
                description="Faça login na sua conta vicente para acessar seus ingressos e acompanhar seus pedidos."
                url="/login"
                noindex={true}
            />
            <PageContainer bgColor="bg-[#faf7f0]">
                <header className="mb-10 space-y-3 hidden md:block">
                    <span className="text-xs font-semibold uppercase tracking-normal text-[#a38f78]">Área do Cliente</span>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <h1 className="text-3xl font-bold uppercase tracking-normal text-[#1a1a1d]">Faça seu Login</h1>
                        <p className="text-sm text-[#4c4c55]">Ou crie sua conta para continuar.</p></div>
                    </header>

                <div className="relative grid md:gap-24 gap-5 md:grid-cols-2">
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
                                                onClick={() => {
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        email: suggestion,
                                                    }));
                                                    setErrors((prev) => ({ ...prev, email: '' }));
                                                    setFormMessage(null);
                                                }}
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
                                className="w-full bg-[#1a1a1d] text-white transition hover:bg-[#f97316] hover:text-white disabled:cursor-not-allowed disabled:bg-[#1a1a1d]/60 disabled:hover:bg-[#1a1a1d]/60"
                            >
                                {isSubmitting ? 'Entrando...' : 'Entrar'}
                            </Button>

                            {formMessage && (
                                <div
                                    className={`rounded-xl border p-4 text-sm text-center ${formMessage.type === 'error'
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
                                    type="tel"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="000.000.000-00"
                                    startIcon={<HiOutlineIdentification className="h-5 w-5" />}
                                    value={cpf}
                                    onChange={handleCPFChange}
                                    maxLength={14}
                                    error={cpfError}
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
        </PageContainer>
        </>
    );
}

// Componente principal que envolve o conteúdo em Suspense
export default function LoginPage() {
    return (
        <Suspense fallback={
            <PageContainer bgColor="bg-[#faf7f0]">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <p className="text-[#6f6b63]">Carregando...</p>
                    </div>
                </div>
            </PageContainer>
        }>
            <LoginPageContent />
        </Suspense>
    );
}
