import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface DashboardStats {
  balance: number;
  totalEarned: number;
  coursesOwned: number;
  totalReferrals: number;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  is_published: boolean;
  isPurchased?: boolean;
}

interface DashboardData {
  courses: Course[];
  stats: DashboardStats;
}

export const useOptimizedDashboard = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: async (): Promise<DashboardData> => {
      if (!user) throw new Error('User not authenticated');

      const [coursesResult, purchasesResult, walletResult, referralsResult] = await Promise.all([
        supabase.from('courses').select('*').eq('is_published', true),
        supabase.from('purchases').select('course_id').eq('user_id', user.id),
        supabase.from('wallet').select('balance').eq('user_id', user.id).maybeSingle(),
        supabase.from('referrals').select('commission_amount').eq('referrer_id', user.id),
      ]);

      if (coursesResult.error) throw coursesResult.error;

      const purchasedCourseIds = new Set(purchasesResult.data?.map(p => p.course_id) || []);
      const courses = (coursesResult.data || []).map(course => ({
        ...course,
        isPurchased: purchasedCourseIds.has(course.id),
      }));

      const balance = walletResult.data?.balance || 0;
      const totalEarned = referralsResult.data?.reduce((sum, ref) => sum + (ref.commission_amount || 0), 0) || 0;
      const coursesOwned = purchasedCourseIds.size;
      const totalReferrals = referralsResult.data?.length || 0;

      return {
        courses,
        stats: { balance, totalEarned, coursesOwned, totalReferrals },
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};
