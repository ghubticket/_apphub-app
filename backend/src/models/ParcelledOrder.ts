import mongoose, { Document, Schema } from 'mongoose';

export type ParcelledOrderStatus =
    | 'pending_entry'
    | 'active'
    | 'completed'
    | 'cancelled';

export type ParcelledOrderCancellationReason =
    | 'entry_not_paid'
    | 'overdue_installments'
    | 'manual'
    | null;

export interface IParcelledOrder extends Document {
    customer: mongoose.Types.ObjectId;
    event: mongoose.Types.ObjectId;
    ticketType?: mongoose.Types.ObjectId;
    order?: mongoose.Types.ObjectId; // Pedido base associado (quando existir)

    paymentType: 'pix' | 'boleto';

    totalAmount: number;
    platformFeeAmount: number;
    entryAmount: number;
    installmentsCount: number;

    status: ParcelledOrderStatus;
    cancellationReason?: ParcelledOrderCancellationReason;

    overdueToleranceCount: number;
    autoCancelEnabled: boolean;
    autoCancelEmailEnabled: boolean;

    notifyOnEntryCreated: boolean;
    notifyBeforeDueDays: number | null;
    notifyOnDueDate: boolean;
    notifyOnOverdue: boolean;

    metadata?: Record<string, any>;

    createdAt: Date;
    updatedAt: Date;
}

const parcelledOrderSchema = new Schema<IParcelledOrder>(
    {
        customer: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        event: {
            type: Schema.Types.ObjectId,
            ref: 'Event',
            required: true,
            index: true,
        },
        ticketType: {
            type: Schema.Types.ObjectId,
            ref: 'TicketType',
        },
        order: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
        },
        paymentType: {
            type: String,
            enum: ['pix', 'boleto'],
            required: true,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: [0, 'totalAmount não pode ser negativo'],
        },
        platformFeeAmount: {
            type: Number,
            required: true,
            min: [0, 'platformFeeAmount não pode ser negativo'],
            default: 0,
        },
        entryAmount: {
            type: Number,
            required: true,
            min: [0, 'entryAmount não pode ser negativo'],
        },
        installmentsCount: {
            type: Number,
            required: true,
            min: [1, 'installmentsCount deve ser pelo menos 1'],
        },
        status: {
            type: String,
            enum: ['pending_entry', 'active', 'completed', 'cancelled'],
            default: 'pending_entry',
            index: true,
        },
        cancellationReason: {
            type: String,
            enum: ['entry_not_paid', 'overdue_installments', 'manual', null],
            default: null,
        },
        overdueToleranceCount: {
            type: Number,
            required: true,
            min: [1, 'overdueToleranceCount deve ser pelo menos 1'],
            default: 2,
        },
        autoCancelEnabled: {
            type: Boolean,
            default: true,
        },
        autoCancelEmailEnabled: {
            type: Boolean,
            default: true,
        },
        notifyOnEntryCreated: {
            type: Boolean,
            default: true,
        },
        notifyBeforeDueDays: {
            type: Number,
            default: 3,
        },
        notifyOnDueDate: {
            type: Boolean,
            default: false,
        },
        notifyOnOverdue: {
            type: Boolean,
            default: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

parcelledOrderSchema.index({ customer: 1, status: 1 });
parcelledOrderSchema.index({ event: 1, status: 1 });

export default mongoose.model<IParcelledOrder>('ParcelledOrder', parcelledOrderSchema);


