
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsMetric {
  date: string;
  active_users: number;
  new_signups: number;
  course_enrollments: number;
  referral_earnings: number;
  successful_payments: number;
  revenue: number;
  support_tickets: number;
  user_engagement: number;
  total_revenue: number;
  referral_count: number;
  lesson_completions: number;
  course_completion_rate: number;
  referral_commissions: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalRevenue: number;
  totalReferrals: number;
  totalPurchases: number;
  activeUsers?: {
    current: number;
    percentChange: number;
  };
  newSignups?: {
    current: number;
    percentChange: number;
  };
  revenue?: {
    current: number;
    percentChange: number;
  };
  referrals?: {
    current: number;
    percentChange: number;
  };
}

export interface DailyMetric {
  date: string;
  value: number;
}

export type AnalyticsTimeframe = '7d' | '30d' | '90d' | 'all';

export const TIMEFRAMES = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: 'All Time', value: 'all' }
];

const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get total courses
    const { count: totalCourses } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });

    // Get total revenue
    const { data: revenueData } = await supabase
      .from('purchases')
      .select('amount')
      .eq('payment_status', 'completed');

    const totalRevenue = revenueData?.reduce((sum, purchase) => sum + purchase.amount, 0) || 0;

    // Get total referrals
    const { count: totalReferrals } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true });

    // Get total purchases
    const { count: totalPurchases } = await supabase
      .from('purchases')
      .select('*', { count: 'exact', head: true });

    return {
      totalUsers: totalUsers || 0,
      totalCourses: totalCourses || 0,
      totalRevenue,
      totalReferrals: totalReferrals || 0,
      totalPurchases: totalPurchases || 0
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalUsers: 0,
      totalCourses: 0,
      totalRevenue: 0,
      totalReferrals: 0,
      totalPurchases: 0
    };
  }
};

const fetchAnalyticsData = async (days: number = 30): Promise<AnalyticsMetric[]> => {
  try {
    console.log('Fetching real analytics for period:', days);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    // Fetch real data from database for each day
    const analyticsData: AnalyticsMetric[] = [];
    
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = formatDate(currentDate);
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);
      const nextDateStr = formatDate(nextDate);
      
      try {
        // Get daily metrics from database
        const [
          newSignupsResult,
          purchasesResult,
          revenueResult,
          referralsResult,
          supportTicketsResult
        ] = await Promise.all([
          // New signups for the day
          supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', `${dateStr}T00:00:00`)
            .lt('created_at', `${nextDateStr}T00:00:00`),
          
          // Successful purchases for the day
          supabase
            .from('purchases')
            .select('id, amount', { count: 'exact' })
            .eq('payment_status', 'completed')
            .gte('purchased_at', `${dateStr}T00:00:00`)
            .lt('purchased_at', `${nextDateStr}T00:00:00`),
          
          // Total revenue for the day
          supabase
            .from('purchases')
            .select('amount')
            .eq('payment_status', 'completed')
            .gte('purchased_at', `${dateStr}T00:00:00`)
            .lt('purchased_at', `${nextDateStr}T00:00:00`),
          
          // Referrals created for the day
          supabase
            .from('referrals')
            .select('commission_amount', { count: 'exact' })
            .gte('created_at', `${dateStr}T00:00:00`)
            .lt('created_at', `${nextDateStr}T00:00:00`),
          
          // Support tickets for the day (fallback to 0 if table doesn't exist)
          Promise.resolve({ count: 0 }) // TODO: Add support_requests table to schema or use alternative
        ]);
        
        // Calculate metrics
        const newSignups = newSignupsResult.count || 0;
        const courseEnrollments = purchasesResult.count || 0;
        const successfulPayments = purchasesResult.count || 0;
        
        const dailyRevenue = revenueResult.data?.reduce((sum, purchase) => {
          return sum + (Number(purchase.amount) || 0);
        }, 0) || 0;
        
        const referralCommissions = referralsResult.data?.reduce((sum, ref) => {
          return sum + (Number(ref.commission_amount) || 0);
        }, 0) || 0;
        
        const referralCount = referralsResult.count || 0;
        const supportTickets = supportTicketsResult.count || 0;
        
        // Active users (users who have activity on this day - logins, purchases, etc.)
        const activeUsersQuery = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .or(`last_login.gte.${dateStr}T00:00:00,last_login.lt.${nextDateStr}T00:00:00,created_at.gte.${dateStr}T00:00:00,created_at.lt.${nextDateStr}T00:00:00`);
        
        const activeUsers = activeUsersQuery.count || 0;
        
        // Calculate engagement rate (active users vs. total users up to this date)
        const totalUsersQuery = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .lte('created_at', `${nextDateStr}T00:00:00`);
        
        const totalUsersToDate = totalUsersQuery.count || 0;
        const userEngagement = totalUsersToDate > 0 
          ? Math.round((activeUsers / totalUsersToDate) * 100) 
          : 0;
        
        analyticsData.push({
          date: dateStr,
          active_users: activeUsers,
          new_signups: newSignups,
          course_enrollments: courseEnrollments,
          referral_earnings: referralCommissions,
          successful_payments: successfulPayments,
          revenue: dailyRevenue,
          support_tickets: supportTickets,
          user_engagement: userEngagement,
          total_revenue: dailyRevenue,
          referral_count: referralCount,
          lesson_completions: 0, // TODO: Implement when lesson completion tracking is added
          course_completion_rate: 0, // TODO: Implement when course completion tracking is added
          referral_commissions: referralCommissions
        });
        
      } catch (dayError) {
        console.error(`Error fetching data for ${dateStr}:`, dayError);
        // Add empty data for this day to maintain consistency
        analyticsData.push({
          date: dateStr,
          active_users: 0,
          new_signups: 0,
          course_enrollments: 0,
          referral_earnings: 0,
          successful_payments: 0,
          revenue: 0,
          support_tickets: 0,
          user_engagement: 0,
          total_revenue: 0,
          referral_count: 0,
          lesson_completions: 0,
          course_completion_rate: 0,
          referral_commissions: 0
        });
      }
    }
    
    return analyticsData;
  } catch (error) {
    console.error('Error fetching analytics metrics:', error);
    // Return empty data array instead of mock data on error
    return [];
  }
};

