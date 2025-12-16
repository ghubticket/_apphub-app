import mongoose, { Document, Schema } from 'mongoose';

export type ParcelStatus =
    | 'pending'
    | 'payment_generated'
    | 'paid'
    | 'overdue'
    | 'cancelled';

export interface IParcel extends Document {
    parcelledOrder: mongoose.Types.ObjectId;

    sequence: number; // 0 = entrada
    amount: number;
    dueDate: Date;

    status: ParcelStatus;

    paymentProvider: 'mercadopago';
    paymentMethod: 'pix' | 'boleto';

    paymentId?: string;
    paymentOrderId?: string; // ID da Order no Mercado Pago (Orders API)
    qrCode?: string | null;
    qrCodeBase64?: string | null;
    ticketUrl?: string | null;

    externalTicketUrl?: string | null; // para pagamentos criados manualmente no painel do MP

    generatedAt?: Date | null;
    paidAt?: Date | null;
    cancelledAt?: Date | null;

    createdAt: Date;
    updatedAt: Date;
}

const parcelSchema = new Schema<IParcel>(
    {
        parcelledOrder: {
            type: Schema.Types.ObjectId,
            ref: 'ParcelledOrder',
            required: true,
            index: true,
        },
        sequence: {
            type: Number,
            required: true,
            min: [0, 'sequence deve ser >= 0'],
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: [0, 'amount não pode ser negativo'],
        },
        dueDate: {
            type: Date,
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['pending', 'payment_generated', 'paid', 'overdue', 'cancelled'],
            default: 'pending',
            index: true,
        },
        paymentProvider: {
            type: String,
            enum: ['mercadopago'],
            default: 'mercadopago',
        },
        paymentMethod: {
            type: String,
            enum: ['pix', 'boleto'],
            required: true,
        },
        paymentId: {
            type: String,
            index: true,
        },
        paymentOrderId: {
            type: String,
            index: true,
        },
        qrCode: {
            type: String,
        },
        qrCodeBase64: {
            type: String,
        },
        ticketUrl: {
            type: String,
        },
        externalTicketUrl: {
            type: String,
        },
        generatedAt: {
            type: Date,
        },
        paidAt: {
            type: Date,
        },
        cancelledAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

parcelSchema.index({ status: 1, dueDate: 1 });

export default mongoose.model<IParcel>('Parcel', parcelSchema);


