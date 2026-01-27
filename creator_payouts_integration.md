# Creator Payout/Withdrawal System Integration Guide

This guide outlines how to integrate the new Payout and Withdrawal system for creators and admins.

## 🚀 The Payout Workflow
1.  **Request Payout**: Creator requests a withdrawal. The requested amount is **immediately deducted** from their USD balance.
2.  **Pending Status**: A `payout` record is created with a `pending` status, and a `PAYOUT` transaction is recorded as `PENDING`.
3.  **Admin Review**:
    *   **Approve**: Admin approves the request. The transaction status is updated to `COMPLETED`.
    *   **Reject**: Admin rejects the request. The funds are **refunded** back to the creator's wallet, and a refund transaction is recorded.
4.  **Mark as Paid**: Admin marks the approved payout as `completed` once the manual transfer is finished.

---

## 🛠️ Endpoints for Creators

### 1. Fetch Current Payment Details
Use this to display the configured payout method (pre-filling settings).

**Endpoint:** `GET /api/v_1/wallet/payment-details`  
**Authentication:** Required (JWT)

### 2. Update Payment Details
Supported methods: `bank_us`, `bank_international`, `paypal`.

**Endpoint:** `POST /api/v_1/wallet/payment-details`  
**Authentication:** Required (JWT)

**Security: Protecting Payment Changes**
By default, if a user already has a bank account or PayPal email linked, updating it will require an **OTP** sent to their email.

*   **Initial Setup**: If no details exist, the update is immediate.
*   **Subsequent Updates**: If security is enabled (default), the API returns `{"otpRequired": true}` and sends an email.
*   **Confirmation**: Use the endpoint below to finish the update.

**Example Payload (Bank US):**
```json
{
  "paymentMethod": "bank_us",
  "accountHolderName": "John Doe",
  "accountNumber": "123456789",
  "routingNumber": "987654321",
  "bankName": "Chase Bank",
  "accountType": "checking"
}
```

### 3. Confirm Payment Update (If OTP required)
**Endpoint:** `POST /api/v_1/wallet/confirm-payment-details`  
**Payload:** `{"otp": "123456"}`

### 4. Toggle Payout Security
Users can optionally turn off this OTP requirement, though it is enabled by default.

**Endpoint:** `POST /api/v_1/wallet/toggle-payout-security`  
**Payload:** `{"enabled": false}`

---

## 5. Request a Payout
**Action:** Deducts balance immediately and creates a pending request.

**Endpoint:** `POST /api/v_1/wallet/payout`  
**Authentication:** Required (JWT)

**Payload:**
```json
{
  "amount": 100.00
}
```

### 4. View Payout History
**Endpoint:** `GET /api/v_1/wallet/payouts?page=1&limit=10`  
**Authentication:** Required (JWT)

---

## 🛠️ Endpoints for Admins

### 1. List All Payout Requests
**Endpoint:** `GET /api/v_1/admin/payouts?status=pending&page=1&limit=10`

### 2. Approve Payout
Confirms the deduction and marks it ready for transfer.

**Endpoint:** `PUT /api/v_1/admin/payouts/:payoutId/approve`

### 3. Reject Payout
**Action:** Refunds the amount back to the creator's wallet.

**Endpoint:** `PUT /api/v_1/admin/payouts/:payoutId/reject`  
**Payload:** `{"reason": "Incorrect bank details"}`

### 4. Mark as Paid
Final step after manual disbursement.

**Endpoint:** `PUT /api/v_1/admin/payouts/:payoutId/paid`  
**Payload (Optional):**
```json
{
  "providerDetails": {
    "provider": "Stripe/Wise/Manual",
    "transferId": "TXN_12345"
  }
}
```
