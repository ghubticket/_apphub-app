import { Request, Response } from 'express';
import { Ticket, TicketType, Event, Order, User, QrNonce } from '../models';
import { verifyAndDecode } from '../services/qrCodeService';
import ValidationAttempt from '../models/ValidationAttempt';
import { checkUserBlocked } from './usersController';

/**
 * Helper: Registra tentativa de validação e detecta padrões suspeitos
 */
async function recordValidationAttempt(
    ticketCode: string,
    success: boolean,
    reason: string | undefined,
    req: Request,
    ticket?: any,
    validatorId?: string
) {
    try {
        const ipAddress = (req.ip || req.connection.remoteAddress || 'unknown').toString();
        const userAgent = req.get('user-agent') || 'unknown';

        // Registrar tentativa
        const attempt = await ValidationAttempt.create({
            ticketCode: ticketCode.toUpperCase(),
            ticketId: ticket?._id,
            holderId: ticket?.holder?._id || ticket?.holder,
            validatorId: validatorId,
            eventId: ticket?.event?._id || ticket?.event,
            success,
            reason,
            ipAddress,
            userAgent,
        });

        // Se falhou e tem holder, verificar padrões suspeitos
        if (!success && ticket?.holder) {
            await checkSuspiciousPatterns(ticket.holder._id || ticket.holder, ticketCode);
        }

        // Se sucesso, verificar se mesmo QR foi usado em múltiplos eventos
        if (success && ticket?.event) {
            await checkMultiEventUsage(ticketCode);
        }

        return attempt;
    } catch (error: any) {
        // Não falhar a validação se o registro der erro
        console.error('Erro ao registrar tentativa de validação:', error);
    }
}

/**
 * Helper: Detecta padrões suspeitos e atualiza flags do usuário
 */
async function checkSuspiciousPatterns(holderId: string, ticketCode: string) {
    try {
        const user = await User.findById(holderId);
        if (!user || user.role === 'ADMIN' || user.role === 'QRCODE') return;

        // Contar tentativas suspeitas nas últimas 24h
        const suspiciousCount = await ValidationAttempt.countDocuments({
            holderId,
            success: false,
            reason: { $in: ['already_used', 'replay_detected'] },
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });

        // Atualizar contador
        user.suspiciousActivityCount = suspiciousCount;
        user.lastSuspiciousActivity = new Date();

        // Marcar como suspeito se tiver 3+ tentativas suspeitas
        if (suspiciousCount >= 3) {
            user.isSuspicious = true;
            user.suspiciousReason = `Múltiplas tentativas de usar QR codes já utilizados (${suspiciousCount} tentativas nas últimas 24h)`;
        }

        await user.save();
    } catch (error: any) {
        console.error('Erro ao verificar padrões suspeitos:', error);
    }
}

/**
 * Helper: Verifica se mesmo QR foi usado em múltiplos eventos
 */
async function checkMultiEventUsage(ticketCode: string) {
    try {
        const result = await (ValidationAttempt as any).checkMultiEventUsage(ticketCode, 24);

        // Se mesmo QR foi usado em 2+ eventos diferentes, marcar como suspeito
        if (result.uniqueEvents >= 2) {
            const ticket = await Ticket.findOne({ code: ticketCode.toUpperCase() });
            if (ticket?.holder) {
                const user = await User.findById(ticket.holder);
                if (user && user.role === 'CLIENTE') {
                    user.isSuspicious = true;
                    user.suspiciousReason = `Mesmo QR code usado em ${result.uniqueEvents} eventos diferentes`;
                    user.lastSuspiciousActivity = new Date();
                    await user.save();
                }
            }
        }
    } catch (error: any) {
        console.error('Erro ao verificar uso em múltiplos eventos:', error);
    }
}

/**
 * Busca um ticket por código (para validação de QR code)
 */
export const getTicketByCode = async (req: Request, res: Response) => {
    try {
        const { code } = req.params;

        if (!code || code.length !== 12) {
            return res.status(400).json({
                success: false,
                message: 'Código inválido',
                errors: ['Código deve ter 12 caracteres']
            });
        }

        const ticket = await Ticket.findOne({
            code: code.toUpperCase(),
            deletedAt: null
        })
            .populate('event', 'name date location')
            .populate('ticketType', 'name price isVIP')
            .populate('order', 'orderNumber status')
            .populate('holder', 'name email')
            .lean();

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ingresso não encontrado'
            });
        }

        res.json({
            success: true,
            data: ticket
        });

    } catch (error: any) {
        console.error('Erro ao buscar ingresso:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar ingresso',
            errors: [error.message || 'Erro desconhecido']
        });
    }
};

/**
 * Valida um ingresso (marca como usado)
 * Apenas usuários com role QRCODE podem validar
 */
