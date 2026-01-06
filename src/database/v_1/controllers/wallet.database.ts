/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entities } from '../../../helpers';
import { Logger } from '../../../helpers/logger';
import { WalletModel } from '../../models/Wallet';
import { WalletTransactionModel } from '../../models/WalletTransaction';

export class WalletDatabase {
    private logger: typeof Logger;

    public constructor(args: any) {
        this.logger = Logger;
    }

    async GetWallet(userId: string): Promise<Entities.Wallet | null> {
        let wallet = await WalletModel.findOne({ userId });

        if (!wallet) {
            // Auto-create wallet if it doesn't exist? 
            // Or return null and let controller handle it.
            // Let's create it for seamless experience.
            try {
                wallet = await WalletModel.create({ userId, coinBalance: 0, usdBalance: 0 });
            } catch (err) {
                this.logger.error('Failed to create wallet', err);
                return null;
            }
        }

        return wallet ? (wallet.toJSON() as Entities.Wallet) : null;
    }

    async UpdateWalletBalance(userId: string, updates: { coinBalance?: number; usdBalance?: number }): Promise<Entities.Wallet | null> {
        // We use $inc for atomic updates if possible, but here we might pass absolute values or deltas.
        // For safety, let's assume the controller calculates the new balance or we use $inc.
        // However, to ensure data integrity, strictly using $inc is better.
        // But keeping it simple for now, matching the generic update style.
        // Wait, for money, $inc is safer.

        const updateQuery: any = {};
        if (updates.coinBalance !== undefined) updateQuery.coinBalance = updates.coinBalance;
        if (updates.usdBalance !== undefined) updateQuery.usdBalance = updates.usdBalance;

        // NOTE: This replaces the balance. 
        // Ideally we should have Add/Subtract methods.

        const wallet = await WalletModel.findOneAndUpdate({ userId }, updateQuery, { new: true });
        return wallet ? (wallet.toJSON() as Entities.Wallet) : null;
    }

    async IncrementBalance(userId: string, inc: { coins?: number; usd?: number }): Promise<Entities.Wallet | null> {
        const update: any = { $inc: {} };
        if (inc.coins) update.$inc.coinBalance = inc.coins;
        if (inc.usd) update.$inc.usdBalance = inc.usd;

        const wallet = await WalletModel.findOneAndUpdate({ userId }, update, { new: true });
        return wallet ? (wallet.toJSON() as Entities.Wallet) : null;
    }

    async SetBankDetails(userId: string, details: NonNullable<Entities.Wallet['bankDetails']>): Promise<Entities.Wallet | null> {
        const wallet = await WalletModel.findOneAndUpdate(
            { userId },
            { $set: { bankDetails: details } },
            { new: true }
        );
        return wallet ? (wallet.toJSON() as Entities.Wallet) : null;
    }

    async CreateTransaction(transaction: Partial<Entities.WalletTransaction>): Promise<string> {
        const newTx = await WalletTransactionModel.create(transaction);
        return newTx._id.toString();
    }

    async GetAvailableBalance(userId: string): Promise<number> {
        const wallet = await WalletModel.findOne({ userId });
        return wallet ? wallet.usdBalance : 0;
    }

    async GetTransactions(walletId: string, params: { page?: number; limit?: number }): Promise<{ transactions: Entities.WalletTransaction[]; total: number }> {
        const { page = 1, limit = 10 } = params;

        const [transactions, total] = await Promise.all([
            WalletTransactionModel.find({ walletId })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            WalletTransactionModel.countDocuments({ walletId }),
        ]);

        return { transactions: transactions as unknown as Entities.WalletTransaction[], total };
    }
}
