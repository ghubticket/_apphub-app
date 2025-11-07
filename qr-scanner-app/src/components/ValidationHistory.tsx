import { useEffect, useState } from 'react';
import { useValidationStore } from '../store/validationStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Select, { SingleValue } from 'react-select';

const ValidationHistory = () => {
    const history = useValidationStore((state) => state.history);
    const isLoading = useValidationStore((state) => state.isLoading);
    const pagination = useValidationStore((state) => state.pagination);
    const totalValidations = useValidationStore((state) => state.totalValidations);
    const validValidations = useValidationStore((state) => state.validValidations);
    const duplicateAttempts = useValidationStore((state) => state.duplicateAttempts);
    const search = useValidationStore((state) => state.search);
    const filter = useValidationStore((state) => state.filter);
    const loadHistoryFromBackend = useValidationStore((state) => state.loadHistoryFromBackend);
    const setSearch = useValidationStore((state) => state.setSearch);
    const setPage = useValidationStore((state) => state.setPage);
    const setFilter = useValidationStore((state) => state.setFilter);

    const [searchInput, setSearchInput] = useState(search);

    // Carregar histórico do backend ao montar o componente
    useEffect(() => {
        loadHistoryFromBackend();
    }, [loadHistoryFromBackend]);

    // Carregar quando página, busca ou filtro mudar
    useEffect(() => {
        loadHistoryFromBackend(pagination.page, pagination.limit, search, filter);
    }, [pagination.page, search, filter, loadHistoryFromBackend, pagination.limit]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
    };

    const handleClearSearch = () => {
        setSearchInput('');
        setSearch('');
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="validation-history">
            <div className="card mb-3">
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start">
                        <div>
                            <h2 className="card-title mb-3">QR Codes Validados</h2>
                            {totalValidations > 0 && (
                                <div className="d-flex flex-column gap-0">
                                    {validValidations > 0 && (
                                        <p className="text-success mb-0">
                                            <strong>{validValidations}</strong> {validValidations === 1 ? 'validação é válida' : 'validações são válidas'}
                                        </p>
                                    )}
                                    {duplicateAttempts > 0 && (
                                        <p className="text-danger mb-0">
                                            <strong>{duplicateAttempts}</strong> {duplicateAttempts === 1 ? 'validação foi duplicada' : 'validações foram duplicadas'}, ou tentativas de golpe
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Busca */}
            <div className="card mb-3">
                <div className="card-body">
                    <form onSubmit={handleSearch}>
                        <h5 className="card-title mb-3">Busca Inteligente</h5>
                        <div className="input-group position-relative">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="EX: Nome ou CPF:"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="btn-clear-search"
                                    aria-label="Limpar busca"
                                >
                                    ✕
                                </button>
                            )}
                            <button type="submit" className="btn btn-primary">
                                Buscar
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Filtros */}
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title mb-3">Filtre por:</h5>
                    <Select
                        id="status-filter"
                        value={{
                            value: filter,
                            label: filter === 'validated' ? 'Códigos Validados' : 'Códigos Já Validados'
                        }}
                        onChange={(option: SingleValue<{ value: string; label: string }>) => {
                            if (option) {
                                const newFilter = option.value as 'validated' | 'already_used' | 'all';
                                setFilter(newFilter);
                                setPage(1); // Resetar para primeira página ao mudar filtro
                            }
                        }}
                        options={[
                            { value: 'validated', label: 'Códigos Validados' },
                            { value: 'already_used', label: 'Códigos Já Validados' }
                        ]}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        isSearchable={false}
                        theme={(theme: any) => ({
                            ...theme,
                            colors: {
                                ...theme.colors,
                                primary: '#667eea',
                                primary25: '#f0f4ff',
                                primary50: '#e0e9ff',
                                primary75: '#d0deff',
                            },
                        })}
                    />
                </div>
            </div>



            {/* Lista de histórico */}
            {isLoading ? (
                <div className="card">
                    <div className="card-body text-center">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Carregando...</span>
                        </div>
                        <p className="mt-2 mb-0">Carregando histórico...</p>
                    </div>
                </div>
            ) : history.length === 0 ? (
                <div className="card">
                    <div className="card-body text-center">
                        <p className="card-text text-muted mb-0">
                            {search
                                ? 'Nenhuma validação encontrada para a busca realizada.'
                                : 'Nenhuma validação realizada ainda.'}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="d-flex flex-column gap-3 mb-4">
                        {history.map((item) => (
                            <div
                                key={item.id}
                                className={`card border-start border-2 ${
                                    item.status === 'success' ? 'border-success' : 'border-danger'
                                }`}
                            >
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                        <span className="fs-4">
                                            {item.status === 'success' ? '✅' : '❌'}
                                        </span>
                                        <span className="text-muted fw-bold">
                                            {format(new Date(item.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                        </span>
                                    </div>
                                    <div className="d-flex flex-column gap-0">
                                        <p className="mb-1"><strong>Código:</strong> <strong>{item.ticketCode}</strong></p>
                                        <p className="mb-1"><strong>Portador:</strong> {item.ticketHolder}</p>
                                        <p className="mb-1"><strong>Evento:</strong> {item.eventName}</p>
                                        <div className={`alert ${item.status === 'success' ? 'alert-success' : 'alert-danger'} mb-0 mt-2`}>
                                            <strong>{item.message}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Paginação */}
                    {pagination.totalPages > 1 && (
                        <nav aria-label="Paginação de validações">
                            <ul className="pagination justify-content-center">
                                <li className={`page-item ${!pagination.hasPrevPage || isLoading ? 'disabled' : ''}`}>
                                    <button
                                        className="page-link"
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={!pagination.hasPrevPage || isLoading}
                                    >
                                        ← Anterior
                                    </button>
                                </li>
                                <li className="page-item active">
                                    <span className="page-link">
                                        Página {pagination.page} de {pagination.totalPages}
                                    </span>
                                </li>
                                <li className={`page-item ${!pagination.hasNextPage || isLoading ? 'disabled' : ''}`}>
                                    <button
                                        className="page-link"
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={!pagination.hasNextPage || isLoading}
                                    >
                                        Próxima →
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    )}
                </>
            )}
        </div>
    );
};

export default ValidationHistory;