export const validateTicket = async (req: Request, res: Response) => {
    try {
        const { code } = req.params;
        const { holderId } = req.body || {}; // Opcional: quem está presente na validação
        const validatorId = (req as any).user?._id?.toString() || (req as any).user?.id;
        const validatorRole = (req as any).user?.role;

        // Verificar permissão (APENAS QRCODE - Admin não valida para não bagunçar)
        if (validatorRole !== 'QRCODE') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado',
                errors: ['Apenas usuários com role QRCODE podem validar ingressos']
            });
        }

        if (!code || code.length !== 12) {
            return res.status(400).json({
                success: false,
                message: 'Código inválido',
                errors: ['Código deve ter 12 caracteres']
            });
        }

        const ticket = await Ticket.findOne({
            code: code.toUpperCase(),
            deletedAt: null
        });

        if (!ticket) {
            // Registrar tentativa de ingresso não encontrado
            await recordValidationAttempt(code, false, 'not_found', req, undefined, validatorId);
            return res.status(404).json({
                success: false,
                message: 'Ingresso não encontrado'
            });
        }

        // Verificar se o dono do ingresso está bloqueado
        if (ticket.holder) {
            const blocked = await checkUserBlocked(ticket.holder.toString());
            if (blocked.blocked) {
                await recordValidationAttempt(code, false, 'unauthorized', req, ticket, validatorId);
                return res.status(403).json({
                    success: false,
                    message: 'Validação bloqueada',
                    errors: [blocked.reason || 'Usuário está bloqueado']
                });
            }
        }

        // Verificar se o ingresso está confirmado
        if (ticket.status !== 'confirmed') {
            await recordValidationAttempt(code, false, 'invalid_status', req, ticket, validatorId);
            return res.status(400).json({
                success: false,
                message: 'Ingresso não confirmado',
                errors: [`Status atual: ${ticket.status}. Apenas ingressos confirmados podem ser validados.`]
            });
        }

        // Verificar se o pedido está pago
        const order = await Order.findById(ticket.order).populate('tickets');
        if (!order || order.status !== 'paid') {
            await recordValidationAttempt(code, false, 'order_not_paid', req, ticket, validatorId);
            return res.status(400).json({
                success: false,
                message: 'Pedido não pago',
                errors: ['Ingresso não pode ser validado pois o pedido não está pago']
            });
        }

        // Verificar se o evento ainda está ativo
        const event = await Event.findById(ticket.event);
        if (!event || !event.isActive || event.deletedAt) {
            await recordValidationAttempt(code, false, 'event_inactive', req, ticket, validatorId);
            return res.status(400).json({
                success: false,
                message: 'Evento não disponível',
                errors: ['Evento não está ativo ou foi cancelado']
            });
        }

        // Determinar qual holder estava presente na validação
        // Se não informado, assume que foi o holder do ticket
        let presentHolderId = ticket.holder.toString();

        // Verificar se o holder informado existe e está relacionado ao pedido
        // (para casos futuros de transferência, pode ser outro holder do mesmo pedido)
        if (holderId) {
            const orderTickets = (order as any)?.tickets || [];
            const isValidHolder = orderTickets.some((t: any) =>
                String(t.holder) === holderId || String(t._id) === holderId
            );

            if (isValidHolder) {
                presentHolderId = holderId;
            } else {
                // Se holder informado não está no pedido, usar o holder do ticket
                console.warn(`⚠️ Holder informado (${holderId}) não está no pedido. Usando holder do ticket.`);
            }
        }

        // ⚠️ PROTEÇÃO CONTRA RACE CONDITION: Usar operação atômica
        // Tenta atualizar APENAS se o status ainda for 'confirmed'
        // Isso garante que apenas uma validação seja aceita
        const updatedTicket = await Ticket.findOneAndUpdate(
            {
                _id: ticket._id,
                code: code.toUpperCase(),
                status: 'confirmed', // Só atualiza se ainda estiver 'confirmed'
                deletedAt: null
            },
            {
                $set: {
                    status: 'used',
                    usedAt: new Date(),
                    usedBy: validatorId,
                    usedByHolderId: presentHolderId, // Registrar quem estava presente
                    validatedAt: new Date()
                }
            },
            {
                new: true, // Retorna o documento atualizado
                runValidators: true
            }
        );

        // Se não encontrou o ticket ou não conseguiu atualizar, significa que já foi usado
        if (!updatedTicket) {
            // Buscar novamente para pegar os dados atualizados
            const currentTicket = await Ticket.findById(ticket._id)
                .populate('holder', 'name email')
                .populate('usedBy', 'name email');

            if (currentTicket?.status === 'used') {
                // Buscar informações completas do ticket usado
                const usedTicket = await Ticket.findById(ticket._id)
                    .populate('holder', 'name email')
                    .populate('usedBy', 'name email')
                    .populate('usedByHolderId', 'name email');

                // Detectar quem passou primeiro
                const firstPassedHolder = usedTicket?.usedByHolderId
                    ? (usedTicket.usedByHolderId as any)
                    : (usedTicket?.holder as any); // Se não informado, assume que foi o holder

                const firstPassedHolderName = firstPassedHolder?.name || firstPassedHolder?.email || 'Não identificado';
                const firstPassedHolderId = String(firstPassedHolder?._id || firstPassedHolder);

                // Detectar se o holder original está tentando usar um QR já usado (POSSÍVEL BURLA!)
                const isHolderTryingToReuse = currentTicket.holder &&
                    String(currentTicket.holder._id || currentTicket.holder) === String(ticket.holder);

                // Detectar se quem está tentando usar agora é diferente de quem passou primeiro
                const currentAttemptHolderId = holderId || ticket.holder.toString();
                const isDifferentPerson = String(currentAttemptHolderId) !== String(firstPassedHolderId);

                // Buscar informações de quem validou primeiro
                const firstValidation = await ValidationAttempt.findOne({
                    ticketCode: code.toUpperCase(),
                    success: true
                })
                    .populate('validatorId', 'name email')
                    .sort({ createdAt: 1 })
                    .lean();

                // Registrar tentativa de usar QR já utilizado (SUSPEITO!)
                await recordValidationAttempt(code, false, 'already_used', req, ticket, validatorId);

                // Se o holder original está tentando usar um QR já usado, é SUSPEITO!
                if (isHolderTryingToReuse) {
                    console.warn(`⚠️ SUSPEITO: Holder original tentando usar QR já utilizado!`, {
                        ticketCode: code,
                        holder: (currentTicket.holder as any)?.name || currentTicket.holder,
                        firstPassedHolder: firstPassedHolderName,
                        firstUsedAt: currentTicket.usedAt,
                        firstUsedBy: (currentTicket.usedBy as any)?.name || currentTicket.usedBy,
                        attemptedBy: validatorId,
                        isDifferentPerson
                    });

                    // Marcar como suspeito se for o holder
                    if (ticket.holder) {
                        const holderUser = await User.findById(ticket.holder);
                        if (holderUser && holderUser.role === 'CLIENTE') {
                            holderUser.isSuspicious = true;
                            holderUser.suspiciousReason = `Tentativa de reutilizar QR code já validado. QR foi usado por ${firstPassedHolderName} em ${currentTicket.usedAt?.toLocaleString('pt-BR')}`;
                            holderUser.lastSuspiciousActivity = new Date();
                            await holderUser.save();
                        }
                    }
                }

                // Montar mensagem detalhada
                const usedByInfo = currentTicket.usedBy
                    ? (currentTicket.usedBy as any)?.name || 'Usuário QRCODE'
                    : 'Sistema';
                const usedAtInfo = currentTicket.usedAt?.toLocaleString('pt-BR') || 'Data não disponível';

                return res.status(400).json({
                    success: false,
                    message: 'Ingresso já utilizado',
                    errors: [
                        `Este QR code já foi validado anteriormente.`,
                        `Primeira validação: ${usedAtInfo}`,
                        `Quem passou primeiro: ${firstPassedHolderName}`, // ← NOVO: Identifica quem passou!
                        `Validado por: ${usedByInfo}`,
                        isHolderTryingToReuse
                            ? `⚠️ ATENÇÃO: Este ingresso pertence a você, mas foi usado por ${firstPassedHolderName}.`
                            : `Este ingresso não pode ser usado novamente.`
                    ],
                    data: {
                        alreadyUsed: true,
                        usedAt: currentTicket.usedAt,
                        usedBy: usedByInfo,
                        firstPassedHolder: firstPassedHolderName, // ← NOVO
                        firstPassedHolderId: firstPassedHolderId, // ← NOVO
                        isHolderTryingToReuse,
                        isDifferentPerson, // ← NOVO: Indica se é pessoa diferente
                        holder: (currentTicket.holder as any)?.name || 'Não informado'
                    }
                });
            }

            await recordValidationAttempt(code, false, 'other', req, ticket, validatorId);
            return res.status(409).json({
                success: false,
                message: 'Conflito na validação',
                errors: ['Ingresso foi validado por outro usuário simultaneamente. Tente novamente.']
            });
        }

        // Popular dados para resposta (usar o ticket atualizado)
        const populatedTicket = await Ticket.findById(updatedTicket._id)
            .populate('event', 'name date location')
            .populate('ticketType', 'name price isVIP')
            .populate('order', 'orderNumber')
            .populate('holder', 'name email')
            .populate('usedBy', 'name email')
            .populate('usedByHolderId', 'name email') // ← NOVO: Quem passou
            .lean();

        // Registrar tentativa bem-sucedida
        await recordValidationAttempt(code, true, undefined, req, populatedTicket, validatorId);

        res.json({
            success: true,
            message: 'Ingresso validado com sucesso',
            data: populatedTicket
        });

    } catch (error: any) {
        console.error('Erro ao validar ingresso:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao validar ingresso',
            errors: [error.message || 'Erro desconhecido']
        });
    }
};

