export interface DashboardOverview {
  // User Metrics
  users: {
    total: number;
    active: number; // Logged in within 30 days
    blocked: number;
    verified: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };

  // Creator Metrics
  creators: {
    total: number;
    verified: number;
    withProducts: number;
    withCommunities: number;
    topCreators: Array<{ id: string; name: string; revenue: number; subscribers: number }>;
  };

  // Content Metrics
  content: {
    totalPosts: number;
    postsToday: number;
    postsThisWeek: number;
    totalComments: number;
    totalCommunities: number;
    activeCommunities: number; // Communities with activity in last 7 days
    totalPolls: number;
    pendingReports: number;
  };

  // Engagement Metrics
  engagement: {
    totalFollows: number;
    followsToday: number;
    totalLikes: number;
    likesToday: number;
    averagePostsPerCreator: number;
  };

  // Financial Metrics
  finance: {
    totalRevenue: number;
    revenueThisMonth: number;
    revenueToday: number;
    platformFees: number;
    averageOrderValue: number;
    totalWalletBalance: number; // Sum of all user wallets (USD)
    totalCoinBalance: number; // Sum of all coins in circulation
  };

  // Payout Metrics
  payouts: {
    pending: number;
    pendingAmount: number;
    approved: number;
    approvedAmount: number;
    completed: number;
    completedThisMonth: number;
    rejected: number;
  };

  // Subscription Metrics
  subscriptions: {
    totalActive: number;
    newThisMonth: number;
    canceledThisMonth: number;
    churnRate: number; // Percentage
    averageSubscriptionValue: number;
    totalMemberships: number;
  };

  // Marketplace Metrics
  marketplace: {
    totalProducts: number;
    digitalProducts: number;
    physicalProducts: number;
    activeProducts: number;
    totalOrders: number;
    ordersToday: number;
    ordersThisWeek: number;
    pendingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    escrowHeld: number;
    escrowAmount: number;
  };

  // Platform Health
  platform: {
    openTickets: number;
    resolvedTicketsToday: number;
    systemNotifications: number;
    emailBroadcastsSent: number;
    linkInBioProfiles: number;
    totalCategories: number;
  };

  // Trends (7-day rolling)
  trends: {
    signupsTrend: number[]; // Last 7 days
    revenueTrend: number[]; // Last 7 days  
    ordersTrend: number[]; // Last 7 days
  };
}


export type AdminUserRole = 'creator' | 'member';


export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  isBlocked: boolean;
  createdAt: string;
}

export interface AdminUserDetails extends AdminUserListItem {
  updatedAt: string;
  avatar: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  twitter: string | null;
  instagram: string | null;
  isVerified: boolean;
  walletBalance: number;
  stats: {
    postsCount: number;
    followersCount: number;
    followingCount: number;
    communitiesCount: number;
  };
}

export interface AdminUpdateUserDto {
  name?: string;
  email?: string; // Careful with this
  bio?: string;
  location?: string;
  website?: string;
}

export interface AdminUserSession {
  id: string;
  device: string;
  ip: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface AdminUserAuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  ip: string;
  createdAt: string;
  adminId?: string; // If action performed by admin
}

export interface AdminUserListFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminUserRole;
  isBlocked: boolean;
}

