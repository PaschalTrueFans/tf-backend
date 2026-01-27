### 1. Product Creation (Creator Dashboard)
- **Endpoint**: `POST /api/v1/user/products` (Protected)
- **Payload**:
  ```json
  {
    "name": "Digital Art Pack",
    "description": "High-res textures",
    "price": "10.00",
    "productType": "digital", // or "physical"
    "digitalFileUrl": "https://s3.aws...", // Required if digital
    "stockQuantity": 100, // Required if physical
    "shippingInfo": "Ships within 24h", // Optional for physical
    "mediaUrl": "https://..." // Preview image
  }
  ```

### 2. Store Page (Public)
- **Endpoint**: `GET /api/v1/user/creator/store/:creatorId` (Public)
- **Display**: List `products` array.
- **Product Card**: Show `name`, `price`, `mediaUrl`.
- **Actions**: "Buy Now" button.

### 3. Checkout Flow (Step-by-Step)
This endpoint handles both **Logged-in Users** and **Unsigned Guests**.

- **Endpoint**: `POST /api/v1/user/orders/checkout`
- **Method**: `POST`
- **Payload Structure**:
  ```json
  {
    "productId": "prod_123",
    "successUrl": "https://your-app.com/checkout/success?orderId={CHECKOUT_SESSION_ID}", 
    "cancelUrl": "https://your-app.com/store",
    "guestEmail": "user@example.com", // REQUIRED only if NOT logged in
    "guestName": "John Doe" // Optional for guests
  }
  ```
- **Scenario A: Logged-in User**
  - Do NOT pass `guestEmail`.
  - The backend will automatically link the order to the `userId` from the JWT token.
- **Scenario B: Unsigned Guest**
  - You MUST pass `guestEmail`.
  - No JWT token is needed (Public route).
- **Response**: 
  ```json
  { "data": { "url": "https://checkout.stripe.com/...", "sessionId": "cs_test_..." } }
  ```
- **Action**: Redirect the user to the Stripe `url`.

### 4. Post-Checkout Verification
When the user returns to your `successUrl`:
1.  Show a "Processing your order..." loader.
2.  **Verification**: The backend processes the payment via webhooks. To confirm the order is ready, you can either:
    - Poll `GET /api/v1/user/orders/:orderId` (using the Stripe `sessionId` as the ID).
    - Or redirect them to their **Order History** page.
3.  **Success**: Once the order status is `paid`, grant access to digital files or show shipping confirmation.

### 4. Buyer Dashboard
- **Order History**:
  - **Endpoint**: `GET /api/v1/user/orders`
  - **Display**: List of past orders with status.
  - **Key Fields**: `orderId`, `status`, `amount`, `productName`, `productDetails`.
  - **Note**: `productName` and `productDetails` are available at the top level for easy display without extra lookups.
- **Digital Downloads**:
  - **Endpoint**: `GET /api/v1/user/products/digital/purchased`
  - **Download**: `GET /api/v1/user/products/digital/:productId/download` -> Returns `{ "data": { "downloadUrl": "..." } }`

### 5. Sales Dashboard (Creator)
- **Endpoint**: `GET /api/v1/user/sales`
- **Display**: Table of incoming orders.
- **Key Fields**: `orderId`, `status`, `amount`, `escrowStatus`, `productName`, `productDetails`.
- **Note**: Use `productName` and `productDetails` for the row labels in your sales table.
- **Escrow Logic**: If `escrowStatus` == 'held', show "Pending Release (48h)".
- **Fulfillment (Physical)**:
  - **Mark Shipped**: `PUT /api/v1/user/orders/:orderId/status`
  - **Body**: `{ "status": "shipped", "trackingNumber": "TRACK123" }`

### Fraud Protection Note
- **Digital Products**: Funds released to wallet **immediately**.
- **Physical Products**: Funds held in **Escrow** for 48 hours. Creators see this as "Pending" or "Held" in their sales view.

### 6. Wallet & Earnings Dashboard
- **Endpoint**: `GET /api/v1/user/payouts/wallet-balance`
- **Display**:
  - `totalBalance`, `availableBalance` (can withdraw), `pendingBalance` (escrow or incoming).
- **History**: `GET /api/v1/user/payouts/transactions?userId=...`
  - Shows list of `PRODUCT_SALE`, `WITHDRAWAL`, etc.
  - `PRODUCT_SALE` entries will now include `orderId`.

### 7. Memberships & Subscriptions
- **List Memberships**: `GET /api/v1/user/creators/:creatorId/memberships`
- **Subscribe (Stripe Checkout)**:
  - **Endpoint**: `POST /api/v1/user/checkout-session`
  - **Body**:
    ```json
    {
      "membershipId": "mem_123",
      "successUrl": "https://your-app.com/subscribe/success",
      "cancelUrl": "https://your-app.com/creator/page"
    }
    ```
  - **Action**: Redirect user to the returned Stripe `url`.
  - **Response**:
    ```json
    {
      "data": {
        "sessionId": "cs_test_...",
        "url": "https://checkout.stripe.com/..."
      }
    }
    ```
- **My Subscriptions**: `GET /api/v1/user/subscriptions`
- **Cancel Subscription**: `POST /api/v1/user/subscriptions/:subscriptionId/cancel`
- **Creator Earnings**: Subscription payments are automatically added to the creator's `availableBalance` in their wallet once processed by the platform.

### 8. User Information & Profile
- **Get Current User**: `GET /api/v1/user/`
- **Key Fields**: `id`, `name`, `email`, `subscribedMemberships`.
- **Note on Subscriptions**: The `subscribedMemberships` array contains objects with `creatorId`, `membershipId`, and `tier`. Use this to determine which creator pages the user can access premium content on.