/**
 * Lista ingressos do usuário autenticado
 */
export const listMyTickets = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id?.toString() || (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }

        const tickets = await Ticket.find({
            holder: userId,
            deletedAt: null
        })
            .populate('event', 'name date location coverImage')
            .populate('ticketType', 'name price isVIP')
            .populate('order', 'orderNumber status')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: tickets
        });

    } catch (error: any) {
        console.error('Erro ao listar ingressos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar ingressos',
            errors: [error.message || 'Erro desconhecido']
        });
    }
};

/**
 * Lista ingressos de um evento (apenas ADMIN)
 */
export const listEventTickets = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const userRole = (req as any).user?.role;

        if (userRole !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado',
                errors: ['Apenas ADMIN pode listar ingressos de eventos']
            });
        }

        const tickets = await Ticket.find({
            event: eventId,
            deletedAt: null
        })
            .populate('ticketType', 'name price isVIP')
            .populate('order', 'orderNumber status')
            .populate('holder', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: tickets
        });

    } catch (error: any) {
        console.error('Erro ao listar ingressos do evento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar ingressos do evento',
            errors: [error.message || 'Erro desconhecido']
        });
    }
};

/**
 * Lê e valida QR seguro (AES+HMAC). Previene replay via nonce persistente.
 * Requer role QRCODE (Admin não valida para não bagunçar).
 */
