import AuthCard from '@/components/auth/AuthCard';

export default function CadastroPage() {
    return (
        <main
            className="flex w-full items-center justify-center bg-gradient-to-br from-primary to-primary-dark px-4 py-16"
            style={{ minHeight: 'calc(100vh - var(--app-header-height, 0px))' }}
        >
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 text-white">
                <div className="text-center">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                        Crie sua conta
                    </span>
                    <h1 className="mt-3 text-4xl font-bold uppercase tracking-[0.25em]">
                        Bem-vindo à 5521
                    </h1>
                </div>

                <AuthCard title="Nova Conta" description="Para continuar, preencha os seus dados.">
                    <p className="text-sm text-[#4c4c55]">
                        Aqui entra o conteúdo do formulário. Vamos adicionar os campos personalizados em seguida.
                    </p>
                </AuthCard>
            </div>
        </main>
    );
}