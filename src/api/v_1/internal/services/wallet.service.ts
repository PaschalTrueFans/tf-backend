import { Db } from '../../../../database/db';
import { AppError } from '../../../../helpers/errors';
import { Logger } from '../../../../helpers/logger';
import { Entities, stripeService } from '../../../../helpers';
import { generateRandomOTP } from '../../../../helpers/generateRandomOTP';
import { EmailService } from '../../../../helpers/email';

export class WalletService {
    private db: Db;

    constructor(args: { db: Db }) {
        this.db = args.db;
    }

    public async GetWallet(userId: string): Promise<Entities.Wallet> {
        let wallet = await this.db.v1.Wallet.GetWallet(userId);
        if (!wallet) {
            // Force create wallet if it doesn't exist
            wallet = await this.db.v1.Wallet.GetWallet(userId); // The database level creates it automatically on GetWallet
            if (!wallet) throw new AppError(404, 'Wallet not found');
        }
        return wallet;
    }

    public async GetPaymentDetails(userId: string): Promise<Entities.PaymentDetails | null> {
        const wallet = await this.GetWallet(userId);
        return wallet.paymentDetails || null;
    }

    public async CreateCoinCheckoutSession(
        userId: string,
        coinAmount: number,
        usdCost: number,
        successUrl: string,
        cancelUrl: string
    ): Promise<{ sessionId: string; url: string }> {
        const user = await this.db.v1.User.GetUser({ id: userId });
        if (!user) throw new AppError(404, 'User not found');

        // Logic: 100 Coins = $1.00 USD
        // We create a one-time payment for the coins.
        // First we might need a Stripe Product/Price for "Coin Pack" or just use a dynamic payment.
        // To keep it simple and dynamic, we can create a dynamic price if it doesn't exist, 
        // but Stripe recommends fixed prices. 
        // For "Buy any amount", we can just pass the amount in cents.

        try {
            // We can create a generic "Coins" product if not exists
            // For now, let's assume we use createPaymentCheckoutSession from stripeService
            // Since we need to pass a priceId, we'll create a temporary price or use a fixed one.

            // Optimization: Create a standard the product for "TrueFans Coins"
            const productName = "TrueFans Coins";
            const product = await stripeService.createProduct(productName, `${coinAmount} Coins`);
            const price = await stripeService.createOneTimePrice(product.id, usdCost, 'usd');

            const session = await stripeService.createPaymentCheckoutSession(
                price.id,
                successUrl,
                cancelUrl,
                user.email,
                {
                    userId,
                    type: 'PURCHASE_COINS',
                    coinAmount: coinAmount.toString(),
                    usdCost: usdCost.toString()
                }
            );

            return {
                sessionId: session.id,
                url: session.url || ''
            };
        } catch (error) {
            Logger.error('WalletService.CreateCoinCheckoutSession failed', error);
            throw new AppError(500, 'Failed to create payment session');
        }
    }

    public async CreditWalletAfterPurchase(userId: string, coinAmount: number, usdCost: number, sessionId: string): Promise<void> {
        const wallet = await this.db.v1.Wallet.GetWallet(userId);
        if (!wallet) throw new AppError(404, 'Wallet not found');

        // Check if this session already credited to prevent double credit
        // In a real app, we'd check against a 'processedStripeSessions' table or similar.
        // For now, we can add the sessionId to metadata and check existing transactions.

        // Update Balance
        await this.db.v1.Wallet.IncrementBalance(userId, { coins: coinAmount });

        // Record in WalletTransactionModel
        await this.db.v1.Wallet.CreateTransaction({
            walletId: wallet.id,
            type: 'PURCHASE_COINS',
            amount: coinAmount,
            currency: 'COIN',
            status: 'COMPLETED',
            metadata: { usdCost, stripeSessionId: sessionId }
        });

        // Record in consolidated TransactionModel
        await this.db.v1.User.CreateTransaction({
            subscriberId: userId,
            creatorId: 'SYSTEM', // Coins are bought from the platform
            amount: usdCost,
            currency: 'USD',
            transactionType: 'payment',
            status: 'succeeded',
            description: `Purchased ${coinAmount} Coins`,
            metadata: { stripeSessionId: sessionId, coinAmount }
        });
    }

    public async CreditCreatorForDigitalSale(creatorId: string, amount: number, orderId: string): Promise<void> {
        const wallet = await this.db.v1.Wallet.GetWallet(creatorId);
        if (!wallet) throw new AppError(404, 'Creator wallet not found');

        // Credit USD balance immediately
        await this.db.v1.Wallet.IncrementBalance(creatorId, { usd: amount });

        // Record transaction
        await this.db.v1.Wallet.CreateTransaction({
            walletId: wallet.id,
            type: 'PRODUCT_SALE',
            amount: amount,
            currency: 'USD',
            status: 'COMPLETED',
            orderId: orderId,
            metadata: { description: 'Digital product sale' }
        });
    }

