import { useState, useEffect } from 'react';
import QRScanner from './components/QRScanner';
import ManualSearch from './components/ManualSearch';
import ValidationHistory from './components/ValidationHistory';
import Login from './components/Login';
import { useValidationStore } from './store/validationStore';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState<'scanner' | 'search' | 'history'>('scanner');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('auth_token');
  });
  const loadHistoryFromBackend = useValidationStore((state) => state.loadHistoryFromBackend);

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

