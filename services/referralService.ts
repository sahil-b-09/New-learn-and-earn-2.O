
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CourseReferralCode {
  id: string;
  user_id: string;
  course_id: string;
  referral_code: string;
  created_at: string;
}

export interface ReferralStats {
  courseReferrals: Array<{
    courseId: string;
    courseTitle: string;
    referralCode: string;
    totalEarned: number;
    totalReferrals: number;
  }>;
  canRefer: boolean;
  overallStats: {
    totalEarned: number;
    totalReferrals: number;
  };
}

// Check if user has purchased any course and can refer
export async function checkReferralEligibility(): Promise<{ canRefer: boolean; coursesPurchased: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { canRefer: false, coursesPurchased: 0 };
    }

    console.log('Checking referral eligibility for user:', user.id);

    // Check if user has any completed purchases
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('id, course_id')
      .eq('user_id', user.id)
      .eq('payment_status', 'completed');

    if (error) {
      console.error('Error checking purchases:', error);
      return { canRefer: false, coursesPurchased: 0 };
    }

    const coursesPurchased = purchases?.length || 0;
    console.log('User has purchased courses:', coursesPurchased);

    return {
      canRefer: coursesPurchased > 0,
      coursesPurchased
    };
  } catch (error) {
    console.error('Exception checking referral eligibility:', error);
    return { canRefer: false, coursesPurchased: 0 };
  }
}

// Get or create referral code for a specific course
export async function getCourseReferralCode(courseId: string): Promise<string | null> {
  try {
    console.log('Getting referral code for course:', courseId);
    
    // Get auth token from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Use the Express API endpoint
    const response = await fetch('/api/referrals/generate-course-code', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ course_id: courseId })
    });

    if (!response.ok) {
      console.error('Failed to get course referral code');
      return null;
    }

    const data = await response.json();
    console.log('Course referral code:', data.referral_code);
    return data.referral_code;
  } catch (error) {
    console.error('Exception getting course referral code:', error);
    return null;
  }
}

// Get all course referral codes for user
export async function getAllCourseReferralCodes(): Promise<CourseReferralCode[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('course_referral_codes')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching course referral codes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching course referral codes:', error);
    return [];
  }
}

// Get comprehensive referral statistics with per-course breakdown
export async function getReferralStats(): Promise<ReferralStats> {
  try {
    console.log('Getting comprehensive referral stats via API');
    
    // Get auth token from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { 
        courseReferrals: [], 
        canRefer: false, 
        overallStats: { totalEarned: 0, totalReferrals: 0 }
      };
    }
    
    // Use the Express API endpoint
    const response = await fetch('/api/referrals/my-stats', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch referral stats');
    }
    
    const data = await response.json();
    console.log('API response:', data);

    // Transform per-course data from API (now properly aggregated)
    const courseReferrals = (data.course_referrals || []).map((course: any) => ({
      courseId: course.course_id,
      courseTitle: course.course_title,
      referralCode: course.referral_code || data.user_info?.referral_code || '',
      totalEarned: parseFloat(course.total_earnings || 0),
      totalReferrals: parseInt(course.total_referrals || 0)
    }));

    const overallStats = {
      totalEarned: parseFloat(data.stats?.total_earnings || 0),
      totalReferrals: parseInt(data.stats?.successful_referrals || 0)
    };

    // Use the canRefer flag from API (based on completed purchases)
    const canRefer = !!data.can_refer;

    return {
      courseReferrals,
      canRefer,
      overallStats
    };
  } catch (error) {
    console.error('Exception getting referral stats:', error);
    return { 
      courseReferrals: [], 
      canRefer: false, 
      overallStats: { totalEarned: 0, totalReferrals: 0 }
    };
  }
}

// Get detailed referral history
export async function getReferralHistory(): Promise<any[]> {
  try {
    console.log('Getting referral history via API');
    
    // Get auth token from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    
    const response = await fetch('/api/referrals/my-stats', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch referral history');
      return [];
    }
    
    const data = await response.json();
    return data.recent_referrals || [];
  } catch (error) {
    console.error('Exception fetching referral history:', error);
    return [];
  }
}
