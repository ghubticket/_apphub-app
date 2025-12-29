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
 * Conta parcelas não pagas (pending ou payment_generated)
 */
export function countUnpaidParcels(parcels: ParcelSummary[]): number {
    return parcels.filter(p => p.status !== 'paid').length;
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
 * IMPORTANTE: A entrada conta como a primeira parcela!
 * Exemplo: 6 parcelas = Entrada (1/6) + Parcela 2/6 + Parcela 3/6 + ... + Parcela 6/6
 */
export function getParcelLabel(parcel: ParcelSummary, totalParcels: number): string {
    if (parcel.sequence === 0) {
        // Entrada é a Parcela 1
        return `Entrada (1/${totalParcels})`;
    }
    // Demais parcelas: sequence 1 = Parcela 2, sequence 2 = Parcela 3, etc.
    return `Parcela ${parcel.sequence + 1}/${totalParcels}`;
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
 * IMPORTANTE: Verifica se TODAS as parcelas estão realmente pagas antes de mostrar mensagem de sucesso
 */
export function getOrderAlertMessage(order: ParcelledOrderWithParcels): string | null {
    const overdueCount = countOverdueParcels(order.parcels);
    const allParcelsPaid = areAllParcelsPaid(order.parcels);
    
    if (order.status === 'pending_entry') {
        const entry = getEntryParcel(order.parcels);
        if (entry && isParcelDueSoon(entry)) {
            return '⚠️ A entrada expira em breve! <br/> Pague agora para não perder seu pedido';
        }
        return '⏰ Pague a entrada para efetivar seu pedido e liberar as demais parcelas';
    }
    
    // Só mostrar mensagem de sucesso se TODAS as parcelas estiverem realmente pagas
    // Não confiar apenas no status 'completed' do pedido
    if (order.status === 'completed' && allParcelsPaid) {
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

/**
 * Verifica se o PIX da entrada expirou
 * CRÍTICO: Pedidos com entrada expirada devem ser ocultados do dashboard
 * 
 * REGRAS:
 * 1. Se entrada foi paga → NÃO expirou (mostrar sempre)
 * 2. Se pedido foi cancelado e entrada não foi paga → expirado (ocultar)
 * 3. Se entrada não foi paga e PIX não foi gerado (pending) → verificar se passou 30min desde criação
 * 4. Se entrada não foi paga e PIX foi gerado (payment_generated) → verificar se passou 30min desde criação
 * 5. Se passou do dueDate E não foi paga → expirado (ocultar)
 * 
 * IMPORTANTE: O PIX tem validade de 30 minutos, não o dueDate (que é 30 dias)
 */
export function isEntryPixExpired(order: ParcelledOrderWithParcels): boolean {
    // Se o pedido já foi cancelado, considerar expirado (se entrada não foi paga)
    if (order.status === 'cancelled') {
        const entryParcel = getEntryParcel(order.parcels);
        const entryWasPaid = entryParcel?.status === 'paid';
        // Se entrada não foi paga e está cancelado, está expirado
        return !entryWasPaid;
    }
    
    // Só verificar se o pedido está aguardando entrada
    if (order.status !== 'pending_entry') {
        return false; // Pedidos active/completed sempre aparecem
    }
    
    const entryParcel = getEntryParcel(order.parcels);
    
    // Se não tem parcela de entrada, mostrar o pedido (pode estar sendo criado ainda)
    if (!entryParcel) {
        return false; // Sem entrada ainda = mostrar sempre (pedido recém criado)
    }
    
    // Se entrada já foi paga, não está expirado
    if (entryParcel.status === 'paid') {
        return false; // Entrada paga = mostrar sempre
    }
    
    const now = new Date();
    
    // REGRA CRÍTICA: Verificar expiração do PIX
    // - Se PIX foi gerado (payment_generated): verificar se passou 30 minutos desde criação
    // - Se PIX não foi gerado (pending): dar mais tempo (1 hora) para o usuário gerar o PIX
    if (order.createdAt) {
        const createdAt = new Date(order.createdAt);
        if (!isNaN(createdAt.getTime())) {
            const timeSinceCreation = now.getTime() - createdAt.getTime();
            
            // Se PIX foi gerado, usar timeout de 30 minutos (validade do PIX)
            if (entryParcel.status === 'payment_generated') {
                const PIX_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
                if (timeSinceCreation >= PIX_TIMEOUT_MS) {
                    return true; // PIX gerado mas expirou = ocultar
                }
            }
            // Se PIX não foi gerado ainda, dar mais tempo (1 hora) para o usuário gerar
            else if (entryParcel.status === 'pending') {
                const PENDING_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora
                if (timeSinceCreation >= PENDING_TIMEOUT_MS) {
                    return true; // Passou muito tempo sem gerar PIX = ocultar
                }
            }
        }
    }
    
    // Verificar também o dueDate como fallback (caso o pedido tenha mais de 30 dias)
    if (entryParcel.dueDate) {
        const dueDate = new Date(entryParcel.dueDate);
        
        // Verificar se a data é válida
        if (!isNaN(dueDate.getTime())) {
            // Se já passou do dueDate E não foi paga, considerar expirado
            if (now.getTime() >= dueDate.getTime()) {
                return true; // Expirou = ocultar
            }
        }
    }
    
    // Ainda não expirou, mostrar o pedido
    return false; // Não expirou = mostrar
}

/**
 * Verifica se o PIX está ativo (não expirado)
 * Lógica simples: PIX ativo = não expirado
 */
export function isPixActive(order: ParcelledOrderWithParcels): boolean {
    // Se entrada foi paga, PIX está "ativo" (pedido efetivado)
    const entryParcel = getEntryParcel(order.parcels);
    if (entryParcel?.status === 'paid') {
        return true;
    }
    
    // Se pedido está ativo ou completo, PIX está "ativo"
    if (order.status === 'active' || order.status === 'completed') {
        return true;
    }
    
    // Para pedidos pending_entry, verificar se expirou
    // Se não expirou = ativo, se expirou = não ativo
    return !isEntryPixExpired(order);
}