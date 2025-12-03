import type { CheckoutCartItem } from '../types';
import type { AppliedDiscountInfo } from '../hooks/usePromoterCodeState';

/**
 * Calcula o total do carrinho com desconto aplicado
 * Replica a lógica do backend: desconto no subtotal, taxa da plataforma sobre subtotal após desconto
 */
export function calculateTotalWithDiscount(
    cartItems: CheckoutCartItem[],
    discountInfo: AppliedDiscountInfo | null
): {
    subtotal: number;
    discountAmount: number;
    platformFee: number;
    totalAmount: number;
} {
    // Calcular subtotal total do carrinho (sem taxas)
    const subtotal = cartItems.reduce((acc, item) => acc + item.subtotal, 0);

    // Calcular desconto sobre o subtotal
    let discountAmount = 0;
    if (discountInfo) {
        if (discountInfo.discountType === 'percentage') {
            discountAmount = subtotal * (discountInfo.discountValue / 100);
        } else {
            // Valor fixo, limitado ao subtotal
            discountAmount = Math.min(discountInfo.discountValue, subtotal);
        }
    }

    // Calcular subtotal após desconto
    const subtotalAfterDiscount = subtotal - discountAmount;

    // Calcular taxa da plataforma sobre o subtotal após desconto
    // IMPORTANTE: O backend não considera taxa fixa (ticketFee está DEPRECATED)
    // Apenas taxa da plataforma percentual sobre subtotal após desconto
    const currentPlatformFee = cartItems.reduce((acc, item) => acc + item.platformFeeValue, 0);
    
    let platformFee = 0;
    
    if (subtotal > 0 && currentPlatformFee > 0) {
        // Calcular a taxa percentual efetiva
        // A taxa da plataforma é aplicada sobre o subtotal após desconto
        const platformFeeRate = currentPlatformFee / subtotal;
        platformFee = subtotalAfterDiscount * platformFeeRate;
    }

    // NOTA: Taxas fixas (ticketFee) não são consideradas no cálculo do backend
    // O backend usa apenas: totalAmount = subtotalAfterDiscount + platformFee

    // Calcular total: (subtotal - desconto) + taxa da plataforma
    const totalAmount = subtotalAfterDiscount + platformFee;

    return {
        subtotal,
        discountAmount,
        platformFee,
        totalAmount,
    };
}

