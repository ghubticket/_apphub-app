import { ValidationResult as ValidationResultType } from '../types';

interface ValidationResultProps {
  result: ValidationResultType;
}

const ValidationResult = ({ result }: ValidationResultProps) => {
  const getStatusColor = () => {
    if (result.success) {
      return 'success';
    }
    if (result.alreadyUsed) {
      return 'error';
    }
    return 'warning';
  };

  const statusColor = getStatusColor();

  return (
    <div className={`validation-result ${statusColor}`}>
      <div className="validation-icon">
        {result.success ? (
          <span className="icon-success">✅</span>
        ) : result.alreadyUsed ? (
          <span className="icon-error">❌</span>
        ) : (
          <span className="icon-warning">⚠️</span>
        )}
      </div>

      <div className="validation-message">
        <h2>{result.message}</h2>
        
        {result.success && result.data && (
          <div className="ticket-info">
            <p><strong>Evento:</strong> {result.data.event?.name}</p>
            <p><strong>Portador:</strong> {result.data.holder?.name}</p>
            <p><strong>Tipo:</strong> {result.data.ticketType?.name}</p>
            <p className="success-text">✅ Entrada liberada!</p>
          </div>
        )}

        {result.alreadyUsed && (
          <div className="ticket-info error">
            <p><strong>Ingresso já utilizado</strong></p>
            {result.usedAt && (
              <p>Primeira validação: {new Date(result.usedAt).toLocaleString('pt-BR')}</p>
            )}
            {result.firstPassedHolder && (
              <p>Quem passou primeiro: <strong>{result.firstPassedHolder}</strong></p>
            )}
            {result.isHolderTryingToReuse && (
              <p className="warning-text">
                ⚠️ ATENÇÃO: Este ingresso pertence a você, mas foi usado por outra pessoa.
              </p>
            )}
          </div>
        )}

        {result.errors && result.errors.length > 0 && (
          <div className="validation-errors">
            <ul>
              {result.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidationResult;

