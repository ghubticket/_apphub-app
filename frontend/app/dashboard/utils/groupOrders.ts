import type { OrderSummary, OrderGroup, OrderEventSummary } from '../types';

// Função para agrupar pedidos pagos do mesmo evento
// Pedidos PENDING são mantidos separados (fluxo de checkout ativo)
export function groupOrdersByEvent(orders: OrderSummary[]): Array<OrderSummary | OrderGroup> {
    // Separar pedidos pagos e pendentes
    const paidOrders = orders.filter((order) => order.status === 'paid');
    const pendingOrders = orders.filter((order) => order.status !== 'paid');

    // Agrupar pedidos pagos por evento
    const groupsMap = new Map<string, OrderSummary[]>();

    paidOrders.forEach((order) => {
        // Extrair eventId de diferentes formatos possíveis
        let eventId: string = 'unknown';

        if (order.event) {
            if (typeof order.event === 'string') {
                // Se event é uma string (ObjectId não populado)
                eventId = order.event;
            } else if (typeof order.event === 'object') {
                // Se event é um objeto populado
                const eventObj = order.event as OrderEventSummary;
                eventId = eventObj._id || eventObj.id || 'unknown';
            }
        }

        if (!groupsMap.has(eventId)) {
            groupsMap.set(eventId, []);
        }
        groupsMap.get(eventId)!.push(order);
    });

    // Criar grupos consolidados
    const groups: OrderGroup[] = [];
    groupsMap.forEach((groupOrders, eventId) => {
        if (groupOrders.length > 1) {
            // Só agrupar se houver mais de 1 pedido
            const firstOrder = groupOrders[0];
            const totalAmount = groupOrders.reduce((sum, o) => sum + o.totalAmount, 0);
            const totalTickets = groupOrders.reduce((sum, o) => sum + o.totalTickets, 0);
            const paymentMethods = [
                ...new Set(
                    groupOrders.map((o) => o.paymentMethod).filter((m): m is string => Boolean(m)),
                ),
            ];
            const createdAts = groupOrders
                .map((o) => o.createdAt)
                .filter((d): d is string => Boolean(d))
                .sort();

            groups.push({
                eventId,
                eventName: firstOrder.event?.name || 'Evento não informado',
                eventDate: firstOrder.event?.date,
                eventLocation: firstOrder.event?.location || firstOrder.event?.address,
                orders: groupOrders.sort((a, b) => {
                    // Ordenar por data de criação (mais recente primeiro)
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                }),
                totalAmount,
                totalTickets,
                paymentMethods,
                earliestCreatedAt: createdAts[createdAts.length - 1],
                latestCreatedAt: createdAts[0],
            });
        } else {
            // Se só tem 1 pedido, não agrupar (adicionar como pedido individual)
            pendingOrders.push(groupOrders[0]);
        }
    });

    // Combinar: grupos primeiro, depois pedidos pendentes/individuais
    // Ordenar por data (mais recente primeiro)
    const allItems: Array<OrderSummary | OrderGroup> = [...groups, ...pendingOrders];
    allItems.sort((a, b) => {
        const dateA = (a as OrderGroup).latestCreatedAt || (a as OrderSummary).createdAt || '';
        const dateB = (b as OrderGroup).latestCreatedAt || (b as OrderSummary).createdAt || '';
        const timeA = dateA ? new Date(dateA).getTime() : 0;
        const timeB = dateB ? new Date(dateB).getTime() : 0;
        return timeB - timeA;
    });

    return allItems;
}
