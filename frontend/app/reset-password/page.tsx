'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { HiOutlineLockClosed } from 'react-icons/hi2';
import AuthCard from '@/components/auth/AuthCard';
import PasswordField from '@/components/forms/PasswordField';
import Button from '@/components/shared/Button';
import api from '@/lib/api';
import Container from '@/components/shared/Container';

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
    const [formMessage, setFormMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validatePassword = (value: string) => {
        if (!value.trim()) return 'Informe a nova senha.';
        if (value.trim().length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
        return '';
    };

    const validateConfirmPassword = (value: string) => {
        if (!value.trim()) return 'Confirme a nova senha.';
        if (value !== password) return 'As senhas não coincidem.';
        return '';
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormMessage(null);

        if (!token) {
            setFormMessage({
                type: 'error',
                text: 'Link de redefinição inválido. Solicite um novo link.',
            });
            return;
        }

        const passwordError = validatePassword(password);
        const confirmError = validateConfirmPassword(confirmPassword);

        setErrors({
            password: passwordError,
            confirmPassword: confirmError,
        });

        if (passwordError || confirmError) return;

        setIsSubmitting(true);

        try {
            await api.post('/auth/reset-password', {
                token,
                newPassword: password,
                confirmPassword,
            });

            setFormMessage({
                type: 'success',
                text: 'Senha redefinida com sucesso. Você já pode fazer login com a nova senha.',
            });

            setTimeout(() => {
                router.replace('/login');
            }, 1500);
        } catch (err: any) {
            const status = err?.response?.status;
            const messageResponse: string | undefined = err?.response?.data?.message;
            const apiErrors: string[] | undefined = err?.response?.data?.errors;

            let text =
                messageResponse ||
                apiErrors?.[0] ||
                'Não foi possível redefinir a senha. O link pode estar expirado. Solicite um novo.';

            if (status === 400) {
                text =
                    messageResponse ||
                    'Link de redefinição inválido ou expirado. Solicite um novo link.';
            }

            setFormMessage({
                type: 'error',
                text,
            });

            if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.error('[reset-password] Erro ao redefinir senha:', err?.response || err);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const isTokenMissing = !token;

    return (
        <main className="min-h-screen bg-[#faf7f0] py-12">
            <Container>
                <div className="mx-auto max-w-lg">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-semibold uppercase tracking-[0.25em] text-[#1a1a1d]">
                            Redefinir senha
                        </h1>
                        <p className="mt-2 text-sm text-[#6f6b63]">
                            Escolha uma nova senha para continuar acessando sua conta com segurança.
                        </p>
                    </div>

                    <AuthCard
                        title="Nova senha"
                        description={
                            isTokenMissing
                                ? 'O link de redefinição é inválido ou está incompleto. Solicite um novo link para continuar.'
                                : 'Defina uma nova senha forte para proteger sua conta.'
                        }
                    >
                        {isTokenMissing ? (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-[#e1dbcf] bg-white/60 p-4 text-xs text-[#5b5866]">
                                    <p>
                                        O link de redefinição parece inválido ou incompleto. Isso pode acontecer se ele
                                        estiver quebrado ou se já tiver sido utilizado.
                                    </p>
                                </div>
                                <Link
                                    href="/recuperar-senha"
                                    className="block text-center text-xs font-semibold text-[#f97316] underline-offset-4 hover:underline"
                                >
                                    Solicitar um novo link de redefinição
                                </Link>
                            </div>
                        ) : (
                            <form className="space-y-6" noValidate onSubmit={handleSubmit}>
                                <PasswordField
                                    label="Nova senha"
                                    placeholder="Digite a nova senha"
                                    startIcon={<HiOutlineLockClosed className="h-5 w-5" />}
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    error={errors.password}
                                />

                                <PasswordField
                                    label="Confirmar nova senha"
                                    placeholder="Repita a nova senha"
                                    startIcon={<HiOutlineLockClosed className="h-5 w-5" />}
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    error={errors.confirmPassword}
                                />

                                {formMessage && (
                                    <div
                                        className={`rounded-xl border p-4 text-xs text-center ${
                                            formMessage.type === 'error'
                                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        }`}
                                    >
                                        {formMessage.text}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-[#1a1a1d] text-white transition hover:bg-[#f97316] hover:text-[#1a1a1d] disabled:cursor-not-allowed disabled:bg-[#1a1a1d]/60"
                                >
                                    {isSubmitting ? 'Salvando nova senha...' : 'Salvar nova senha'}
                                </Button>

                                <p className="text-center text-xs text-[#6f6b63]">
                                    Lembrou sua senha?{' '}
                                    <Link
                                        href="/login"
                                        className="font-semibold text-[#f97316] underline-offset-4 hover:underline"
                                    >
                                        Voltar para o login
                                    </Link>
                                </p>
                            </form>
                        )}
                    </AuthCard>
                </div>
            </Container>
        </main>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen bg-[#faf7f0] py-12">
                    <Container>
                        <div className="mx-auto max-w-lg animate-pulse space-y-6">
                            <div className="h-8 w-2/3 rounded bg-[#e5dfd4]" />
                            <div className="h-4 w-full rounded bg-[#e5dfd4]" />
                            <div className="h-64 w-full rounded-3xl bg-[#e5dfd4]" />
                        </div>
                    </Container>
                </main>
            }
        >
            <ResetPasswordContent />
        </Suspense>
    );
}

