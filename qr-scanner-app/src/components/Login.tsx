import { useState } from 'react';
import api from '../config/api';
import './Login.css';

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
    <div className="login-container">
      <div className="login-card">
        <h1>EventHub</h1>
        <h2>Validador de Ingressos</h2>
        <p className="login-subtitle">Faça login para continuar</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              placeholder="qrcode@eventhub.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="btn btn-primary btn-block"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="login-hint">
          Apenas usuários com role <strong>QRCODE</strong> podem validar ingressos.
        </p>
      </div>
    </div>
  );
};

export default Login;

