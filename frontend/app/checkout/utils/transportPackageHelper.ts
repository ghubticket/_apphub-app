'use client';

import api from '@/lib/api';
import type { CartItem } from '@/lib/cart';

/**
 * Cria pacotes de transporte para itens do carrinho que são pacotes de transporte
 * @param orderId - ID do pedido criado
 * @param cartItems - Itens do carrinho
 * @param customerData - Dados do cliente
 */
export async function createTransportPackagesForOrder(
    orderId: string,
    cartItems: CartItem[],
    customerData: { name: string; email: string; cpf: string; phone: string; rg?: string }
): Promise<void> {
    // Filtrar apenas itens de transporte (nova estrutura com metadata ou estrutura antiga)
    const transportItems = cartItems.filter((item) => 
        item.metadata?.isTransport === true || item.isTransportPackage
    );

    if (transportItems.length === 0) {
        return; // Nenhum pacote de transporte para criar
    }

    // Criar um pacote para cada quantidade de cada item de transporte
    const promises: Promise<void>[] = [];
    
    transportItems.forEach((item) => {
        if (!item.eventId) {
            return;
        }

        // Tentar usar nova estrutura (transportOption do metadata)
        let transportOption: { date: string; attraction: string; departureLocation: string } | null = null;
        
        if (item.metadata?.transportOption && typeof item.metadata.transportOption === 'string') {
            try {
                transportOption = JSON.parse(item.metadata.transportOption);
            } catch (e) {
                console.error('[TransportPackage] Erro ao parsear transportOption:', e);
            }
        }

        // Se não tiver nova estrutura, tentar estrutura antiga (transportPackageData ou departureLocation)
        if (!transportOption && item.transportPackageData) {
            // Estrutura antiga com transportPackageData
            for (let i = 0; i < item.quantity; i++) {
                promises.push(
                    (async () => {
                        try {
                            const response = await api.post('/transport-packages', {
                                eventId: item.eventId,
                                eventDate: item.transportPackageData!.eventDate,
                                departureLocationName: item.transportPackageData!.departureLocation.name,
                                packageType: item.transportPackageData!.packageType,
                                passengerData: {
                                    name: customerData.name,
                                    phone: customerData.phone,
                                    rg: customerData.rg || '',
                                    cpf: customerData.cpf,
                                },
                                orderId,
                            });

                            if (response.data?.success) {
                                console.log('[TransportPackage] Pacote criado com sucesso:', response.data.data);
                            }
                        } catch (error: any) {
                            console.error('[TransportPackage] Erro ao criar pacote:', error);
                        }
                    })()
                );
            }
            return;
        }

        // Nova estrutura: criar pacote para cada quantidade
        if (transportOption && transportOption.date && transportOption.attraction && transportOption.departureLocation) {
            for (let i = 0; i < item.quantity; i++) {
                promises.push(
                    (async () => {
                        try {
                            // Formato do packageType: "TRANSPORTE IDA E VOLTA - [ATRAÇÃO]"
                            const packageType = `TRANSPORTE IDA E VOLTA - ${transportOption.attraction}`;
                            
                            const response = await api.post('/transport-packages', {
                                eventId: item.eventId,
                                eventDate: transportOption.date,
                                departureLocationName: transportOption.departureLocation,
                                packageType,
                                passengerData: {
                                    name: customerData.name,
                                    phone: customerData.phone,
                                    rg: customerData.rg || '',
                                    cpf: customerData.cpf,
                                },
                                orderId,
                            });

                            if (response.data?.success) {
                                console.log('[TransportPackage] Pacote criado com sucesso:', response.data.data);
                            }
                        } catch (error: any) {
                            console.error('[TransportPackage] Erro ao criar pacote:', error);
                        }
                    })()
                );
            }
        } else if (item.metadata?.departureLocation && typeof item.metadata.departureLocation === 'string') {
            // Estrutura antiga: só tem departureLocation (sem data/atração específica)
            for (let i = 0; i < item.quantity; i++) {
                promises.push(
                    (async () => {
                        try {
                            const response = await api.post('/transport-packages', {
                                eventId: item.eventId,
                                eventDate: item.date || new Date().toISOString().split('T')[0],
                                departureLocationName: item.metadata!.departureLocation as string,
                                packageType: 'TRANSPORTE IDA E VOLTA',
                                passengerData: {
                                    name: customerData.name,
                                    phone: customerData.phone,
                                    rg: customerData.rg || '',
                                    cpf: customerData.cpf,
                                },
                                orderId,
                            });

                            if (response.data?.success) {
                                console.log('[TransportPackage] Pacote criado com sucesso:', response.data.data);
                            }
                        } catch (error: any) {
                            console.error('[TransportPackage] Erro ao criar pacote:', error);
                        }
                    })()
                );
            }
        }
    });

    await Promise.allSettled(promises);
}

