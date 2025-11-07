import { memo } from 'react';
import { ValidationResult as ValidationResultType } from '../types';

interface ValidationResultProps {
  result: ValidationResultType;
}

const ValidationResult = memo(({ result }: ValidationResultProps) => {
  return (
    <div className={`card border-start border-4 ${
      result.success ? 'border-success' : result.alreadyUsed ? 'border-danger' : 'border-warning'
    }`}>
      <div className="card-body">
        <div className="text-center mb-3">
          <span className="display-4 d-block">
            {result.success ? '✅' : result.alreadyUsed ? '❌' : '⚠️'}
          </span>
        </div>

        <h2 className="card-title text-center mb-4">{result.message}</h2>
        
        {result.success && result.data && (
          <div className="card bg-light">
            <div className="card-body">
              <p className="mb-2"><strong>Evento:</strong> {result.data.event?.name}</p>
              <p className="mb-2"><strong>Portador:</strong> {result.data.holder?.name}</p>
              <p className="mb-2"><strong>Tipo:</strong> {result.data.ticketType?.name}</p>
              <p className="text-success fw-bold fs-5 mb-0">✅ Entrada liberada!</p>
            </div>
          </div>
        )}

        {result.alreadyUsed && (
          <div className="alert alert-warning">
            <p className="mb-2"><strong>Ingresso já utilizado</strong></p>
            {result.usedAt && (
              <p className="mb-2">Primeira validação: {new Date(result.usedAt).toLocaleString('pt-BR')}</p>
            )}
            {result.firstPassedHolder && (
              <p className="mb-2">Quem passou primeiro: <strong>{result.firstPassedHolder}</strong></p>
            )}
            {result.isHolderTryingToReuse && (
              <p className="text-warning fw-bold mb-0">
                ⚠️ ATENÇÃO: Este ingresso pertence a você, mas foi usado por outra pessoa.
              </p>
            )}
          </div>
        )}

        {result.errors && result.errors.length > 0 && (
          <div className="alert alert-danger">
            <ul className="mb-0">
              {result.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
});

ValidationResult.displayName = 'ValidationResult';

export default ValidationResult;

