import { z } from 'zod';

export const SetPaymentDetailsBodySchema = z.object({
    paymentMethod: z.enum(['bank_us', 'bank_international', 'paypal']),

    // Account holder
    accountHolderName: z.string().min(1, 'Account holder name is required'),
    accountHolderType: z.enum(['individual', 'company']).optional(),

    // US Bank (required if bank_us)
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(),
    accountType: z.enum(['checking', 'savings']).optional(),

    // International (required if bank_international)
    swiftBic: z.string().optional(),
    iban: z.string().optional(),

    // Bank info
    bankName: z.string().optional(),
    bankAddress: z.string().optional(),
    bankCity: z.string().optional(),
    bankCountry: z.string().optional(),
    bankPostalCode: z.string().optional(),

    // Beneficiary address
    beneficiaryAddress: z.string().optional(),
    beneficiaryCity: z.string().optional(),
    beneficiaryState: z.string().optional(),
    beneficiaryCountry: z.string().optional(),
    beneficiaryPostalCode: z.string().optional(),

    // PayPal (required if paypal)
    paypalEmail: z.string().email('Invalid PayPal email').optional(),
}).refine((data) => {
    if (data.paymentMethod === 'bank_us') {
        return !!data.accountNumber && !!data.routingNumber && !!data.bankName;
    }
    if (data.paymentMethod === 'bank_international') {
        return !!data.iban && !!data.swiftBic && !!data.bankName && !!data.beneficiaryAddress;
    }
    if (data.paymentMethod === 'paypal') {
        return !!data.paypalEmail;
    }
    return true;
}, {
    message: "Missing required fields for the selected payment method",
    path: ["paymentMethod"]
});

export type SetPaymentDetailsBody = z.infer<typeof SetPaymentDetailsBodySchema>;

export const RequestPayoutBodySchema = z.object({
    amount: z.number().positive('Amount must be positive'),
});

export type RequestPayoutBody = z.infer<typeof RequestPayoutBodySchema>;

// Legacy support
export const SetBankDetailsBodySchema = z.object({
    accountName: z.string().min(1, 'Account name is required'),
    accountNumber: z.string().min(1, 'Account number is required'),
    bankName: z.string().min(1, 'Bank name is required'),
    bankCode: z.string().min(1, 'Bank code is required'),
});

export type SetBankDetailsBody = z.infer<typeof SetBankDetailsBodySchema>;
