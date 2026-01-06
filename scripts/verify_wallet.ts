import { Db } from '../src/database/db';
import { WalletService } from '../src/api/v_1/internal/services/wallet.service';
import mongoose from 'mongoose';
import { Entities } from '../src/helpers';

async function main() {
    console.log('Initializing DB...');
    await Db.Instance.Init();
    const db = Db.Instance;
    const walletService = new WalletService({ db });

    try {
        // Create Test Users
        console.log('Creating Test Users...');
        const senderId = new mongoose.Types.ObjectId().toString();
        const recipientId = new mongoose.Types.ObjectId().toString();

        await db.v1.User.CreateUser({
            _id: new mongoose.Types.ObjectId(senderId),
            name: 'Sender Test',
            email: `sender_${Date.now()}@test.com`,
            password: 'password'
        } as any);

        await db.v1.User.CreateUser({
            _id: new mongoose.Types.ObjectId(recipientId),
            name: 'Recipient Test',
            email: `recipient_${Date.now()}@test.com`,
            password: 'password'
        } as any);

        console.log(`Sender: ${senderId}, Recipient: ${recipientId}`);

        // 1. Buy Coins
        console.log('Step 1: Buying Coins...');
        await walletService.CreditWalletAfterPurchase(senderId, 1000, 10, 'TEST_SESSION');
        const walletAfterBuy = await walletService.GetWallet(senderId);
        console.log('Sender Wallet after buy:', walletAfterBuy);

        if (walletAfterBuy.coinBalance !== 1000) throw new Error('Buy Coins failed');

        // 2. Send Gift
        console.log('Step 2: Sending Gift...');
        await walletService.SendGift(senderId, recipientId, 500);

        const senderWalletAfterGift = await walletService.GetWallet(senderId);
        const recipientWalletAfterGift = await walletService.GetWallet(recipientId);

        console.log('Sender Balance:', senderWalletAfterGift.coinBalance);
        console.log('Recipient Balance:', recipientWalletAfterGift.coinBalance);

        if (senderWalletAfterGift.coinBalance !== 500) throw new Error('Sender balance incorrect after gift');
        if (recipientWalletAfterGift.coinBalance !== 500) throw new Error('Recipient balance incorrect after gift');

        // 3. Withdraw
        console.log('Step 3: Withdrawing...');
        await walletService.Withdraw(recipientId, 200);

        const recipientWalletAfterWithdraw = await walletService.GetWallet(recipientId);
        console.log('Recipient Balance after withdraw:', recipientWalletAfterWithdraw);

        if (recipientWalletAfterWithdraw.coinBalance !== 300) throw new Error('Withdraw coin deduction failed');
        // Check USD balance (assuming 1 coin = 0.01 USD => 200 coins = 2 USD)
        if (recipientWalletAfterWithdraw.usdBalance !== 2) throw new Error('Withdraw USD conversion failed');

        // 4. Get Transactions
        console.log('Step 4: Fetching Transactions...');
        const senderTransactions = await walletService.GetTransactions(senderId);
        console.log('Sender Transactions Count:', senderTransactions.total);
        if (senderTransactions.total < 2) throw new Error('Sender transactions missing (Buy + Gift Send)');

        const recipientTransactions = await walletService.GetTransactions(recipientId);
        console.log('Recipient Transactions Count:', recipientTransactions.total);
        if (recipientTransactions.total < 2) throw new Error('Recipient transactions missing (Gift Receive + Withdraw)');

        console.log('VERIFICATION SUCCESSFUL');

    } catch (error) {
        console.error('Verification Failed:', error);
    } finally {
        await Db.Instance.DisconnectDb();
    }
}

main();
