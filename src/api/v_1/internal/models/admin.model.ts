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

