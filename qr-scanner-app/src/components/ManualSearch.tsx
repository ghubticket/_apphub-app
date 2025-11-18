import { useState } from 'react';
import { getTicketByCode, validateTicket } from '../services/validationService';
import { useValidationStore } from '../store/validationStore';
import ValidationResult from './ValidationResult';
import { ValidationResult as ValidationResultType } from '../types';
import { sanitizeTicketCode, sanitizeCPF } from '../utils/sanitize';
import { logger } from '../utils/logger';

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
      // Sanitizar input (código de ingresso ou CPF)
      const sanitized = searchTerm.trim();
      const code = sanitized.length <= 12 
        ? sanitizeTicketCode(sanitized) 
        : sanitizeCPF(sanitized);

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
      logger.error('Erro ao buscar ingresso:', err);
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
      <div className="card">
        <div className="card-body">
          <h2 className="card-title">Buscar Ingresso</h2>
          <p className="card-text text-muted">Digite o código do ingresso (12 caracteres) ou CPF</p>

          <div className="input-group mb-3">
            <input
              type="text"
              className="form-control text-uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ex: ABC123456789"
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
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {validationResult && (
            <div className="mt-3">
              <ValidationResult result={validationResult} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManualSearch;

