import { WebhookEvent } from '../models';

type Processor = (payload: any) => Promise<void>;

// Simple exponential backoff in minutes: 1, 2, 4, 8, 16 (max 30)
function computeNextAttempt(attempts: number): Date {
    const minutes = Math.min(30, Math.pow(2, Math.max(0, attempts - 1)));
    return new Date(Date.now() + minutes * 60 * 1000);
}

export async function enqueueOrGet(
    eventId: string,
    topic: string | undefined,
    payload: any,
    headers: Record<string, any>,
    signature: string | undefined,
    signatureValid: boolean
) {
    try {
        const existing = await WebhookEvent.findOne({ eventId });
        if (existing) return existing;
        return await WebhookEvent.create({
            provider: 'mercadopago',
            eventId,
            topic,
            payload,
            headers,
            signatureProvided: signature,
            signatureValid,
            status: 'pending',
            attempts: 0,
            nextAttemptAt: new Date(),
        });
    } catch (e) {
        // Unique constraint race; fetch and return
        const found = await WebhookEvent.findOne({ eventId });
        if (found) return found;
        throw e;
    }
}

export async function processOne(event: any, processor: Processor) {
    if (!event) return;
    const doc = await WebhookEvent.findById(event._id);
    if (!doc) return;

    if (doc.status === 'processed') return;

    doc.status = 'processing';
    await doc.save();
    try {
        await processor(doc.payload);
        doc.status = 'processed';
        doc.processedAt = new Date();
        await doc.save();
    } catch (err: any) {
        doc.status = 'failed';
        doc.attempts += 1;
        doc.lastError = err?.message || 'Unknown error';
        doc.nextAttemptAt = computeNextAttempt(doc.attempts);
        await doc.save();
    }
}

export function startWebhookWorker(processor: Processor) {
    const intervalMs = 30 * 1000; // 30s
    setInterval(async () => {
        try {
            const now = new Date();
            const candidates = await WebhookEvent.find({
                status: { $in: ['pending', 'failed'] },
                nextAttemptAt: { $lte: now },
                attempts: { $lt: 6 },
            })
                .sort({ updatedAt: 1 })
                .limit(10);

            for (const c of candidates) {
                await processOne(c, processor);
            }
        } catch (e) {
            // swallow
        }
    }, intervalMs);
}
