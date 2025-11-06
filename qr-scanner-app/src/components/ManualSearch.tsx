import { useState } from 'react';
import { getTicketByCode, validateTicket } from '../services/validationService';
import { useValidationStore } from '../store/validationStore';
import ValidationResult from './ValidationResult';
import { ValidationResult as ValidationResultType } from '../types';

const ManualSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addToHistory = useValidationStore((state) => state.addToHistory);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Digite um código ou CPF');
      return;
    }

    setIsSearching(true);
    setError(null);
    setValidationResult(null);

    try {
      // Remove espaços e formata
      const code = searchTerm.trim().toUpperCase().replace(/\s/g, '');

      // Busca o ingresso
      const ticket = await getTicketByCode(code);

      if (!ticket) {
        setError('Ingresso não encontrado');
        setIsSearching(false);
        return;
      }

      // Se encontrou, valida
      const result = await validateTicket(ticket.code);

      setValidationResult(result);

      // Adiciona ao histórico
      addToHistory({
        id: Date.now().toString(),
        ticketCode: ticket.code,
        ticketHolder: ticket.holder?.name || 'N/A',
        eventName: ticket.event?.name || 'N/A',
        status: result.success ? 'success' : 'error',
        message: result.message,
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.error('Erro ao buscar ingresso:', err);
      setError('Erro ao buscar ingresso. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="manual-search">
      <div className="search-container">
        <h2>Buscar Ingresso</h2>
        <p className="search-hint">Digite o código do ingresso (12 caracteres) ou CPF</p>

        <div className="search-input-group">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ex: ABC123456789"
            className="search-input"
            maxLength={12}
            disabled={isSearching}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchTerm.trim()}
            className="btn btn-primary"
          >
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {validationResult && (
          <div style={{ marginTop: '1rem' }}>
            <ValidationResult result={validationResult} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualSearch;

