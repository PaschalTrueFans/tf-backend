import { Response, Request } from 'express';
import { Db } from '../../../../database/db';
import { Logger } from '../../../../helpers/logger';
import { genericError, RequestBody } from '../../../../helpers/utils';
import { WalletService } from '../services/wallet.service';
import { SetBankDetailsBodySchema, SetPaymentDetailsBodySchema, RequestPayoutBodySchema } from '../models/wallet.model';
import { AppError } from '../../../../helpers/errors';

export class WalletController {
    constructor() {
        Logger.info('Wallet controller initialized...');
    }

    public getWallet = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const service = new WalletService({ db });
            const userId = req.userId;
            const wallet = await service.GetWallet(userId);
            body = { data: wallet };
        } catch (error) {
            genericError(error, res);
        }
        res.json(body);
    };

    public getPaymentDetails = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const service = new WalletService({ db });
            const userId = req.userId;
            const details = await service.GetPaymentDetails(userId);
            body = { data: details };
        } catch (error) {
            genericError(error, res);
        }
        res.json(body);
    };

    public buyCoins = async (req: RequestBody<{ amount: number; usdCost: number; successUrl: string; cancelUrl: string }>, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const service = new WalletService({ db });
            const userId = req.userId;
            const { amount, usdCost, successUrl, cancelUrl } = req.body;

            if (!amount || !usdCost || !successUrl || !cancelUrl) {
                throw new Error('Missing required fields: amount, usdCost, successUrl, cancelUrl');
            }

            const session = await service.CreateCoinCheckoutSession(userId, amount, usdCost, successUrl, cancelUrl);
            body = { data: session };
        } catch (error) {
            genericError(error, res);
        }
        res.json(body);
    };



    public sendGift = async (req: RequestBody<{ recipientId: string; coinAmount: number }>, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const service = new WalletService({ db });
            const userId = req.userId;
            const { recipientId, coinAmount } = req.body;

            await service.SendGift(userId, recipientId, coinAmount);
            body = { message: 'Gift sent successfully' };
        } catch (error) {
            genericError(error, res);
        }
        res.json(body);
    };

    public withdraw = async (req: RequestBody<{ coinAmount: number }>, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const service = new WalletService({ db });
            const userId = req.userId;
            const { coinAmount } = req.body;

            await service.Withdraw(userId, coinAmount);
            body = { message: 'Coins converted to USD balance successfully' };
        } catch (error) {
            genericError(error, res);
        }
        res.json(body);
    };

    public requestPayout = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const service = new WalletService({ db });
            const userId = req.userId;

            const { amount } = await RequestPayoutBodySchema.parseAsync(req.body);

            const payout = await service.InitiateUSDPayout(userId, amount);
            body = { message: 'Payout request submitted successfully', data: payout };
        } catch (error) {
            genericError(error, res);
        }
        res.json(body);
    };

    public getPayouts = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const service = new WalletService({ db });
            const userId = req.userId;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await service.GetUserPayouts(userId, page, limit);
            body = { data: result };
        } catch (error) {
            genericError(error, res);
        }
        res.json(body);
    };

    public setPaymentDetails = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const service = new WalletService({ db });
            const userId = req.userId;

            const validatedBody = await SetPaymentDetailsBodySchema.parseAsync(req.body);

            const result = await service.UpdatePaymentDetails(userId, validatedBody);

            if (result.otpRequired) {
                body = { message: 'OTP sent to your email to confirm payment details update', otpRequired: true };
            } else {
                body = { message: 'Payment details updated successfully', otpRequired: false };
            }
        } catch (error) {
            genericError(error, res);
        }
        res.json(body);
    };

    public confirmPaymentDetailsUpdate = async (req: RequestBody<{ otp: string }>, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const service = new WalletService({ db });
            const userId = req.userId;
            const { otp } = req.body;

            if (!otp) throw new AppError(400, 'OTP is required');

            await service.ConfirmPaymentDetailsUpdate(userId, otp);
            body = { message: 'Payment details confirmed and updated successfully' };
        } catch (error) {
            genericError(error, res);
        }
        res.json(body);
    };

    public togglePayoutSecurity = async (req: RequestBody<{ enabled: boolean }>, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const service = new WalletService({ db });
            const userId = req.userId;
            const { enabled } = req.body;

            if (typeof enabled !== 'boolean') throw new AppError(400, 'enabled must be a boolean');

            await service.TogglePayoutSecurity(userId, enabled);
            body = { message: `Payout security ${enabled ? 'enabled' : 'disabled'} successfully` };
        } catch (error) {
            genericError(error, res);
        }
        res.json(body);
    };

    public setBankDetails = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const service = new WalletService({ db });
            const userId = req.userId;

            const validatedBody = await SetBankDetailsBodySchema.parseAsync(req.body);

            await service.LinkBankDetails(userId, validatedBody);
            body = { message: 'Bank details linked successfully' };
        } catch (error) {
            genericError(error, res);
        }
        res.json(body);
    };

    public getTransactions = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const service = new WalletService({ db });
            const userId = req.userId;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            const result = await service.GetTransactions(userId, page, limit);
            body = { data: result };
        } catch (error) {
            genericError(error, res);
        }
        res.json(body);
    };
}
