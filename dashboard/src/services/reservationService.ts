const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Obter quantidade disponível (pedidos PENDING já estão em soldQuantity)
export const getAvailableQuantity = async (
    eventId: string,
    ticketTypeId: string
): Promise<number> => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/ticket-types/${ticketTypeId}/available`
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Erro ao obter quantidade disponível: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data?.availableQuantity || 0;
    } catch (error: any) {
        return 0;
    }
};

// Obter quantidade disponível para múltiplos tipos de ingresso
export const getAvailableQuantities = async (
    eventId: string,
    ticketTypeIds: string[]
): Promise<Record<string, number>> => {
    try {
        const promises = ticketTypeIds.map((ticketTypeId) =>
            getAvailableQuantity(eventId, ticketTypeId).then((quantity) => ({
                ticketTypeId,
                quantity,
            }))
        );

        const results = await Promise.all(promises);

        return results.reduce((acc, { ticketTypeId, quantity }) => {
            acc[ticketTypeId] = quantity;
            return acc;
        }, {} as Record<string, number>);
    } catch (error: any) {
        return {};
    }
};
