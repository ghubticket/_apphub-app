import { Schema, Document, model } from 'mongoose';

export interface INewsletterSubscription extends Document {
    email: string;
    name?: string;
    source?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const NewsletterSubscriptionSchema = new Schema<INewsletterSubscription>(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            unique: true,
        },
        name: {
            type: String,
            trim: true,
            maxlength: 120,
        },
        source: {
            type: String,
            trim: true,
            maxlength: 60,
            default: 'footer',
        },
        ipAddress: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        userAgent: {
            type: String,
            trim: true,
            maxlength: 512,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: undefined,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

NewsletterSubscriptionSchema.index({ email: 1 }, { unique: true });
NewsletterSubscriptionSchema.index({ createdAt: -1 });

export default model<INewsletterSubscription>('NewsletterSubscription', NewsletterSubscriptionSchema);

