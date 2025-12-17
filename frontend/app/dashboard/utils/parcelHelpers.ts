import type { ParcelSummary, ParcelledOrderWithParcels, ParcelledOrderStatus } from '../types/parcelled';

/**
 * Verifica se uma parcela está atrasada
 */
export function isParcelOverdue(parcel: ParcelSummary): boolean {
    if (parcel.status === 'paid' || parcel.status === 'cancelled') {
        return false;
    }
    
    const dueDate = new Date(parcel.dueDate);
    const now = new Date();
    return now > dueDate;
}

/**
 * Conta quantas parcelas estão atrasadas
 */
export function countOverdueParcels(parcels: ParcelSummary[]): number {
    return parcels.filter(isParcelOverdue).length;
}

/**
 * Verifica se o pedido deve ser cancelado (2+ parcelas atrasadas)
 */
export function shouldCancelOrder(parcels: ParcelSummary[]): boolean {
    return countOverdueParcels(parcels) >= 2;
}

/**
 * Encontra a próxima parcela a vencer
 */
export function getNextParcel(parcels: ParcelSummary[]): ParcelSummary | null {
    const unpaidParcels = parcels
        .filter(p => p.status === 'pending' || p.status === 'payment_generated')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    return unpaidParcels[0] || null;
}

/**
 * Encontra a parcela de entrada (sequence 0)
 */
export function getEntryParcel(parcels: ParcelSummary[]): ParcelSummary | null {
    return parcels.find(p => p.sequence === 0) || null;
}

/**
 * Calcula o progresso do pagamento (porcentagem)
 */
export function calculatePaymentProgress(parcels: ParcelSummary[]): number {
    if (parcels.length === 0) return 0;
    
    const paidCount = parcels.filter(p => p.status === 'paid').length;
    return (paidCount / parcels.length) * 100;
}

/**
 * Conta parcelas pagas
 */
export function countPaidParcels(parcels: ParcelSummary[]): number {
    return parcels.filter(p => p.status === 'paid').length;
}

/**
 * Verifica se a entrada foi paga
 */
export function isEntryPaid(parcels: ParcelSummary[]): boolean {
    const entry = getEntryParcel(parcels);
    return entry ? entry.status === 'paid' : false;
}

/**
 * Verifica se todas as parcelas foram pagas
 */
export function areAllParcelsPaid(parcels: ParcelSummary[]): boolean {
    return parcels.every(p => p.status === 'paid');
}

/**
 * Calcula quantos dias faltam para o vencimento
 */
export function getDaysUntilDue(dueDate: string): number {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Verifica se a parcela está próxima do vencimento (menos de 3 dias)
 */
export function isParcelDueSoon(parcel: ParcelSummary): boolean {
    const daysUntilDue = getDaysUntilDue(parcel.dueDate);
    return daysUntilDue <= 3 && daysUntilDue > 0;
}

/**
 * Formata o nome da parcela
 */
export function getParcelLabel(parcel: ParcelSummary, totalParcels: number): string {
    if (parcel.sequence === 0) {
        return 'Entrada';
    }
    return `Parcela ${parcel.sequence}/${totalParcels - 1}`;
}

/**
 * Determina se pode gerar PIX para uma parcela
 */
export function canGeneratePixForParcel(
    parcel: ParcelSummary, 
    isEntryPaidValue: boolean
): boolean {
    // Entrada pode sempre gerar PIX se estiver pendente
    if (parcel.sequence === 0) {
        return parcel.status === 'pending' || parcel.status === 'payment_generated';
    }
    
    // Outras parcelas só podem gerar PIX se entrada estiver paga
    return isEntryPaidValue && (parcel.status === 'pending' || parcel.status === 'payment_generated');
}

/**
 * Ordena parcelas por sequência
 */
export function sortParcelsBySequence(parcels: ParcelSummary[]): ParcelSummary[] {
    return [...parcels].sort((a, b) => a.sequence - b.sequence);
}

/**
 * Valida se a data de expiração é válida
 */
export function isValidExpirationDate(expiresAt: string | null | undefined): boolean {
    if (!expiresAt) return false;
    
    try {
        const date = new Date(expiresAt);
        return !isNaN(date.getTime()) && date > new Date();
    } catch {
        return false;
    }
}

/**
 * Calcula mensagem de alerta baseado no status do pedido
 */
export function getOrderAlertMessage(order: ParcelledOrderWithParcels): string | null {
    const overdueCount = countOverdueParcels(order.parcels);
    
    if (order.status === 'pending_entry') {
        const entry = getEntryParcel(order.parcels);
        if (entry && isParcelDueSoon(entry)) {
            return '⚠️ A entrada expira em breve! Pague agora para não perder seu pedido';
        }
        return '⏰ Pague a entrada para efetivar seu pedido e liberar as demais parcelas';
    }
    
    if (order.status === 'completed') {
        return '🎉 Parabéns! Todas as parcelas pagas. Seus ingressos estão disponíveis!';
    }
    
    if (overdueCount >= 2) {
        return '🚨 ATENÇÃO! 2 ou mais parcelas atrasadas cancelam o pedido automaticamente';
    }
    
    if (overdueCount > 0) {
        return '⚠️ Parcela(s) em atraso! Pague para não perder seus ingressos';
    }
    
    return null;
}

/**
 * Determina a cor do alerta
 */
export function getAlertColor(order: ParcelledOrderWithParcels): 'green' | 'amber' | 'red' | 'blue' {
    if (order.status === 'completed') return 'green';
    if (order.status === 'cancelled') return 'red';
    
    const overdueCount = countOverdueParcels(order.parcels);
    if (overdueCount >= 2) return 'red';
    if (overdueCount > 0) return 'amber';
    
    return 'blue';
}
