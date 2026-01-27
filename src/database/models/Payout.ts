import mongoose, { Schema } from 'mongoose';
import { Entities } from '../../helpers';

const PaymentDetailsSchema = new Schema(
    {
        // Account holder info
        accountHolderName: { type: String },
        accountHolderType: { type: String, enum: ['individual', 'company'] },

        // US Domestic (ACH)
        accountNumber: { type: String },
        routingNumber: { type: String },
        accountType: { type: String, enum: ['checking', 'savings'] },

        // International (SWIFT/Wire)
        swiftBic: { type: String },
        iban: { type: String },

        // Bank info
        bankName: { type: String },
        bankAddress: { type: String },
        bankCity: { type: String },
        bankCountry: { type: String },
        bankPostalCode: { type: String },

        // Beneficiary address (required for international)
        beneficiaryAddress: { type: String },
        beneficiaryCity: { type: String },
        beneficiaryState: { type: String },
        beneficiaryCountry: { type: String },
        beneficiaryPostalCode: { type: String },

        // Alternative payment methods
        paypalEmail: { type: String },

        // Method preference
        paymentMethod: { type: String, enum: ['bank_us', 'bank_international', 'paypal'] },
    },
    { _id: false }
);

const PayoutSchema = new Schema(
    {
        userId: { type: String, required: true, ref: 'User' },
        walletId: { type: String, required: true, ref: 'Wallet' },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'USD' },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'processing', 'completed', 'failed'],
            default: 'pending',
        },

        // Payment details snapshot (copied from wallet at request time)
        paymentDetails: { type: PaymentDetailsSchema },

        // Admin actions
        reviewedBy: { type: String, ref: 'Admin' },
        reviewedAt: { type: Date },
        reviewNote: { type: String },

        // Disbursement tracking
        paidAt: { type: Date },
        paidBy: { type: String, ref: 'Admin' },

        // For future automation (Stripe Connect, Paystack, etc.)
        provider: { type: String },
        providerTransferId: { type: String },
        providerResponse: { type: Schema.Types.Mixed },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

// Indexes for efficient queries
PayoutSchema.index({ userId: 1, createdAt: -1 });
PayoutSchema.index({ status: 1, createdAt: -1 });
PayoutSchema.index({ reviewedBy: 1 });

export const PayoutModel = mongoose.model<Entities.Payout>('Payout', PayoutSchema as any);
