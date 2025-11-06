import mongoose, { Document, Schema } from 'mongoose';

export interface IWebhookEvent extends Document {
    provider: 'mercadopago';
    eventId: string; // type:id
    topic?: string; // e.g., order, payment
    signatureProvided?: string;
    signatureValid: boolean;
    status: 'pending' | 'processing' | 'processed' | 'failed';
    attempts: number;
    nextAttemptAt?: Date | null;
    lastError?: string;
    payload: any;
    headers: Record<string, any>;
    receivedAt: Date;
    processedAt?: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>({
    provider: { type: String, required: true, default: 'mercadopago', index: true },
    eventId: { type: String, required: true, unique: true, index: true },
    topic: { type: String },
    signatureProvided: { type: String },
    signatureValid: { type: Boolean, required: true, default: false },
    status: { type: String, required: true, enum: ['pending', 'processing', 'processed', 'failed'], default: 'pending', index: true },
    attempts: { type: Number, required: true, default: 0 },
    nextAttemptAt: { type: Date, default: null, index: true },
    lastError: { type: String },
    payload: { type: Schema.Types.Mixed, required: true },
    headers: { type: Schema.Types.Mixed },
    receivedAt: { type: Date, required: true, default: () => new Date() },
    processedAt: { type: Date },
}, { timestamps: true });

const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
export default WebhookEvent;