export const scanSecureQr = async (req: Request, res: Response) => {
    try {
        const role = (req as any).user?.role;
        // Apenas QRCODE pode ler QR codes (Admin não para não bagunçar)
        if (role !== 'QRCODE') {
            return res.status(403).json({ success: false, message: 'Acesso negado. Apenas usuários com role QRCODE podem ler QR codes.' });
        }

        const { qr } = req.body || {};
        if (!qr || typeof qr !== 'string') {
            return res.status(400).json({ success: false, message: 'QR inválido' });
        }

        // Se já é payload direto (QR1.xxx), usar direto
        // Se for imagem base64, extrair payload primeiro
        let qrPayload = qr;
        if (!qr.startsWith('QR1.')) {
            try {
                // Tentar decodificar como imagem QR
                const QRCode = require('qrcode');
                const Jimp = require('jimp');
                const jsQR = require('jsqr');

                let base64Data = qr;
                if (qr.startsWith('data:')) {
                    const commaIdx = qr.indexOf(',');
                    if (commaIdx === -1) {
                        return res.status(400).json({ success: false, message: 'Formato de QR inválido' });
                    }
                    base64Data = qr.substring(commaIdx + 1);
                }

                const imageBuffer = Buffer.from(base64Data, 'base64');
                const image = await Jimp.read(imageBuffer);
                const imageData = {
                    data: new Uint8ClampedArray(image.bitmap.data),
                    width: image.bitmap.width,
                    height: image.bitmap.height
                };

                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (!code || !code.data) {
                    return res.status(400).json({ success: false, message: 'Não foi possível decodificar a imagem QR' });
                }

                qrPayload = code.data;
            } catch (e: any) {
                return res.status(400).json({ success: false, message: `Erro ao processar QR: ${e?.message || 'Formato inválido'}` });
            }
        }

        const { ticketCode, ts, nonce } = verifyAndDecode(qrPayload);

        // Anti-replay: registrar nonce único
        try {
            await QrNonce.create({ nonce, ticketCode: ticketCode.toUpperCase(), ts });
        } catch (e: any) {
            if (String(e?.code) === '11000') {
                // Replay detectado - registrar tentativa suspeita
                const ticket = await Ticket.findOne({ code: ticketCode.toUpperCase(), deletedAt: null });
                await recordValidationAttempt(ticketCode, false, 'replay_detected', req, ticket);
                return res.status(409).json({ success: false, message: 'QR já utilizado (replay detectado)' });
            }
            throw e;
        }

        const ticket = await Ticket.findOne({ code: ticketCode.toUpperCase(), deletedAt: null })
            .populate('event', 'name date location')
            .populate('ticketType', 'name price isVIP')
            .populate('order', 'orderNumber status')
            .lean();

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ingresso não encontrado' });
        }

        if (ticket.status !== 'confirmed') {
            return res.status(400).json({ success: false, message: `Ingresso não confirmado (status: ${ticket.status})` });
        }

        return res.json({ success: true, data: { ticket, ts } });
    } catch (error: any) {
        console.error('Erro ao ler QR:', error);
        return res.status(400).json({ success: false, message: error?.message || 'Falha ao validar QR' });
    }
};

