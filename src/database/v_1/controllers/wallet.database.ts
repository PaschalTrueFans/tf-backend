/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entities } from '../../../helpers';
import { Logger } from '../../../helpers/logger';
import { WalletModel } from '../../models/Wallet';
import { WalletTransactionModel } from '../../models/WalletTransaction';
import { PayoutModel } from '../../models/Payout';

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
        const updateQuery: any = {};
        if (updates.coinBalance !== undefined) updateQuery.coinBalance = updates.coinBalance;
        if (updates.usdBalance !== undefined) updateQuery.usdBalance = updates.usdBalance;

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

    async SetPaymentDetails(userId: string, details: Entities.PaymentDetails): Promise<Entities.Wallet | null> {
        const wallet = await WalletModel.findOneAndUpdate(
            { userId },
            { $set: { paymentDetails: details } },
            { new: true }
        );
        return wallet ? (wallet.toJSON() as Entities.Wallet) : null;
    }

    async SetPayoutSecurity(userId: string, enabled: boolean): Promise<Entities.Wallet | null> {
        const wallet = await WalletModel.findOneAndUpdate(
            { userId },
            { $set: { payoutUpdateSecurity: enabled } },
            { new: true }
        );
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

    async UpdateTransactionByPayoutId(payoutId: string, updates: Partial<Entities.WalletTransaction>): Promise<void> {
        await WalletTransactionModel.findOneAndUpdate({ payoutId }, { $set: updates });
    }

    // Payout Methods
    async CreatePayout(data: Partial<Entities.Payout>): Promise<Entities.Payout> {
        const payout = await PayoutModel.create(data);
        return payout.toJSON() as Entities.Payout;
    }

    async GetPayoutById(id: string): Promise<Entities.Payout | null> {
        const payout = await PayoutModel.findById(id);
        return payout ? (payout.toJSON() as Entities.Payout) : null;
    }

    async GetPayoutsByUser(userId: string, params: { page?: number; limit?: number; status?: string }): Promise<{ payouts: Entities.Payout[]; total: number }> {
        const { page = 1, limit = 10, status } = params;
        const query: any = { userId };
        if (status) query.status = status;

        const [payouts, total] = await Promise.all([
            PayoutModel.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            PayoutModel.countDocuments(query),
        ]);
        return { payouts: payouts as unknown as Entities.Payout[], total };
    }

    async GetAllPayouts(params: { page?: number; limit?: number; status?: string; search?: string }): Promise<{ payouts: any[]; total: number }> {
        const { page = 1, limit = 10, status, search } = params;
        const query: any = {};
        if (status) query.status = status;

        // Search by userId or amount if needed, but usually status and pagination is enough

        const [payouts, total] = await Promise.all([
            (PayoutModel.find(query)
                .sort({ createdAt: -1 }) as any)
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('userId', 'name email'),
            PayoutModel.countDocuments(query),
        ]);

        return { payouts: payouts as any[], total };
    }

    async UpdatePayoutStatus(id: string, updates: Partial<Entities.Payout>): Promise<Entities.Payout | null> {
        const payout = await PayoutModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
        return payout ? (payout.toJSON() as Entities.Payout) : null;
    }
}
