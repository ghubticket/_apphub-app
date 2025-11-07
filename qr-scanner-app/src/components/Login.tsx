import { useState } from 'react';
import api from '../config/api';

interface LoginProps {
    onLogin: (token: string) => void;
}

const Login = ({ onLogin }: LoginProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const response = await api.post('/auth/login', {
                email,
                password,
            });

            console.log('Resposta do login:', response.data);

            if (response.data.success) {
                // O backend retorna accessToken ou token
                const token = response.data.data?.accessToken || response.data.data?.token;

                if (token) {
                    console.log('Token encontrado, fazendo login...');
                    onLogin(token);
                } else {
                    console.error('Token não encontrado na resposta:', response.data);
                    setError('Erro: Token não recebido do servidor');
                }
            } else {
                setError(response.data.message || 'Credenciais inválidas');
            }
        } catch (err: any) {
            console.error('Erro ao fazer login:', err);

            // Tratamento específico para erro de conexão
            if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
                setError(
                    'Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3001.'
                );
            } else {
                setError(
                    err.response?.data?.message ||
                    err.response?.data?.errors?.[0] ||
                    'Erro ao fazer login. Verifique suas credenciais.'
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1rem' }}>
            <div className="card shadow-lg" style={{ maxWidth: '400px', width: '100%' }}>
                <div className="card-body p-4">
                    <h1 className="text-center text-primary mb-2" style={{ fontSize: '2rem' }}>EventHub</h1>
                    <h2 className="text-center text-dark mb-2" style={{ fontSize: '1.2rem', fontWeight: '400' }}>Validador de Ingressos</h2>
                    <p className="text-center text-muted mb-4">Faça login para continuar</p>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="email" className="form-label fw-semibold">Email</label>
                            <input
                                type="email"
                                id="email"
                                className="form-control"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                placeholder="qrcode@eventhub.com"
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="password" className="form-label fw-semibold">Senha</label>
                            <input
                                type="password"
                                id="password"
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="alert alert-danger" role="alert">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !email || !password}
                            className="btn btn-primary w-100 mt-2"
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Entrando...
                                </>
                            ) : (
                                'Entrar'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-muted mt-4 mb-0" style={{ fontSize: '0.85rem' }}>
                        Apenas usuários com role <strong className="text-primary">QRCODE</strong> podem validar ingressos.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;

