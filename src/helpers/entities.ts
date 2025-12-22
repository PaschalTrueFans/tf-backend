export interface DataForToken {
  id: string;
}

export interface DefaultTable {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface User extends DefaultTable {
  name: string;
  email: string;
  password?: string;
  pageName?: string;
  creatorName?: string;
  is18Plus?: boolean;
  profilePhoto?: string;
  bio?: string;
  coverPhoto?: string;
  introVideo?: string;
  themeColor?: string;
  socialLinks?: any; // JSON field
  tags?: string[];
  categoryId?: string;
  isVerified?: boolean;
  isBlocked: boolean;
  role?: 'creator' | 'member';
}

export interface Admin extends DefaultTable {
  email: string;
  password: string;
  name: string;
  role?: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'completed';

export interface Ticket extends DefaultTable {
  userId: string;
  subject: string;
  message: string;
  status: TicketStatus;
}

export interface TicketComment extends DefaultTable {
  ticketId: string;
  adminId: string | null;
  comment: string;
}

export interface SystemNotification extends DefaultTable {
  title: string;
  message: string;
  adminId: string | null;
}

export interface EmailBroadcast extends DefaultTable {
  subject: string;
  message: string;
  recipientCount: number;
  adminId: string | null;
}


export interface verifyOtp {
  id: string;
  userId: string;
  otp: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerifiedUser {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  updatedAt: string;
}

export enum s3Paths {
  profilePictures = 'profile-pictures/',
  membershipImages = 'membership-images/',
}

export interface Follower extends DefaultTable {
  userId: string;
  followerId: string;
}

export interface Category extends DefaultTable {
  name: string;
  parentId: string | null;
}

export interface Post extends DefaultTable {
  creatorId: string;
  title: string;
  content: string;
  accessType: string; // 'free' | 'paid' (or membership-based)
  tags?: string[] | null;
  totalLikes: number;
  mediaFiles?: PostMediaFile[] | null;
  allowedMembershipIds?: string[];
}

export interface PostMediaFile extends DefaultTable {
  postId: string;
  type: string; // image | video | audio | other
  url: string;
  name?: string | null;
  size?: number | null;
}

export interface PostComment extends DefaultTable {
  postId: string;
  userId: string;
  comment: string;
}

export interface Membership extends DefaultTable {
  creatorId: string;
  name: string;
  price: string;
  currency: string;
  description?: string;
  imageUrl?: string;
  stripeProductId?: string;
  stripePriceId?: string;
  platformFee?: number;
  priceWithFee?: number;
}

export interface Product extends DefaultTable {
  creatorId: string;
  name: string;
  description?: string;
  mediaUrl?: string; // For digital products
  accessType?: 'free' | 'premium';
  allowedMembershipIds?: string[];
  price: string;
  stripeProductId?: string;
  stripePriceId?: string;
  platformFee?: number;
  priceWithFee?: number;
}

export interface Event extends DefaultTable {
  creatorId: string;
  name: string;
  description?: string;
  mediaUrl?: string;
  eventDate?: string;
  liveStreamLink?: string;
  isFree?: boolean;
  memberShipId?: string;
}

export interface Subscription extends DefaultTable {
  subscriberId: string;
  creatorId: string;
  membershipId: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing' | 'paused';
  isActive: boolean;
  startedAt?: string;
  canceledAt?: string;
  cancelReason?: string;
}

export interface Transaction extends DefaultTable {
  subscriptionId?: string; // Nullable for product purchases
  productId?: string; // For product purchases
  subscriberId: string;
  creatorId: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeInvoiceId?: string;
  stripePaymentMethodId?: string;
  stripeCustomerId?: string;
  transactionType: 'subscription' | 'payment' | 'refund' | 'chargeback' | 'adjustment';
  status: 'succeeded' | 'failed' | 'pending' | 'canceled' | 'refunded';
  amount: number;
  currency: string;
  fee?: number;
  netAmount?: number;
  platformFee?: number; // Platform fee percentage applied
  originalPrice?: number; // Original price before platform fee
  priceWithFee?: number; // Price with platform fee included
  balanceStatus?: 'incoming' | 'available'; // Stripe balance status: incoming = pending, available = ready for payout
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  processedAt?: string;
  failedAt?: string;
  failureReason?: string;
  retryCount: number;
  refundAmount?: number;
  refundedAt?: string;
  refundReason?: string;
  metadata?: any;
  description?: string;
  receiptUrl?: string;
}

export interface ProductPurchase extends DefaultTable {
  userId: string;
  productId: string;
  creatorId: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeCustomerId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  purchasedAt?: string;
  platformFee?: number; // Platform fee percentage applied
  originalPrice?: number; // Original price before platform fee
  priceWithFee?: number; // Price with platform fee included
}

export interface Conversation extends DefaultTable {
  memberId: string;
  creatorId: string;
}

export interface Message extends DefaultTable {
  conversationId: string;
  senderId: string;
  content: string;
  isRead?: boolean;
  readAt?: Date;
}

export interface Notification extends DefaultTable {
  userId: string;
  title: string;
  message: string;
  redirectUrl: string;
  fromUserId: string;
  fromUserName?: string;
  fromUserCreatorName?: string;
  fromUserProfilePhoto?: string;
  isRead: boolean;
  type: 'member' | 'creator';
}

export interface GroupInvite extends DefaultTable {
  creatorId: string;
  groupName: string;
  platform: string;
  link: string;
}

export interface PeopleInterested extends DefaultTable {
  userId: string;
  eventId: string;
}

export interface LinkInBioProfile extends DefaultTable {
  userId: string;
  username: string;
  displayName?: string;
  profileImage?: string;
  coverImage?: string;
  bio?: string;
  theme?: string;
  backgroundType?: string;
  backgroundValue?: string;
  customColors?: any;
  customFont?: string;
  showLatestPosts?: boolean;
  isPublished?: boolean;
  customSlug?: string;
  seoTitle?: string;
  seoDescription?: string;
  links?: any[];
  socialLinks?: any;
}