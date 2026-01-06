import { Response, Request } from 'express';
import { Db } from '../../../../database/db';
import { Logger } from '../../../../helpers/logger';
import { genericError, RequestBody } from '../../../../helpers/utils';
import { WalletService } from '../services/wallet.service';
import { SetBankDetailsBodySchema } from '../models/wallet.model';

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

    public requestPayout = async (req: RequestBody<{ usdAmount: number }>, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const service = new WalletService({ db });
            const userId = req.userId;
            const { usdAmount } = req.body;

            await service.InitiateUSDPayout(userId, usdAmount);
            body = { message: 'Payout request initiated successfully' };
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
