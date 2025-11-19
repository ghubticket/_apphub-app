import { Order } from '../models';
import SuspiciousOrderAlert from '../models/SuspiciousOrderAlert';
import { normalizeCPF } from '../utils/validationHelpers';

/**
 * Detecta padrões suspeitos na criação de pedidos
 * Registra alertas que podem indicar fraude ou comportamento suspeito
 */

interface DetectionContext {
    orderId: string;
    ipAddress: string;
    cpf?: string;
    email?: string;
    userId?: string;
}

/**
 * Detecta múltiplas compras do mesmo IP em pouco tempo
 */
export async function detectMultipleOrdersSameIP(
    context: DetectionContext,
    timeWindowMinutes: number = 15,
    threshold: number = 3
): Promise<void> {
    try {
        const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

        // Contar pedidos do mesmo IP no período
        const recentOrders = await Order.countDocuments({
            ipAddress: context.ipAddress,
            createdAt: { $gte: timeWindow },
            _id: { $ne: context.orderId },
        });

        if (recentOrders >= threshold - 1) {
            // -1 porque não contamos o pedido atual ainda
            await SuspiciousOrderAlert.create({
                orderId: context.orderId,
                alertType: 'multiple_orders_same_ip',
                severity: recentOrders >= 5 ? 'high' : recentOrders >= 3 ? 'medium' : 'low',
                description: `${recentOrders + 1} pedidos criados em ${timeWindowMinutes} minutos`,
                metadata: {
                    ipAddress: context.ipAddress,
                    orderCount: recentOrders + 1,
                    timeWindow: timeWindowMinutes,
                },
            });

            console.warn(
                `⚠️ Alerta: ${recentOrders + 1} pedidos do mesmo IP em ${timeWindowMinutes} minutos`
            );
        }
    } catch (error) {
        console.error('Erro ao detectar múltiplas compras do mesmo IP:', error);
    }
}

/**
 * Detecta múltiplos pedidos com mesmo CPF mas diferentes emails
 */
export async function detectSameCPFDifferentEmails(context: DetectionContext): Promise<void> {
    try {
        if (!context.cpf) return;

        const normalizedCPF = normalizeCPF(context.cpf);
        if (!normalizedCPF) return;

        // Buscar todos os pedidos pagos com o mesmo CPF usando hash (CPF está criptografado)
        const { hashCPFForSearch } = await import('../utils/encryption');
        const cpfHash = hashCPFForSearch(normalizedCPF);

        const ordersWithSameCPF = await Order.find({
            'customerData.cpfHash': cpfHash,
            status: { $in: ['paid', 'pending'] },
            _id: { $ne: context.orderId },
        })
            .select('customerData.email')
            .lean();

        // Coletar emails únicos
        const uniqueEmails = new Set<string>();
        ordersWithSameCPF.forEach((order: any) => {
            if (order.customerData?.email) {
                uniqueEmails.add(order.customerData.email.toLowerCase().trim());
            }
        });

        // Se o email atual for diferente, adicionar à lista
        if (context.email) {
            uniqueEmails.add(context.email.toLowerCase().trim());
        }

        // Se há mais de 1 email diferente para o mesmo CPF, é suspeito
        if (uniqueEmails.size > 1) {
            const severity =
                uniqueEmails.size >= 3 ? 'high' : uniqueEmails.size === 2 ? 'medium' : 'low';

            await SuspiciousOrderAlert.create({
                orderId: context.orderId,
                alertType: 'same_cpf_different_emails',
                severity,
                description: `CPF ${normalizedCPF} usado com ${uniqueEmails.size} emails diferentes`,
                metadata: {
                    cpf: normalizedCPF,
                    emails: Array.from(uniqueEmails),
                    orderCount: ordersWithSameCPF.length + 1,
                },
            });

            console.warn(
                `⚠️ Alerta: CPF ${normalizedCPF} usado com ${uniqueEmails.size} emails diferentes`
            );
        }
    } catch (error) {
        console.error('Erro ao detectar CPF com emails diferentes:', error);
    }
}

/**
 * Detecta múltiplos pedidos em tempo muito curto (possível bot/script)
 */
export async function detectMultipleOrdersShortTime(
    context: DetectionContext,
    timeWindowSeconds: number = 60,
    threshold: number = 2
): Promise<void> {
    try {
        const timeWindow = new Date(Date.now() - timeWindowSeconds * 1000);

        // Contar pedidos criados no mesmo segundo/minuto
        const recentOrders = await Order.countDocuments({
            createdAt: { $gte: timeWindow },
            _id: { $ne: context.orderId },
        });

        if (recentOrders >= threshold - 1) {
            const severity = recentOrders >= 5 ? 'high' : recentOrders >= 3 ? 'medium' : 'low';

            await SuspiciousOrderAlert.create({
                orderId: context.orderId,
                alertType: 'multiple_orders_short_time',
                severity,
                description: `${recentOrders + 1} pedidos criados em ${timeWindowSeconds} segundos`,
                metadata: {
                    orderCount: recentOrders + 1,
                    timeWindow: timeWindowSeconds,
                    userId: context.userId,
                },
            });

            console.warn(
                `⚠️ Alerta: ${recentOrders + 1} pedidos criados em ${timeWindowSeconds} segundos`
            );
        }
    } catch (error) {
        console.error('Erro ao detectar múltiplos pedidos em tempo curto:', error);
    }
}

/**
 * Executa todas as detecções de padrões suspeitos
 */
export async function detectSuspiciousPatterns(context: DetectionContext): Promise<void> {
    // Executar todas as detecções em paralelo
    await Promise.all([
        detectMultipleOrdersSameIP(context, 15, 3),
        detectSameCPFDifferentEmails(context),
        detectMultipleOrdersShortTime(context, 60, 2),
    ]);
}
