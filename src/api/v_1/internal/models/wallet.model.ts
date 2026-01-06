import { z } from 'zod';

export const SetBankDetailsBodySchema = z.object({
    accountName: z.string().min(1, 'Account name is required'),
    accountNumber: z.string().min(1, 'Account number is required'),
    bankName: z.string().min(1, 'Bank name is required'),
    bankCode: z.string().min(1, 'Bank code is required'),
});

export type SetBankDetailsBody = z.infer<typeof SetBankDetailsBodySchema>;
