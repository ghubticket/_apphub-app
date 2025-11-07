import { useState, useEffect } from 'react';
import QRScanner from './components/QRScanner';
import ManualSearch from './components/ManualSearch';
import ValidationHistory from './components/ValidationHistory';
import Login from './components/Login';
import { useValidationStore } from './store/validationStore';
import { validateDeviceAccess, isSecureContext } from './utils/deviceDetection';

function App() {
  const [currentView, setCurrentView] = useState<'scanner' | 'search' | 'history'>('scanner');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('auth_token');
  });
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const loadHistoryFromBackend = useValidationStore((state) => state.loadHistoryFromBackend);

  // Validar dispositivo ao montar
  useEffect(() => {
    const validation = validateDeviceAccess();
    if (!validation.allowed) {
      setDeviceError(validation.message || 'Acesso negado');
    }
    
    // Validar contexto seguro (HTTPS)
    if (!isSecureContext()) {
      console.warn('⚠️ Acesso via HTTP detectado. Câmera pode não funcionar.');
    }
  }, []);

  // Carregar histórico do backend quando autenticado
  useEffect(() => {
    if (isAuthenticated) {
      loadHistoryFromBackend();
    }
  }, [isAuthenticated, loadHistoryFromBackend]);

  const handleLogin = (token: string) => {
    console.log('handleLogin chamado com token:', token ? 'Token presente' : 'Token ausente');
    localStorage.setItem('auth_token', token);
    setIsAuthenticated(true);
    console.log('Estado isAuthenticated atualizado para:', true);
    // Histórico será carregado pelo useEffect acima
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
  };

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
    <div className="app">
      <header className="app-header">
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
          Scanner
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

      <main className="app-main">
        {currentView === 'scanner' && <QRScanner />}
        {currentView === 'search' && <ManualSearch />}
        {currentView === 'history' && <ValidationHistory />}
      </main>
    </div>
  );
}

export default App;

