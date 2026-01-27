import mongoose, { Schema } from 'mongoose';
import { Entities } from '../../helpers';

const CategorySchema = new Schema(
    {
        name: { type: String, required: true },
        parentId: { type: String, default: null },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

export const CategoryModel = mongoose.model<Entities.Category>('Category', CategorySchema as any);

const FollowerSchema = new Schema(
    {
        userId: { type: String, required: true, ref: 'User' }, // Creator
        followerId: { type: String, required: true, ref: 'User' }, // Follower
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);
// Compound index to prevent duplicate follows
FollowerSchema.index({ userId: 1, followerId: 1 }, { unique: true });

export const FollowerModel = mongoose.model<Entities.Follower>('Follower', FollowerSchema as any);

const MembershipSchema = new Schema(
    {
        creatorId: { type: String, required: true, ref: 'User' },
        name: { type: String, required: true },
        price: { type: String, required: true }, // Changed to String to match Entity
        currency: { type: String, required: true },
        description: { type: String },
        imageUrl: { type: String },
        stripeProductId: { type: String },
        stripePriceId: { type: String },
        platformFee: { type: Number },
        priceWithFee: { type: Number },
        tier: { type: Number, enum: [1, 2, 3], default: 1 }, // Tier level: 1 (lowest), 2, 3
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

export const MembershipModel = mongoose.model<Entities.Membership>('Membership', MembershipSchema as any);

const SubscriptionSchema = new Schema(
    {
        creatorId: { type: String, required: true, ref: 'User' },
        subscriberId: { type: String, required: true, ref: 'User' },
        membershipId: { type: String, required: true, ref: 'Membership' },
        stripeSubscriptionId: { type: String },
        stripeCustomerId: { type: String },
        subscriptionStatus: { type: String, enum: ['active', 'canceled', 'past_due', 'incomplete', 'trialing', 'paused'], default: 'incomplete' },
        isActive: { type: Boolean, default: false },
        startedAt: { type: String },
        canceledAt: { type: String },
        cancelReason: { type: String },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

export const SubscriptionModel = mongoose.model<Entities.Subscription>('Subscription', SubscriptionSchema as any);

const ProductSchema = new Schema(
    {
        creatorId: { type: String, required: true, ref: 'User' },
        name: { type: String, required: true },
        description: { type: String },
        mediaUrl: { type: String }, // Preview image/thumbnail
        accessType: { type: String, default: 'free', enum: ['free', 'premium'] },
        allowedMembershipIds: [{ type: String }],
        price: { type: String, required: true },
        stripeProductId: { type: String },
        stripePriceId: { type: String },
        platformFee: { type: Number },
        priceWithFee: { type: Number },

        // Product type: digital or physical
        productType: { type: String, enum: ['digital', 'physical'], default: 'digital' },

        // Digital product fields
        digitalFileUrl: { type: String },     // S3 URL for downloadable file
        digitalFileName: { type: String },    // Original filename
        digitalFileSize: { type: Number },    // File size in bytes

        // Physical product fields
        stockQuantity: { type: Number, default: 0 },
        shippingInfo: { type: String },       // Shipping details/notes

        // Common fields
        isActive: { type: Boolean, default: true },
        images: [{ type: String }],           // Array of image URLs
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

export const ProductModel = mongoose.model<Entities.Product>('Product', ProductSchema as any);

// Order Schema for product purchases with escrow support
const OrderSchema = new Schema(
    {
        orderId: { type: String, required: true, unique: true }, // ORD-XXXXXX format
        userId: { type: String, ref: 'User' },                   // Optional for guest checkout
        guestEmail: { type: String },                            // Required if no userId
        guestName: { type: String },                             // Guest name
        creatorId: { type: String, required: true, ref: 'User' },
        productId: { type: String, required: true, ref: 'Product' },

        // Order details
        quantity: { type: Number, default: 1 },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'USD' },

        // Status
        status: {
            type: String,
            enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
            default: 'pending'
        },

        // Payment
        stripePaymentIntentId: { type: String },
        stripeCheckoutSessionId: { type: String },
        paymentStatus: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },

        // Shipping (for physical products)
        shippingAddress: {
            fullName: { type: String },
            address1: { type: String },
            address2: { type: String },
            city: { type: String },
            state: { type: String },
            postalCode: { type: String },
            country: { type: String },
            phone: { type: String },
        },
        trackingNumber: { type: String },

        // For digital products
        digitalAccessGranted: { type: Boolean, default: false },

        // ESCROW for physical products (money held at order level)
        escrowStatus: { type: String, enum: ['none', 'held', 'released', 'refunded'], default: 'none' },
        escrowAmount: { type: Number },
        escrowReleaseAt: { type: Date },      // When escrow should be auto-released (createdAt + 48h)
        escrowReleasedAt: { type: Date },     // When actually released to creator wallet

        creatorPaidAt: { type: Date },
        originalPrice: { type: Number },
        priceWithFee: { type: Number },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

// Index for efficient queries
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ creatorId: 1, createdAt: -1 });
OrderSchema.index({ escrowStatus: 1, escrowReleaseAt: 1 }); // For escrow release job
OrderSchema.index({ guestEmail: 1 });

export const OrderModel = mongoose.model<Entities.Order>('Order', OrderSchema as any);

const EventSchema = new Schema(
    {
        creatorId: { type: String, required: true, ref: 'User' },
        name: { type: String, required: true },
        description: { type: String },
        mediaUrl: { type: String },
        eventDate: { type: String },
        liveStreamLink: { type: String },
        isFree: { type: Boolean, default: true },
        memberShipId: { type: String },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

export const EventModel = mongoose.model<Entities.Event>('Event', EventSchema as any);

// Check if we need ProductPurchase model?
// Entities.ProductPurchase exists.
const ProductPurchaseSchema = new Schema(
    {
        userId: { type: String, required: true, ref: 'User' },
        productId: { type: String, required: true, ref: 'Product' },
        creatorId: { type: String, required: true, ref: 'User' },
        stripeCheckoutSessionId: { type: String },
        stripePaymentIntentId: { type: String },
        stripeChargeId: { type: String },
        stripeCustomerId: { type: String },
        amount: { type: Number, required: true },
        currency: { type: String, required: true },
        status: { type: String, default: 'pending' },
        platformFee: { type: Number },
        priceWithFee: { type: Number },
        originalPrice: { type: Number },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

export const ProductPurchaseModel = mongoose.model<Entities.ProductPurchase>('ProductPurchase', ProductPurchaseSchema as any);

const GroupInviteSchema = new Schema(
    {
        creatorId: { type: String, required: true, ref: 'User' },
        groupName: { type: String, required: true },
        platform: { type: String, required: true },
        link: { type: String, required: true },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

export const GroupInviteModel = mongoose.model<Entities.GroupInvite>('GroupInvite', GroupInviteSchema as any);

const TransactionSchema = new Schema(
    {
        subscriptionId: { type: String },
        productId: { type: String },
        subscriberId: { type: String, required: true, ref: 'User' },
        creatorId: { type: String, required: true, ref: 'User' },
        stripePaymentIntentId: { type: String },
        stripeChargeId: { type: String },
        stripeInvoiceId: { type: String },
        stripePaymentMethodId: { type: String },
        stripeCustomerId: { type: String },
        transactionType: { type: String, enum: ['subscription', 'payment', 'refund', 'chargeback', 'adjustment'], required: true },
        status: { type: String, enum: ['succeeded', 'failed', 'pending', 'canceled', 'refunded'], required: true },
        amount: { type: Number, required: true },
        currency: { type: String, required: true },
        fee: { type: Number },
        netAmount: { type: Number },
        platformFee: { type: Number },
        originalPrice: { type: Number },
        priceWithFee: { type: Number },
        balanceStatus: { type: String, enum: ['incoming', 'available'] },
        billingPeriodStart: { type: String },
        billingPeriodEnd: { type: String },
        processedAt: { type: String },
        failedAt: { type: String },
        failureReason: { type: String },
        retryCount: { type: Number, default: 0 },
        refundAmount: { type: Number },
        refundedAt: { type: String },
        refundReason: { type: String },
        metadata: { type: Schema.Types.Mixed },
        description: { type: String },
        receiptUrl: { type: String },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

export const TransactionModel = mongoose.model<Entities.Transaction>('Transaction', TransactionSchema as any);

const VerificationTokenSchema = new Schema(
    {
        userId: { type: String, required: true, ref: 'User' },
        token: { type: String, required: true, unique: true },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

export const VerificationTokenModel = mongoose.model('VerificationToken', VerificationTokenSchema);

const NotificationSchema = new Schema(
    {
        userId: { type: String, required: true, ref: 'User' },
        title: { type: String, required: true },
        message: { type: String, required: true },
        redirectUrl: { type: String },
        fromUserId: { type: String },
        fromUserName: { type: String },
        fromUserCreatorName: { type: String },
        fromUserProfilePhoto: { type: String },
        isRead: { type: Boolean, default: false },
        type: { type: String, enum: ['member', 'creator'], required: true },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

export const NotificationModel = mongoose.model<Entities.Notification>('Notification', NotificationSchema as any);
