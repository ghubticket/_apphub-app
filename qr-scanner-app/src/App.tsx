import { useState, useEffect, useCallback } from 'react';
import QRScanner from './components/QRScanner';
import ManualSearch from './components/ManualSearch';
import ValidationHistory from './components/ValidationHistory';
import Login from './components/Login';
import { useValidationStore } from './store/validationStore';
import { validateDeviceAccess, isSecureContext } from './utils/deviceDetection';
import { validateToken, isTokenExpired } from './utils/token';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { logger } from './utils/logger';

function App() {
  const [currentView, setCurrentView] = useState<'scanner' | 'search' | 'history'>('scanner');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;
    
    // Validar token antes de considerar autenticado
    if (!validateToken(token) || isTokenExpired(token)) {
      logger.warn('Token inválido ou expirado no mount, removendo...');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      return false;
    }
    
    return true;
  });
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const loadHistoryFromBackend = useValidationStore((state) => state.loadHistoryFromBackend);

  // Handler para logout quando sessão expira
  const handleSessionTimeout = useCallback(() => {
    logger.warn('Sessão expirada por inatividade');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
    setShowSessionWarning(false);
  }, []);

  // Handler para aviso de sessão
  const handleSessionWarning = useCallback((timeRemaining: number) => {
    const minutes = Math.floor(timeRemaining / 60000);
    logger.warn(`Sessão expirando em ${minutes} minutos`);
    setShowSessionWarning(true);
  }, []);

  // Timeout de sessão (apenas quando autenticado)
  const { minutesRemaining, showWarning } = useSessionTimeout({
    onTimeout: handleSessionTimeout,
    onWarning: handleSessionWarning,
    timeoutMs: 30 * 60 * 1000, // 30 minutos
    warningMs: 5 * 60 * 1000, // Aviso 5 min antes
    enabled: isAuthenticated, // Só ativar quando autenticado
  });

  // Validar dispositivo ao montar
  useEffect(() => {
    const validation = validateDeviceAccess();
    if (!validation.allowed) {
      setDeviceError(validation.message || 'Acesso negado');
    }
    
    // Validar contexto seguro (HTTPS)
    if (!isSecureContext()) {
      logger.warn('⚠️ Acesso via HTTP detectado. Câmera pode não funcionar.');
    }
  }, []);

  // Carregar histórico do backend quando autenticado
  useEffect(() => {
    if (isAuthenticated) {
      loadHistoryFromBackend();
    }
  }, [isAuthenticated, loadHistoryFromBackend]);

  const handleLogin = useCallback((token: string, refreshToken?: string) => {
    // Validar token antes de armazenar
    if (!validateToken(token)) {
      logger.error('Token inválido recebido no login');
      return;
    }
    
    localStorage.setItem('auth_token', token);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    setIsAuthenticated(true);
    setShowSessionWarning(false);
    // Histórico será carregado pelo useEffect acima
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
    setShowSessionWarning(false);
  }, []);

  // Mostrar erro se dispositivo não for permitido
  if (deviceError) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxWidth: '500px'
        }}>
          <h1 style={{ color: '#d32f2f', marginBottom: '1rem' }}>⚠️ Acesso Restrito</h1>
          <p style={{ color: '#666', fontSize: '1.1rem', lineHeight: '1.6' }}>
            {deviceError}
          </p>
          <p style={{ color: '#999', marginTop: '1rem', fontSize: '0.9rem' }}>
            Este aplicativo é exclusivo para dispositivos móveis e tablets.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={`app ${isScanning ? 'scanner-active' : ''}`}>
      {!isScanning && (
        <>
          <header className="app-header" hidden>
            <h1>EventHub - Validador</h1>
            <button onClick={handleLogout} className="btn btn-logout">
              Sair
            </button>
          </header>

          <nav className="app-nav">
            <button
              onClick={() => setCurrentView('scanner')}
              className={`nav-btn ${currentView === 'scanner' ? 'active' : ''}`}
            >
              Check-in
            </button>
            <button
              onClick={() => setCurrentView('search')}
              className={`nav-btn ${currentView === 'search' ? 'active' : ''}`}
            >
              Buscar
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`nav-btn ${currentView === 'history' ? 'active' : ''}`}
            >
              Histórico
            </button>
          </nav>
        </>
      )}

      <main className="app-main">
        {currentView === 'scanner' && <QRScanner onScanningChange={setIsScanning} />}
        {currentView === 'search' && <ManualSearch />}
        {currentView === 'history' && <ValidationHistory />}
      </main>

      {/* Aviso de sessão expirando */}
      {showSessionWarning && showWarning && (
        <div className="position-fixed top-0 start-0 end-0 p-3" style={{ zIndex: 9999 }}>
          <div className="alert alert-warning alert-dismissible fade show" role="alert">
            <strong>⚠️ Atenção:</strong> Sua sessão expirará em {minutesRemaining} minutos por inatividade.
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowSessionWarning(false)}
              aria-label="Fechar"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