    public async ReleaseOrderEscrow(creatorId: string, amount: number, orderId: string): Promise<void> {
        const wallet = await this.db.v1.Wallet.GetWallet(creatorId);
        if (!wallet) throw new AppError(404, 'Creator wallet not found');

        // Credit USD balance after escrow release
        await this.db.v1.Wallet.IncrementBalance(creatorId, { usd: amount });

        // Record transaction
        await this.db.v1.Wallet.CreateTransaction({
            walletId: wallet.id,
            type: 'PRODUCT_SALE',
            amount: amount,
            currency: 'USD',
            status: 'COMPLETED',
            orderId: orderId,
            metadata: { description: 'Physical product sale escrow release' }
        });

        Logger.info('Escrow released to wallet', { creatorId, amount, orderId });
    }
    public async CreditCreatorForSubscription(creatorId: string, amount: number, subscriptionId: string): Promise<void> {
        const wallet = await this.db.v1.Wallet.GetWallet(creatorId);
        if (!wallet) throw new AppError(404, 'Creator wallet not found');

        // Credit USD balance immediately for subscription payment
        // In a real app, you might want to adjust for platform fees here if amount is gross.
        // Assuming 'amount' passed is netAmount.
        await this.db.v1.Wallet.IncrementBalance(creatorId, { usd: amount });

        // Record transaction
        await this.db.v1.Wallet.CreateTransaction({
            walletId: wallet.id,
            type: 'PRODUCT_SALE', // Using PRODUCT_SALE as a generic for revenue, or could add SUBSCRIPTION_SALE
            amount: amount,
            currency: 'USD',
            status: 'COMPLETED',
            metadata: { description: 'Subscription payment', subscriptionId }
        });

        Logger.info('Creator credited for subscription payment', { creatorId, amount, subscriptionId });
    }



    public async SendGift(senderId: string, recipientId: string, coinAmount: number): Promise<void> {
        if (senderId === recipientId) throw new AppError(400, 'Cannot gift yourself');

        const senderWallet = await this.db.v1.Wallet.GetWallet(senderId);
        if (!senderWallet || senderWallet.coinBalance < coinAmount) {
            throw new AppError(400, 'Insufficient coin balance');
        }

        const recipientWallet = await this.db.v1.Wallet.GetWallet(recipientId);
        if (!recipientWallet) throw new AppError(404, 'Recipient wallet not found');

        // Atomic transaction would be ideal here (MongoDB session).
        // For now, doing sequential updates.

        // Deduct from sender
        await this.db.v1.Wallet.IncrementBalance(senderId, { coins: -coinAmount });
        await this.db.v1.Wallet.CreateTransaction({
            walletId: senderWallet.id,
            type: 'GIFT_SEND',
            amount: coinAmount,
            currency: 'COIN',
            relatedUserId: recipientId,
            status: 'COMPLETED'
        });

        // Add to recipient
        await this.db.v1.Wallet.IncrementBalance(recipientId, { coins: coinAmount });
        await this.db.v1.Wallet.CreateTransaction({
            walletId: recipientWallet.id,
            type: 'GIFT_RECEIVE',
            amount: coinAmount,
            currency: 'COIN',
            relatedUserId: senderId,
            status: 'COMPLETED'
        });

        // Mirror in TransactionModel for reporting
        await this.db.v1.User.CreateTransaction({
            subscriberId: senderId,
            creatorId: recipientId,
            amount: coinAmount, // In coins for gifting
            currency: 'COIN',
            transactionType: 'payment',
            status: 'succeeded',
            description: `Gift of ${coinAmount} Coins sent`,
            metadata: { giftType: 'COIN' }
        });
    }

    public async Withdraw(userId: string, coinAmount: number): Promise<void> {
        const wallet = await this.db.v1.Wallet.GetWallet(userId);
        if (!wallet || wallet.coinBalance < coinAmount) {
            throw new AppError(400, 'Insufficient coin balance');
        }

        // Convert Coins to USD
        const EXCHANGE_RATE = 0.01; // 100 Coins = 1 USD
        const usdAmount = coinAmount * EXCHANGE_RATE;

        // 1. Deduct Coins
        await this.db.v1.Wallet.IncrementBalance(userId, { coins: -coinAmount });

        // 2. Add to internal USD balance
        await this.db.v1.Wallet.IncrementBalance(userId, { usd: usdAmount });

        // 3. Record conversion transaction
        await this.db.v1.Wallet.CreateTransaction({
            walletId: wallet.id,
            type: 'WITHDRAWAL',
            amount: coinAmount,
            currency: 'COIN',
            status: 'COMPLETED',
            metadata: { usdValue: usdAmount, note: 'Converted coins to USD balance' }
        });

        Logger.info('Coins converted to USD balance', { userId, coinAmount, usdAmount });
    }

