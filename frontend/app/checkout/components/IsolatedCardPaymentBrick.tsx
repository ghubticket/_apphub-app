'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { CardPayment } from '@mercadopago/sdk-react';

// Flag global para garantir que o Brick seja montado apenas uma vez por sessão
declare global {
    interface Window {
        __MP_BRICK_MOUNTED__?: boolean;
        __MP_BRICK_ROOT__?: Root;
        __MP_BRICK_CONTAINER__?: HTMLDivElement;
        __MP_BRICK_RESET__?: () => void;
        __MP_BRICK_RESET_VISIBILITY_REF__?: () => void;
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
    const previousIsVisibleRef = useRef(isVisible);
    const recreateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Atualizar handlers e amount quando mudarem (sem causar re-render do Brick)
    useEffect(() => {
        handlersRef.current = { onSubmit, onReady, onError };
        amountRef.current = amount;
    }, [onSubmit, onReady, onError, amount]);

    // Montar Brick apenas UMA VEZ por sessão em container persistente
    // Criar container persistente para o Brick
    const createPersistentContainer = useCallback(() => {
        // CRÍTICO: Verificar se o componente ainda está montado antes de criar container
        if (!wrapperRef.current) {
            console.log('[IsolatedCardPaymentBrick] ⏸️ wrapperRef.current não está disponível, aguardando...');
            return;
        }
        
        // CRÍTICO: Verificar se o wrapper ainda está no DOM (componente pode estar sendo desmontado)
        if (!document.body.contains(wrapperRef.current)) {
            console.log('[IsolatedCardPaymentBrick] ⏸️ Wrapper não está no DOM, componente pode estar sendo desmontado');
            return;
        }
        
        if (window.__MP_BRICK_MOUNTED__) {
            console.log('[IsolatedCardPaymentBrick] ⏸️ Brick já está montado, pulando criação');
            return;
        }
        
        console.log('[IsolatedCardPaymentBrick] 🏗️ Criando novo container para o Brick');

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
            // Quando o Brick está pronto, tentar capturar o deviceId do SDK
            // O SDK do Mercado Pago pode ter definido window.MP_DEVICE_SESSION_ID neste momento
            if (typeof window !== 'undefined') {
                // Tentar múltiplas formas de obter o deviceId
                let deviceId: string | undefined;
                
                // 1. window.MP_DEVICE_SESSION_ID (mais comum)
                if (window.MP_DEVICE_SESSION_ID) {
                    deviceId = window.MP_DEVICE_SESSION_ID;
                }
                
                // 2. Tentar acessar através do objeto MercadoPago
                if (!deviceId && window.MercadoPago) {
                    try {
                        const mp = window.MercadoPago as any;
                        if (mp.getDeviceId && typeof mp.getDeviceId === 'function') {
                            deviceId = mp.getDeviceId();
                        } else if (mp.deviceId) {
                            deviceId = mp.deviceId;
                        } else if (mp.device_session_id) {
                            deviceId = mp.device_session_id;
                        }
                    } catch (error) {
                        // Ignorar erros silenciosamente
                    }
                }
                
                // 3. Tentar buscar no DOM (o SDK pode injetar)
                if (!deviceId) {
                    try {
                        const mpElements = document.querySelectorAll('[data-mp-device-id], [data-device-id]');
                        for (const element of Array.from(mpElements)) {
                            const id = element.getAttribute('data-mp-device-id') || element.getAttribute('data-device-id');
                            if (id && id.length > 10 && !id.startsWith('mp-')) {
                                deviceId = id;
                                break;
                            }
                        }
                    } catch (error) {
                        // Ignorar erros silenciosamente
                    }
                }
                
                // Salvar no localStorage se encontrado
                if (deviceId && deviceId.length > 10 && !deviceId.startsWith('mp-')) {
                    localStorage.setItem('mp-device-session-id', deviceId);
                    console.log('[IsolatedCardPaymentBrick] ✅ DeviceId capturado quando Brick ficou pronto:', deviceId.substring(0, 15) + '...');
                }
            }
            
            handlersRef.current.onReady();
        };

        const handleError = (error: any) => {
            handlersRef.current.onError(error);
        };

        // CRÍTICO: Verificar novamente se o container ainda está no DOM antes de renderizar
        // Isso previne o erro "Could not find the Brick container ID" quando o componente é desmontado rapidamente
        if (!document.body.contains(container)) {
            console.warn('[IsolatedCardPaymentBrick] ⚠️ Container não está mais no DOM antes da renderização, cancelando');
            return;
        }

        // Renderizar Brick no container persistente - APENAS UMA VEZ
        try {
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
            console.log('[IsolatedCardPaymentBrick] ✅ Brick renderizado com sucesso');
        } catch (error) {
            console.error('[IsolatedCardPaymentBrick] ❌ Erro ao renderizar Brick:', error);
            // Limpar referências globais em caso de erro
            window.__MP_BRICK_CONTAINER__ = undefined;
            window.__MP_BRICK_ROOT__ = undefined;
            window.__MP_BRICK_MOUNTED__ = false;
            return;
        }

        // Armazenar referências globais - NUNCA resetar
        window.__MP_BRICK_MOUNTED__ = true;
        window.__MP_BRICK_ROOT__ = root;
        window.__MP_BRICK_CONTAINER__ = container;
        
        // Função global para resetar o previousIsVisibleRef (usado quando orderId muda)
        window.__MP_BRICK_RESET_VISIBILITY_REF__ = () => {
            previousIsVisibleRef.current = false;
            console.log('[IsolatedCardPaymentBrick] ✅ previousIsVisibleRef resetado para false');
        };
        
        // Função global para resetar o Brick (forçar re-render para limpar estado de erro)
        window.__MP_BRICK_RESET__ = () => {
            // CRÍTICO: Verificar se o container existe e está no DOM antes de resetar
            if (!window.__MP_BRICK_ROOT__ || !window.__MP_BRICK_CONTAINER__) {
                console.warn('[Brick Reset] ⚠️ Container ou root não encontrado, não é possível resetar');
                return;
            }
            
            // Verificar se o container está no DOM
            if (!document.body.contains(window.__MP_BRICK_CONTAINER__)) {
                console.warn('[Brick Reset] ⚠️ Container não está no DOM, não é possível resetar');
                return;
            }
            
            try {
                // Forçar re-render do Brick para limpar estado de erro
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
                console.log('[Brick Reset] ✅ Brick resetado com sucesso');
            } catch (error) {
                console.error('[Brick Reset] ❌ Erro ao resetar Brick:', error);
            }
        };
    }, [isVisible, publicKey]);

    useEffect(() => {
        if (!publicKey) {
            return;
        }

        // Se já existe uma instância montada globalmente, verificar se o container ainda existe no DOM
        if (window.__MP_BRICK_MOUNTED__ && window.__MP_BRICK_CONTAINER__) {
            // CRÍTICO: Verificar se o container ainda está no DOM
            // Se não estiver, significa que foi removido (ex: quando foi para home) e precisa ser recriado
            const containerExists = document.body.contains(window.__MP_BRICK_CONTAINER__);
            
            if (!containerExists) {
                console.log('[IsolatedCardPaymentBrick] ⚠️ Container do Brick foi removido do DOM, limpando e recriando...');
                
                // CRÍTICO: Limpar completamente o Brick antigo antes de recriar
                // Isso evita que o SDK tente inicializar múltiplas vezes
                // IMPORTANTE: Desmontar de forma assíncrona para evitar race condition com React
                if (window.__MP_BRICK_ROOT__) {
                    const rootToUnmount = window.__MP_BRICK_ROOT__;
                    window.__MP_BRICK_ROOT__ = undefined;
                    
                    // Desmontar de forma assíncrona usando requestAnimationFrame para evitar race condition
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            try {
                                // Verificar se o root ainda existe antes de desmontar
                                if (rootToUnmount) {
                                    rootToUnmount.unmount();
                                    console.log('[IsolatedCardPaymentBrick] ✅ React Root desmontado');
                                }
                            } catch (error) {
                                console.warn('[IsolatedCardPaymentBrick] Erro ao desmontar React Root:', error);
                            }
                        }, 0);
                    });
                }
                
                // Resetar flags globais para forçar recriação
                window.__MP_BRICK_MOUNTED__ = false;
                window.__MP_BRICK_CONTAINER__ = undefined;
                
                // CRÍTICO: Aguardar um pouco para garantir que o SDK limpou completamente
                // Isso evita o erro "fields_setup_failed_after_3_tries" e "Could not find the Brick container ID"
                // Usar requestAnimationFrame + setTimeout para garantir que React terminou de renderizar
                requestAnimationFrame(() => {
                    recreateTimeoutRef.current = setTimeout(() => {
                        // Continuar para recriar o container após um pequeno delay
                        // CRÍTICO: Verificar se o componente ainda está montado antes de recriar
                        if (!window.__MP_BRICK_MOUNTED__ && wrapperRef.current) {
                            console.log('[IsolatedCardPaymentBrick] 🏗️ Recriando container após limpeza');
                            createPersistentContainer();
                        }
                        recreateTimeoutRef.current = null;
                    }, 300); // Aumentar delay para 300ms para garantir limpeza completa do SDK
                });
                
                // CRÍTICO: Retornar cleanup para evitar memory leaks
                return () => {
                    if (recreateTimeoutRef.current) {
                        clearTimeout(recreateTimeoutRef.current);
                        recreateTimeoutRef.current = null;
                    }
                };
            } else if (wrapperRef.current) {
                // Container existe e está no DOM, apenas atualizar visibilidade e mover container
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
                    
                    // CRÍTICO: Verificar se isVisible mudou de false para true antes de chamar onReady
                    // Isso evita chamadas desnecessárias quando já está visível
                    const wasVisible = previousIsVisibleRef.current;
                    if (!wasVisible && handlersRef.current.onReady) {
                        console.log('[IsolatedCardPaymentBrick] 🔄 Brick já montado e isVisible mudou para true, chamando onReady');
                        // Atualizar ref ANTES de chamar onReady
                        previousIsVisibleRef.current = isVisible;
                        // Pequeno delay para garantir que o DOM foi atualizado
                        setTimeout(() => {
                            handlersRef.current.onReady();
                        }, 50);
                    } else if (wasVisible) {
                        // Já estava visível, apenas atualizar o ref
                        previousIsVisibleRef.current = isVisible;
                    }
                } else {
                    window.__MP_BRICK_CONTAINER__.style.display = 'none';
                    window.__MP_BRICK_CONTAINER__.style.visibility = 'hidden';
                    // Atualizar ref quando fica invisível
                    previousIsVisibleRef.current = isVisible;
                }
                return;
            }
        }

        // Se chegou aqui, significa que o Brick não está montado, então criar
        // Aguardar wrapper estar disponível
        if (wrapperRef.current) {
            // CRÍTICO: Verificar se o wrapper ainda está no DOM antes de criar container
            if (document.body.contains(wrapperRef.current)) {
                createPersistentContainer();
            } else {
                console.log('[IsolatedCardPaymentBrick] ⏸️ Wrapper não está no DOM, aguardando...');
            }
        } else {
            const timer = setTimeout(() => {
                // CRÍTICO: Verificar se o wrapper existe E está no DOM antes de criar container
                if (wrapperRef.current && document.body.contains(wrapperRef.current) && !window.__MP_BRICK_MOUNTED__) {
                    createPersistentContainer();
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [publicKey, isVisible, createPersistentContainer]);

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

        // CRÍTICO: Detectar mudança de isVisible e chamar onReady quando necessário
        // Isso garante que o estado isCheckoutReady seja atualizado quando um novo pedido é criado
        const wasVisible = previousIsVisibleRef.current;
        const hasChanged = wasVisible !== isVisible;
        
        console.log('[IsolatedCardPaymentBrick] 🔍 Verificando isVisible:', { wasVisible, isVisible, hasChanged });
        
        // Se isVisible mudou de false para true, chamar onReady
        if (!wasVisible && isVisible && handlersRef.current.onReady) {
            console.log('[IsolatedCardPaymentBrick] 🔄 isVisible mudou de false para true, chamando onReady');
            // Atualizar ref ANTES de chamar onReady para evitar chamadas duplicadas
            previousIsVisibleRef.current = isVisible;
            
            // Pequeno delay para garantir que o DOM foi atualizado e o container está visível
            const readyTimeout = setTimeout(() => {
                console.log('[IsolatedCardPaymentBrick] ✅ Chamando onReady após mudança de isVisible');
                handlersRef.current.onReady();
            }, 150); // Delay um pouco maior para garantir que tudo está pronto
            
            // Verificar novamente após um pequeno delay para garantir que o DOM esteja pronto
            // Isso resolve problemas de timing quando o componente é remontado rapidamente
            const timeout = setTimeout(updateContainer, 50);
            
            // Verificar também após um delay maior para garantir que tudo esteja pronto
            const timeout2 = setTimeout(updateContainer, 200);

            return () => {
                clearTimeout(readyTimeout);
                clearTimeout(timeout);
                clearTimeout(timeout2);
            };
        }
        
        // CRÍTICO: Sempre atualizar o ref para refletir o valor atual de isVisible
        // Isso garante que na próxima renderização, a comparação seja correta
        previousIsVisibleRef.current = isVisible;

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

    return (
        <div ref={wrapperRef} className="w-full">
            {/* Container do Brick será injetado aqui pelo useEffect */}
            {!window.__MP_BRICK_MOUNTED__ && (
                <div className="flex h-[700px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
                    <div className="text-center">
                        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#635BF5] mx-auto" />
                        <p className="text-sm text-gray-600">Inicializando formulário de pagamento...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
