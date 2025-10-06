
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import UnifiedHeader from '@/components/layout/UnifiedHeader';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Calendar, 
  Users, 
  Award,
  Shield,
  Wallet
} from 'lucide-react';
import ContactSupportButton from '@/components/support/ContactSupportButton';
import UserSupportTickets from '@/components/support/UserSupportTickets';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  referral_code: string | null;
  joined_at: string;
  is_admin: boolean;
}

interface UserStats {
  totalReferrals: number;
  totalEarned: number;
  coursesPurchased: number;
  walletBalance: number;
}

const Profile: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({ 
    totalReferrals: 0, 
    totalEarned: 0, 
    coursesPurchased: 0,
    walletBalance: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Loading profile for user:', user.id);
        
        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setError('Failed to load profile data');
          return;
        }

        setProfile(profileData);

        // Get user stats in parallel
        const [referralsResult, walletResult, purchasesResult] = await Promise.allSettled([
          supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'completed'),
          supabase
            .from('wallet')
            .select('total_earned, balance')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('purchases')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('payment_status', 'completed')
        ]);

        const totalEarned = walletResult.status === 'fulfilled' && walletResult.value.data?.total_earned || 0;
        const walletBalance = walletResult.status === 'fulfilled' && walletResult.value.data?.balance || 0;
        const totalReferrals = referralsResult.status === 'fulfilled' && referralsResult.value.count || 0;
        const coursesPurchased = purchasesResult.status === 'fulfilled' && purchasesResult.value.count || 0;

        setStats({
          totalReferrals,
          totalEarned,
          coursesPurchased,
          walletBalance
        });

      } catch (error) {
        console.error('Error loading profile:', error);
        setError('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UnifiedHeader />
        <main className="max-w-[993px] mx-auto w-full px-6 py-8 flex-grow">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-t-[#00C853] border-gray-200 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600">Loading profile...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UnifiedHeader />
        <main className="max-w-[993px] mx-auto w-full px-6 py-8 flex-grow">
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <User className="h-16 w-16 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Profile Error</h2>
              <p>{error}</p>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-[#00C853] text-white rounded-lg hover:bg-[#00B248]"
            >
              Retry
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <UnifiedHeader />
      <main className="max-w-[993px] mx-auto w-full px-6 py-8 max-sm:p-4 flex-grow">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <User className="h-8 w-8 text-[#00C853] mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          </div>
          {isAdmin && (
            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 bg-gradient-to-r from-[#00C853] to-green-600 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-xl">{profile?.name || 'User'}</h3>
                  <p className="text-gray-500 flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {profile?.email}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    Joined {profile?.joined_at && formatDistanceToNow(new Date(profile.joined_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    For course-specific referral codes and earning opportunities, visit the{' '}
                    <a href="/referrals" className="font-medium underline hover:text-blue-800">
                      Referrals page
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Your Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Wallet className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-green-600">₹{stats.walletBalance}</div>
                  <div className="text-sm text-gray-600">Current Balance</div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Award className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-blue-600">₹{stats.totalEarned}</div>
                  <div className="text-sm text-gray-600">Total Earned</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-purple-600">{stats.totalReferrals}</div>
                  <div className="text-sm text-gray-600">Referrals</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <User className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-orange-600">{stats.coursesPurchased}</div>
                  <div className="text-sm text-gray-600">Courses Owned</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactSupportButton />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <UserSupportTickets />
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
