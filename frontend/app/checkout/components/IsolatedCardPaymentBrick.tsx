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
            // CRÍTICO: Mover container para o wrapper atual se necessário (evita remontagem)
            // Isso garante que o container esteja sempre no lugar correto quando o componente é renderizado
            if (window.__MP_BRICK_CONTAINER__.parentElement !== wrapperRef.current) {
                wrapperRef.current.appendChild(window.__MP_BRICK_CONTAINER__);
            }
            // CRÍTICO: Sempre tornar visível quando componente é montado e isVisible é true
            // Isso resolve o problema de o formulário não aparecer às vezes
            if (isVisible) {
                window.__MP_BRICK_CONTAINER__.style.display = 'block';
                window.__MP_BRICK_CONTAINER__.style.visibility = 'visible';
                // Forçar reflow para garantir que o estilo seja aplicado
                window.__MP_BRICK_CONTAINER__.offsetHeight;
            } else {
                window.__MP_BRICK_CONTAINER__.style.display = 'none';
                window.__MP_BRICK_CONTAINER__.style.visibility = 'hidden';
            }
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
                // CRÍTICO: Verificar se o container existe e está no DOM antes de resetar
                if (!window.__MP_BRICK_ROOT__ || !window.__MP_BRICK_CONTAINER__) {
                    console.warn('[Brick Reset] ⚠️ Container ou root não encontrado, não é possível resetar');
                    return;
                }
                
                // Verificar se o container está no DOM
                const containerInBody = document.body.contains(window.__MP_BRICK_CONTAINER__);
                const containerInWrapper = wrapperRef.current?.contains(window.__MP_BRICK_CONTAINER__);
                
                if (!containerInBody && !containerInWrapper) {
                    // Tentar encontrar o wrapper de outra forma (pode estar em outro lugar do DOM)
                    const form = document.getElementById('checkout-card-form');
                    const wrapperFromForm = form?.closest('form')?.parentElement?.querySelector('[ref]') || 
                                          form?.parentElement?.querySelector('div[class*="w-full"]');
                    
                    if (wrapperFromForm && wrapperFromForm instanceof HTMLElement) {
                        console.log('[Brick Reset] 🔍 Wrapper encontrado via busca no DOM, movendo container');
                        wrapperFromForm.appendChild(window.__MP_BRICK_CONTAINER__);
                    } else if (wrapperRef.current) {
                        console.log('[Brick Reset] 🔍 Movendo container para wrapper atual');
                        wrapperRef.current.appendChild(window.__MP_BRICK_CONTAINER__);
                    } else {
                        // Se não encontrar o wrapper, apenas limpar os campos sem re-renderizar o Brick
                        // Isso evita erros quando o componente não está montado
                        console.warn('[Brick Reset] ⚠️ Wrapper não encontrado, apenas limpando campos sem re-renderizar');
                        const formForReset = document.getElementById('checkout-card-form') as HTMLFormElement | null;
                        if (formForReset) {
                            formForReset.reset();
                            const allInputs = formForReset.querySelectorAll('input, textarea, select');
                            allInputs.forEach((input) => {
                                const htmlInput = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                                htmlInput.value = '';
                                if (htmlInput instanceof HTMLInputElement || htmlInput instanceof HTMLTextAreaElement) {
                                    htmlInput.defaultValue = '';
                                    htmlInput.removeAttribute('value');
                                }
                                htmlInput.setAttribute('autocomplete', 'new-password');
                            });
                        }
                        return; // Não tentar re-renderizar o Brick se o wrapper não existe
                    }
                }
                
                // CRÍTICO: Tornar o container visível antes de resetar para evitar erros do Brick
                if (window.__MP_BRICK_CONTAINER__) {
                    window.__MP_BRICK_CONTAINER__.style.display = 'block';
                    window.__MP_BRICK_CONTAINER__.style.visibility = 'visible';
                    // Forçar reflow para garantir que o estilo seja aplicado
                    window.__MP_BRICK_CONTAINER__.offsetHeight;
                }
                
                if (window.__MP_BRICK_ROOT__ && window.__MP_BRICK_CONTAINER__) {
                    // Função auxiliar para limpar todos os campos do formulário de forma agressiva
                    const clearAllFormFields = () => {
                        const form = document.getElementById('checkout-card-form') as HTMLFormElement | null;
                        if (form) {
                            // Limpar todos os inputs, textareas e selects dentro do form
                            const allInputs = form.querySelectorAll('input, textarea, select');
                            allInputs.forEach((input) => {
                                const htmlInput = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                                
                                // Limpar valor atual
                                htmlInput.value = '';
                                
                                // Limpar valor padrão
                                if (htmlInput instanceof HTMLInputElement || htmlInput instanceof HTMLTextAreaElement) {
                                    htmlInput.defaultValue = '';
                                    // Limpar também atributos que podem conter valores
                                    htmlInput.removeAttribute('value');
                                }
                                
                                // Desabilitar autocomplete
                                htmlInput.setAttribute('autocomplete', 'off');
                                htmlInput.setAttribute('autocomplete', 'new-password'); // Truque para evitar autofill do Chrome
                                
                                // Disparar eventos para notificar o Brick
                                htmlInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                                htmlInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                                htmlInput.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
                                
                                // Tentar limpar via setter se disponível
                                try {
                                    Object.defineProperty(htmlInput, 'value', {
                                        value: '',
                                        writable: true,
                                        configurable: true,
                                    });
                                } catch (e) {
                                    // Ignorar erros
                                }
                            });
                            
                            // Limpar também dentro do container do Brick (pode ter shadow DOM)
                            const brickContainer = form.querySelector('[data-testid="card-form"]') || 
                                                  form.querySelector('.mp-card-form') ||
                                                  form.querySelector('[class*="mp-"]') ||
                                                  form;
                            if (brickContainer) {
                                const containerInputs = brickContainer.querySelectorAll('input, textarea, select');
                                containerInputs.forEach((input) => {
                                    const htmlInput = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                                    htmlInput.value = '';
                                    if (htmlInput instanceof HTMLInputElement || htmlInput instanceof HTMLTextAreaElement) {
                                        htmlInput.defaultValue = '';
                                        htmlInput.removeAttribute('value');
                                    }
                                    htmlInput.setAttribute('autocomplete', 'off');
                                    htmlInput.setAttribute('autocomplete', 'new-password');
                                    htmlInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                                    htmlInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                                });
                            }
                            
                            // Resetar o formulário novamente após limpar campos individuais
                            form.reset();
                        }
                    };

                    // Limpar campos antes do reset
                    clearAllFormFields();

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
                    
                    // Limpar campos após primeiro render
                    setTimeout(() => {
                        clearAllFormFields();
                    }, 25);
                    
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
                            
                            // Limpar campos após segundo render (garantir limpeza completa)
                            setTimeout(() => {
                                clearAllFormFields();
                                
                                // Limpar novamente após um delay maior para garantir que o Brick terminou de renderizar
                                setTimeout(() => {
                                    clearAllFormFields();
                                }, 150);
                            }, 50);
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

    // CRÍTICO: Garantir que o container seja sempre movido para o wrapper e visível quando necessário
    // Isso resolve o problema de o formulário não aparecer quando o componente é remontado
    useEffect(() => {
        if (!window.__MP_BRICK_MOUNTED__ || !window.__MP_BRICK_CONTAINER__) {
            return;
        }

        // Função para mover container e atualizar visibilidade
        const updateContainer = () => {
            if (!wrapperRef.current || !window.__MP_BRICK_CONTAINER__) {
                return;
            }

            // CRÍTICO: Mover container para o wrapper atual se necessário
            // Isso garante que o container esteja sempre no lugar correto quando o componente é renderizado
            if (window.__MP_BRICK_CONTAINER__.parentElement !== wrapperRef.current) {
                wrapperRef.current.appendChild(window.__MP_BRICK_CONTAINER__);
            }

            // Atualizar visibilidade
            if (isVisible) {
                window.__MP_BRICK_CONTAINER__.style.display = 'block';
                window.__MP_BRICK_CONTAINER__.style.visibility = 'visible';
                // Forçar reflow para garantir que o estilo seja aplicado
                window.__MP_BRICK_CONTAINER__.offsetHeight;
            } else {
                window.__MP_BRICK_CONTAINER__.style.display = 'none';
                window.__MP_BRICK_CONTAINER__.style.visibility = 'hidden';
            }
        };

        // Verificar imediatamente
        updateContainer();

        // Verificar novamente após um pequeno delay para garantir que o DOM esteja pronto
        // Isso resolve problemas de timing quando o componente é remontado rapidamente
        const timeout = setTimeout(updateContainer, 50);
        
        // Verificar também após um delay maior para garantir que tudo esteja pronto
        const timeout2 = setTimeout(updateContainer, 200);

        return () => {
            clearTimeout(timeout);
            clearTimeout(timeout2);
        };
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

