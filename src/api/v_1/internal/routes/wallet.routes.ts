import { Router } from 'express';
import { WalletController } from '../controller/wallet.controller';
import { jwtAuth } from '../middlewares/api-auth';

export const walletRoutes = Router();
const controller = new WalletController();

walletRoutes.get('/', jwtAuth, controller.getWallet);
walletRoutes.get('/transactions', jwtAuth, controller.getTransactions);
walletRoutes.post('/buy-coins', jwtAuth, controller.buyCoins);
walletRoutes.post('/gift', jwtAuth, controller.sendGift);
walletRoutes.post('/withdraw', jwtAuth, controller.withdraw);
walletRoutes.post('/payout', jwtAuth, controller.requestPayout);
walletRoutes.get('/payouts', jwtAuth, controller.getPayouts);
walletRoutes.post('/bank-details', jwtAuth, controller.setBankDetails);
walletRoutes.post('/payment-details', jwtAuth, controller.setPaymentDetails);
walletRoutes.get('/payment-details', jwtAuth, controller.getPaymentDetails);
walletRoutes.post('/confirm-payment-details', jwtAuth, controller.confirmPaymentDetailsUpdate);
walletRoutes.post('/toggle-payout-security', jwtAuth, controller.togglePayoutSecurity);
