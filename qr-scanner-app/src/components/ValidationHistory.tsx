import { useEffect } from 'react';
import { useValidationStore } from '../store/validationStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ValidationHistory = () => {
  const history = useValidationStore((state) => state.getRecentHistory(50));
  const clearHistory = useValidationStore((state) => state.clearHistory);
  const loadHistoryFromBackend = useValidationStore((state) => state.loadHistoryFromBackend);
  const isLoading = useValidationStore((state) => state.isLoading);

  // Carregar histórico do backend ao montar o componente
  useEffect(() => {
    loadHistoryFromBackend();
  }, [loadHistoryFromBackend]);

  return (
    <div className="validation-history">
      <div className="history-header">
        <h2>Histórico de Validações</h2>
        {history.length > 0 && (
          <button onClick={clearHistory} className="btn btn-secondary">
            Limpar
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="empty-history">
          <p>Carregando histórico...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="empty-history">
          <p>Nenhuma validação realizada ainda.</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <div
              key={item.id}
              className={`history-item ${item.status === 'success' ? 'success' : 'error'}`}
            >
              <div className="history-item-header">
                <span className="history-status">
                  {item.status === 'success' ? '✅' : '❌'}
                </span>
                <span className="history-time">
                  {format(new Date(item.timestamp), "HH:mm:ss", { locale: ptBR })}
                </span>
              </div>
              <div className="history-item-body">
                <p className="history-code">Código: {item.ticketCode}</p>
                <p className="history-holder">Portador: {item.ticketHolder}</p>
                <p className="history-event">Evento: {item.eventName}</p>
                <p className="history-message">{item.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ValidationHistory;

