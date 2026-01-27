export interface DashboardOverview {
  totalUsers: number;
  totalCreators: number;
  revenue: {
    allTime: number;
    currentMonth: number;
  };
  newSignups: {
    today: number;
    thisWeek: number;
    thisMonth: number;
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
  status?: string;
  search?: string;
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

