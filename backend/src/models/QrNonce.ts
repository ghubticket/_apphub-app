import mongoose, { Document, Schema } from 'mongoose';

export interface IQrNonce extends Document {
    nonce: string; // base64url
    ticketCode: string; // 12 chars
    ts: number; // seconds
    createdAt: Date;
}

const QrNonceSchema = new Schema<IQrNonce>({
    nonce: { type: String, required: true, unique: true, index: true },
    ticketCode: { type: String, required: true, index: true },
    ts: { type: Number, required: true },
    createdAt: { type: Date, default: () => new Date(), index: true }
});

const QrNonce = mongoose.models.QrNonce || mongoose.model<IQrNonce>('QrNonce', QrNonceSchema);
export default QrNonce;