export interface AdminUserListResponse {
  users: AdminUserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminTransactionListItem {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  amount: number;
  status: string;
  createdAt: string;
}

export interface AdminTransactionListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface AdminTransactionListResponse {
  transactions: AdminTransactionListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type AdminTicketStatus = 'open' | 'in_progress' | 'completed';

export interface AdminTicketComment {
  id: string;
  ticketId: string;
  comment: string;
  adminId: string | null;
  adminName: string | null;
  createdAt: string;
}

export interface AdminTicketListItem {
  id: string;
  subject: string;
  message: string;
  status: AdminTicketStatus;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  comments: AdminTicketComment[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminTicketListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: AdminTicketStatus;
}

export interface AdminTicketListResponse {
  tickets: AdminTicketListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminSystemNotification {
  id: string;
  title: string;
  message: string;
  adminId: string | null;
  adminName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSystemNotificationFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface AdminSystemNotificationListResponse {
  notifications: AdminSystemNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminCreateSystemNotificationDto {
  title: string;
  message: string;
}

export interface AdminUpdateSystemNotificationDto {
  title?: string;
  message?: string;
}

export interface AdminEmailBroadcast {
  id: string;
  subject: string;
  message: string;
  recipientCount: number;
  adminId: string | null;
  adminName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminEmailBroadcastFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface AdminEmailBroadcastListResponse {
  broadcasts: AdminEmailBroadcast[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminCreateEmailBroadcastDto {
  subject: string;
  message: string;
}

export interface AdminPayoutListItem {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  amount: number;
  currency: string;
  status: string;
  paymentDetails?: any;
  createdAt: string;
  reviewedAt?: string;
  paidAt?: string;
}

export interface AdminPayoutListFilters {
  page?: number;
  limit?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface AdminPayoutListResponse {
  payouts: AdminPayoutListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminPayoutDetails extends AdminPayoutListItem {
  paymentDetails: {
    accountHolderName?: string;
    accountHolderType?: string;
    accountNumber?: string;
    routingNumber?: string;
    accountType?: string;
    swiftBic?: string;
    iban?: string;
    bankName?: string;
    bankAddress?: string;
    bankCity?: string;
    bankCountry?: string;
    bankPostalCode?: string;
    beneficiaryAddress?: string;
    beneficiaryCity?: string;
    beneficiaryState?: string;
    beneficiaryCountry?: string;
    beneficiaryPostalCode?: string;
    paypalEmail?: string;
    paymentMethod?: 'bank_us' | 'bank_international' | 'paypal';
  };
  reviewNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  paidAt?: string;
  paidBy?: string;
  provider?: string;
  providerTransferId?: string;
}

// Community Interfaces
export interface AdminCommunityListItem {
  id: string;
  name: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  membersCount: number;
  isPrivate: boolean;
  createdAt: string;
}

export interface AdminCommunityFilters {
  page?: number;
  limit?: number;
  search?: string;
  isPrivate?: string; // 'true' | 'false'
}

export interface AdminCommunityListResponse {
  communities: AdminCommunityListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminCommunityDetails extends AdminCommunityListItem {
  description: string;
  icon: string | null;
  banner: string | null;
  rules: string | null;
}

// Post Interfaces
export interface AdminPostListItem {
  id: string;
  title: string;
  content: string; // Truncated
  creator: {
    id: string;
    name: string;
    email: string;
  };
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export interface AdminPostFilters {
  page?: number;
  limit?: number;
  search?: string;
  creatorId?: string;
}

export interface AdminPostListResponse {
  posts: AdminPostListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminPostDetails extends AdminPostListItem {
  mediaFiles: string[];
  fullContent: string;
}

// Comment Interfaces
export interface AdminCommentListItem {
  id: string;
  content: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  postId: string;
  postTitle: string;
  createdAt: string;
}

export interface AdminCommentFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface AdminCommentListResponse {
  comments: AdminCommentListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}


// Report Interfaces
export interface AdminReportListItem {
  id: string;
  communityId: string;
  reporterId: string;
  reporterName: string;
  targetId: string; // Post ID or User ID
  targetType: 'message' | 'member';
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface AdminReportFilters {
  page?: number;
  limit?: number;
  status?: string;
}

export interface AdminReportListResponse {
  reports: AdminReportListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}


// Wallet & Finance Interfaces
export interface AdminWalletListItem {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  usdBalance: number;
  coinBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWalletFilters {
  page?: number;
  limit?: number;
  minBalance?: number;
  maxBalance?: number;
  currency?: 'USD' | 'COIN';
  search?: string;
}

export interface AdminWalletListResponse {
  wallets: AdminWalletListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminWalletDetails extends AdminWalletListItem {
  transactions: AdminTransactionListItem[]; // Recent transactions
  payouts: AdminPayoutListItem[]; // Recent payouts
}

export interface AdminCreditDebitDto {
  amount: number;
  currency: 'USD' | 'COIN';
  reason: string;
  type: 'CREDIT' | 'DEBIT';
}

// Link In Bio Interfaces
export interface AdminLinkInBioListItem {
  id: string;
  username: string;
  userId: string;
  displayName: string | null;
  isPublished: boolean;
  theme: string;
  updatedAt: string;
}

export interface AdminLinkInBioFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface AdminLinkInBioListResponse {
  profiles: AdminLinkInBioListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// System Admin Interfaces
export interface AdminSystemAdminListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AdminSystemAdminListResponse {
  admins: AdminSystemAdminListItem[];
}

export interface AdminInviteAdminDto {
  email: string;
  name: string;
  password?: string; // Initial password
}

// Category Interfaces
export interface AdminCategory {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface AdminCreateCategoryDto {
  name: string;
  parentId?: string;
}

// Global Transaction Interfaces (Stripe/Payment level)
export interface AdminGlobalTransactionListItem {
  id: string;
  creator: { id: string; name: string; email: string };
  subscriber: { id: string; name: string; email: string };
  amount: number;
  currency: string;
  transactionType: 'subscription' | 'payment' | 'refund' | 'chargeback' | 'adjustment';
  status: 'succeeded' | 'failed' | 'pending' | 'canceled' | 'refunded';
  createdAt: string;
}

export interface AdminGlobalTransactionFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
}

export interface AdminGlobalTransactionListResponse {
  transactions: AdminGlobalTransactionListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Product Interfaces
export interface AdminProductListItem {
  id: string;
  name: string;
  creator: { id: string; name: string; email: string };
  price: string;
  productType: 'digital' | 'physical';
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;
}

export interface AdminProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  productType?: 'digital' | 'physical';
}

export interface AdminProductListResponse {
  products: AdminProductListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Order Interfaces
export interface AdminOrderListItem {
  id: string;
  orderId: string;
  creator: { id: string; name: string; email: string };
  user: { id: string; name: string; email: string } | null;
  amount: number;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  createdAt: string;
}

export interface AdminOrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface AdminOrderListResponse {
  orders: AdminOrderListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminOrderDetails extends AdminOrderListItem {
  shippingAddress?: any;
  trackingNumber?: string;
  escrowStatus: string;
  escrowReleaseAt?: string;
  product: { id: string; name: string };
}