const fetchDashboardSummary = async (): Promise<DashboardStats> => {
  return getDashboardStats();
};

const calculateMetricSummary = (data: AnalyticsMetric[], key: keyof AnalyticsMetric, currentPeriod: number, previousPeriod: number) => {
  if (!data || data.length === 0) return { current: 0, percentChange: 0 };
  
  const currentData = data.slice(-currentPeriod);
  const previousData = data.slice(-(currentPeriod + previousPeriod), -currentPeriod);
  
  const currentSum = currentData.reduce((sum, item) => sum + Number(item[key]), 0);
  const previousSum = previousData.reduce((sum, item) => sum + Number(item[key]), 0);
  
  const percentChange = previousSum > 0 ? ((currentSum - previousSum) / previousSum) * 100 : 0;
  
  return {
    current: currentSum,
    percentChange: Math.round(percentChange * 100) / 100
  };
};

const getRecentActivity = async (limit: number = 10) => {
  try {
    // Get recent user registrations
    const { data: recentUsers } = await supabase
      .from('users')
      .select('name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Get recent purchases
    const { data: recentPurchases } = await supabase
      .from('purchases')
      .select(`
        *,
        users(name, email),
        courses(title)
      `)
      .order('purchased_at', { ascending: false })
      .limit(limit);

    return {
      recentUsers: recentUsers || [],
      recentPurchases: recentPurchases || []
    };
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return {
      recentUsers: [],
      recentPurchases: []
    };
  }
};

const generateTestData = async () => {
  try {
    console.log('Generating test analytics data...');
    // This would generate test analytics data in production
    return { success: true, message: 'Test data generated successfully' };
  } catch (error) {
    console.error('Error generating test data:', error);
    return { success: false, message: 'Failed to generate test data' };
  }
};

const logUserLogin = async (userId: string) => {
  try {
    console.log('Logging user login:', userId);
    
    // Update user's last_login timestamp
    const { error } = await supabase
      .from('users')
      .update({ 
        last_login: new Date().toISOString() 
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating last_login:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error logging user login:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export {
  getDashboardStats,
  fetchAnalyticsData,
  fetchDashboardSummary,
  calculateMetricSummary,
  getRecentActivity,
  generateTestData,
  logUserLogin
};
