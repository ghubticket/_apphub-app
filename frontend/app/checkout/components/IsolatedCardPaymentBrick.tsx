'use client';

import { useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { CardPayment } from '@mercadopago/sdk-react';

// Flag global para garantir que o Brick seja montado apenas uma vez por sessão
declare global {
    interface Window {
        __MP_BRICK_MOUNTED__?: boolean;
        __MP_BRICK_ROOT__?: Root;
        __MP_BRICK_CONTAINER__?: HTMLDivElement;
        __MP_BRICK_RESET__?: () => void;
    }
}

interface IsolatedCardPaymentBrickProps {
    publicKey: string;
    amount: number;
    isVisible: boolean;
    onSubmit: (data: any) => Promise<void> | void;
    onReady: () => void;
    onError: (error: any) => void;
}

/**
 * Componente isolado que mantém o Mercado Pago Brick montado de forma persistente.
 * O Brick é renderizado em um container DOM persistente fora do ciclo de vida do React.
 * Isso evita erros de re-inicialização do Mercado Pago SDK causados por React Strict Mode.
 * 
 * IMPORTANTE: Este componente NUNCA deve ser desmontado. Ele persiste durante toda a sessão.
 */
export function IsolatedCardPaymentBrick({
    publicKey,
    amount,
    isVisible,
    onSubmit,
    onReady,
    onError,
}: IsolatedCardPaymentBrickProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const handlersRef = useRef({ onSubmit, onReady, onError });
    const amountRef = useRef(amount);

    // Atualizar handlers e amount quando mudarem (sem causar re-render do Brick)
    useEffect(() => {
        handlersRef.current = { onSubmit, onReady, onError };
        amountRef.current = amount;
    }, [onSubmit, onReady, onError, amount]);

    // Montar Brick apenas UMA VEZ por sessão em container persistente
    useEffect(() => {
        if (!publicKey) {
            return;
        }

        // Se já existe uma instância montada globalmente, apenas atualizar visibilidade e mover container
        if (window.__MP_BRICK_MOUNTED__ && window.__MP_BRICK_CONTAINER__ && wrapperRef.current) {
            // Mover container para o wrapper atual se necessário (evita remontagem)
            if (window.__MP_BRICK_CONTAINER__.parentElement !== wrapperRef.current) {
                wrapperRef.current.appendChild(window.__MP_BRICK_CONTAINER__);
            }
            // Atualizar visibilidade
            window.__MP_BRICK_CONTAINER__.style.display = isVisible ? 'block' : 'none';
            window.__MP_BRICK_CONTAINER__.style.visibility = isVisible ? 'visible' : 'hidden';
            return;
        }

        // Criar container persistente para o Brick
        const createPersistentContainer = () => {
            if (!wrapperRef.current || window.__MP_BRICK_MOUNTED__) {
                return;
            }

            // Criar container DOM que nunca será removido
            const container = document.createElement('div');
            container.className = 'w-full';
            container.style.display = isVisible ? 'block' : 'none';
            container.style.visibility = isVisible ? 'visible' : 'hidden';
            container.id = 'mp-brick-persistent-container';

            // Adicionar ao wrapper
            wrapperRef.current.appendChild(container);

            // Criar React Root para renderizar o Brick
            const root = createRoot(container);

            // Handlers que sempre usam a versão mais recente dos callbacks
            const handleSubmit = async (data: any) => {
                await handlersRef.current.onSubmit(data);
            };

            const handleReady = () => {
                handlersRef.current.onReady();
            };

            const handleError = (error: any) => {
                handlersRef.current.onError(error);
            };

            // Renderizar Brick no container persistente - APENAS UMA VEZ
            root.render(
                <CardPayment
                    initialization={{
                        amount: Number(amountRef.current.toFixed(2)),
                    }}
                    customization={{
                        visual: {
                            style: {
                                theme: 'flat',
                            },
                            texts: {
                                cardholderName: {
                                    label: 'Nome igual ao cartão',
                                    placeholder: 'Nome completo',
                                },
                                email: {
                                    label: 'E-mail para recibo',
                                    placeholder: 'email@testuser.com',
                                },
                            },
                        },
                    }}
                    onSubmit={handleSubmit}
                    onReady={handleReady}
                    onError={handleError}
                />
            );

            // Armazenar referências globais - NUNCA resetar
            window.__MP_BRICK_MOUNTED__ = true;
            window.__MP_BRICK_ROOT__ = root;
            window.__MP_BRICK_CONTAINER__ = container;
            
            // Função global para resetar o Brick (forçar re-render para limpar estado de erro)
            window.__MP_BRICK_RESET__ = () => {
                if (window.__MP_BRICK_ROOT__ && window.__MP_BRICK_CONTAINER__) {
                    // Re-renderizar o Brick com amount atualizado para forçar reset do estado interno
                    // Adicionar 0.01 e depois subtrair para forçar atualização sem mudar o valor real
                    const currentAmount = Number(amountRef.current.toFixed(2));
                    const tempAmount = currentAmount + 0.01;
                    
                    // Primeiro render com amount temporário
                    window.__MP_BRICK_ROOT__.render(
                        <CardPayment
                            initialization={{
                                amount: tempAmount,
                            }}
                            customization={{
                                visual: {
                                    style: {
                                        theme: 'flat',
                                    },
                                    texts: {
                                        cardholderName: {
                                            label: 'Nome igual ao cartão',
                                            placeholder: 'Nome completo',
                                        },
                                        email: {
                                            label: 'E-mail para recibo',
                                            placeholder: 'email@testuser.com',
                                        },
                                    },
                                },
                            }}
                            onSubmit={handleSubmit}
                            onReady={handleReady}
                            onError={handleError}
                        />
                    );
                    
                    // Depois voltar ao amount original (força reset completo)
                    setTimeout(() => {
                        if (window.__MP_BRICK_ROOT__) {
                            window.__MP_BRICK_ROOT__.render(
                                <CardPayment
                                    initialization={{
                                        amount: currentAmount,
                                    }}
                                    customization={{
                                        visual: {
                                            style: {
                                                theme: 'flat',
                                            },
                                            texts: {
                                                cardholderName: {
                                                    label: 'Nome igual ao cartão',
                                                    placeholder: 'Nome completo',
                                                },
                                                email: {
                                                    label: 'E-mail para recibo',
                                                    placeholder: 'email@testuser.com',
                                                },
                                            },
                                        },
                                    }}
                                    onSubmit={handleSubmit}
                                    onReady={handleReady}
                                    onError={handleError}
                                />
                            );
                        }
                    }, 50);
                }
            };
        };

        // Aguardar wrapper estar disponível
        if (wrapperRef.current) {
            createPersistentContainer();
        } else {
            const timer = setTimeout(() => {
                if (wrapperRef.current && !window.__MP_BRICK_MOUNTED__) {
                    createPersistentContainer();
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [publicKey, isVisible]);

    // Atualizar visibilidade quando mudar
    useEffect(() => {
        if (window.__MP_BRICK_CONTAINER__) {
            window.__MP_BRICK_CONTAINER__.style.display = isVisible ? 'block' : 'none';
            window.__MP_BRICK_CONTAINER__.style.visibility = isVisible ? 'visible' : 'hidden';
        }
    }, [isVisible]);

    if (!publicKey) {
        return null;
    }

    // Wrapper que apenas contém o container persistente
    return (
        <div
            ref={wrapperRef}
            className=""
        >
            {!window.__MP_BRICK_MOUNTED__ && (
                <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#635BF5] mx-auto" />
                        <p className="text-sm text-gray-600">Inicializando formulário de pagamento...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

