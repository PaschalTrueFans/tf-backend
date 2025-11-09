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
}

export interface Admin extends DefaultTable {
  email: string;
  password: string;
  name: string;
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
}

export interface Product extends DefaultTable {
  creatorId: string;
  name: string;
  description?: string;
  mediaUrl?: string;
  price: string;
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
  subscriptionId: string;
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

export interface Conversation extends DefaultTable {
  memberId: string;
  creatorId: string;
}

export interface Message extends DefaultTable {
  conversationId: string;
  senderId: string;
  content: string;
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