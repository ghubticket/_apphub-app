import { useState } from 'react';
import QRScanner from './components/QRScanner';
import ManualSearch from './components/ManualSearch';
import ValidationHistory from './components/ValidationHistory';
import Login from './components/Login';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState<'scanner' | 'search' | 'history'>('scanner');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('auth_token');
  });

  const handleLogin = (token: string) => {
    localStorage.setItem('auth_token', token);
    setIsAuthenticated(true);
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

