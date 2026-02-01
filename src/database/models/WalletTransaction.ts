import mongoose, { Schema } from 'mongoose';
import { Entities } from '../../helpers';

const WalletTransactionSchema = new Schema(
    {
        walletId: { type: String, required: true, ref: 'Wallet' },
        type: {
            type: String,
            enum: ['DEPOSIT', 'WITHDRAWAL', 'PURCHASE_COINS', 'GIFT_SEND', 'GIFT_RECEIVE', 'PRODUCT_SALE', 'PAYOUT', 'REFUND', 'ADJUSTMENT'],
            required: true
        },
        amount: { type: Number, required: true },
        currency: { type: String, enum: ['USD', 'COIN'], required: true },
        relatedUserId: { type: String, ref: 'User' },
        orderId: { type: String, ref: 'Order' },  // Link to order for product sales
        payoutId: { type: String, ref: 'Payout' }, // Link to payout for withdrawals
        status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
        metadata: { type: Schema.Types.Mixed },
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

export const WalletTransactionModel = mongoose.model<Entities.WalletTransaction>('WalletTransaction', WalletTransactionSchema as any);
