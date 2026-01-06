import mongoose, { Schema } from 'mongoose';
import { Entities } from '../../helpers';

const WalletSchema = new Schema(
    {
        userId: { type: String, required: true, ref: 'User', unique: true },
        coinBalance: { type: Number, default: 0 },
        usdBalance: { type: Number, default: 0 },
        bankDetails: {
            accountName: { type: String },
            accountNumber: { type: String },
            bankName: { type: String },
            bankCode: { type: String },
        },
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

export const WalletModel = mongoose.model<Entities.Wallet>('Wallet', WalletSchema as any);
