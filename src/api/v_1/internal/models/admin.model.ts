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

