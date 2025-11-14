import { cleanExpiredReservations } from './reservationService';

const CLEANUP_INTERVAL_MS = 60 * 1000; // Executar a cada 1 minuto

/**
 * Inicia o scheduler para cancelar automaticamente reservas expiradas
 */
export const startReservationExpirationScheduler = (): void => {
    console.log(
        `🕒 Reservation expiration scheduler ativo (interval=${CLEANUP_INTERVAL_MS}ms)`
    );

    // Executar imediatamente ao iniciar
    cleanExpiredReservations().catch((error) => {
        console.error('Erro na limpeza inicial de reservas expiradas:', error);
    });

    // Executar periodicamente
    setInterval(async () => {
        try {
            const result = await cleanExpiredReservations();
            if (result.success && result.cleanedCount > 0) {
                console.log(`✅ ${result.cleanedCount} reserva(s) expirada(s) cancelada(s) automaticamente`);
            }
        } catch (error) {
            console.error('Erro no scheduler de expiração de reservas:', error);
        }
    }, CLEANUP_INTERVAL_MS);
};