    public async InitiateUSDPayout(userId: string, usdAmount: number): Promise<Entities.Payout> {
        const wallet = await this.db.v1.Wallet.GetWallet(userId);
        if (!wallet) throw new AppError(404, 'Wallet not found');

        // Check if payment details are set
        if (!wallet.paymentDetails && !wallet.bankDetails) {
            throw new AppError(400, 'Please set your payment details first');
        }

        // Validate balance
        if (wallet.usdBalance < usdAmount) {
            throw new AppError(400, 'Insufficient USD balance');
        }

        // 1. Deduct USD balance immediately
        await this.db.v1.Wallet.IncrementBalance(userId, { usd: -usdAmount });

        // 2. Create payout record with status 'pending'
        const payout = await this.db.v1.Wallet.CreatePayout({
            userId,
            walletId: wallet.id,
            amount: usdAmount,
            currency: 'USD',
            status: 'pending',
            paymentDetails: wallet.paymentDetails || (wallet.bankDetails ? {
                accountHolderName: wallet.bankDetails.accountName,
                accountNumber: wallet.bankDetails.accountNumber,
                bankName: wallet.bankDetails.bankName,
                paymentMethod: 'bank_us' // Fallback for legacy bankDetails
            } : undefined)
        });

        // 3. Record pending transaction
        await this.db.v1.Wallet.CreateTransaction({
            walletId: wallet.id,
            type: 'PAYOUT',
            amount: usdAmount,
            currency: 'USD',
            status: 'PENDING',
            payoutId: payout.id,
            metadata: { note: 'Payout request submitted' }
        });

        // 4. Mirror in global TransactionModel (as pending)
        await this.db.v1.User.CreateTransaction({
            subscriberId: userId,
            creatorId: 'SYSTEM',
            amount: usdAmount,
            currency: 'USD',
            transactionType: 'adjustment',
            status: 'pending',
            description: `Payout request for $${usdAmount.toFixed(2)} USD`,
            metadata: { type: 'PAYOUT', payoutId: payout.id }
        });

        Logger.info('USD Payout requested and balance deducted', { userId, usdAmount, payoutId: payout.id });
        return payout;
    }

    public async GetUserPayouts(userId: string, page: number = 1, limit: number = 10): Promise<{ payouts: Entities.Payout[]; total: number }> {
        return await this.db.v1.Wallet.GetPayoutsByUser(userId, { page, limit });
    }

    public async UpdatePaymentDetails(userId: string, details: Entities.PaymentDetails): Promise<{ otpRequired: boolean }> {
        const wallet = await this.db.v1.Wallet.GetWallet(userId);
        if (!wallet) throw new AppError(404, 'Wallet not found');

        // Logic: 
        // 1. If no existing payment details, or security is disabled, just update.
        // 2. If existing details and security is enabled, send OTP.

        const hasExistingDetails = !!(wallet.paymentDetails?.paymentMethod || wallet.bankDetails?.accountNumber);

        if (!hasExistingDetails || !wallet.payoutUpdateSecurity) {
            const updated = await this.db.v1.Wallet.SetPaymentDetails(userId, details);
            if (!updated) throw new AppError(500, 'Failed to update payment details');
            Logger.info('Payment details updated directly (no OTP)', { userId });
            return { otpRequired: false };
        }

        // Security enabled: Send OTP
        const user = await this.db.v1.User.GetUser({ id: userId });
        if (!user) throw new AppError(404, 'User not found');

        const otp = generateRandomOTP(6);
        await this.db.v1.Auth.StoreSessionToken({ userId, otp, metadata: details });

        const emailService = new EmailService();
        await emailService.SendMail(user.email, `Your OTP to update payment details is: ${otp}. This code expires in 10 minutes.`);

        Logger.info('Payment detail update OTP sent', { userId });
        return { otpRequired: true };
    }

    public async ConfirmPaymentDetailsUpdate(userId: string, otp: string): Promise<void> {
        const session = await this.db.v1.Auth.GetSession({ userId, otp });
        if (!session || !session.metadata) {
            throw new AppError(400, 'Invalid or expired OTP');
        }

        const details = session.metadata as Entities.PaymentDetails;
        const updated = await this.db.v1.Wallet.SetPaymentDetails(userId, details);
        if (!updated) throw new AppError(500, 'Failed to update payment details');

        // Clear session
        await this.db.v1.Auth.DeleteSession({ id: session.id });

        Logger.info('Payment details updated after OTP verification', { userId });
    }

    public async TogglePayoutSecurity(userId: string, enabled: boolean): Promise<void> {
        const updated = await this.db.v1.Wallet.SetPayoutSecurity(userId, enabled);
        if (!updated) throw new AppError(500, 'Failed to update security settings');
        Logger.info('Payout security toggle', { userId, enabled });
    }

    public async LinkBankDetails(userId: string, details: NonNullable<Entities.Wallet['bankDetails']>): Promise<void> {
        const wallet = await this.db.v1.Wallet.GetWallet(userId);
        if (!wallet) throw new AppError(404, 'Wallet not found');

        const updated = await this.db.v1.Wallet.SetBankDetails(userId, details);
        if (!updated) throw new AppError(500, 'Failed to update bank details');

        Logger.info('Bank details linked successfully', { userId });
    }

    public async GetTransactions(userId: string, page: number = 1, limit: number = 20): Promise<{ transactions: Entities.WalletTransaction[]; total: number }> {
        const wallet = await this.db.v1.Wallet.GetWallet(userId);
        if (!wallet) throw new AppError(404, 'Wallet not found');

        return await this.db.v1.Wallet.GetTransactions(wallet.id, { page, limit });
    }
}
