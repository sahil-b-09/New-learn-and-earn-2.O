
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import UnifiedHeader from '@/components/layout/UnifiedHeader';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Users, Wallet, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { getReferralStats, getReferralHistory, type ReferralStats } from '@/services/referralService';

const Referrals: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats>({
    courseReferrals: [],
    canRefer: false,
    overallStats: { totalEarned: 0, totalReferrals: 0 }
  });
  const [referralHistory, setReferralHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReferralData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Loading referral data for user:', user.id);
        
        const [referralStats, history] = await Promise.all([
          getReferralStats(),
          getReferralHistory()
        ]);
        
        setStats(referralStats);
        setReferralHistory(history);
        
        console.log('Referral data loaded:', { referralStats, historyCount: history.length });
      } catch (error) {
        console.error('Error loading referral data:', error);
        setError('Failed to load referral data. Please refresh the page.');
        toast.error('Failed to load referral data');
      } finally {
        setIsLoading(false);
      }
    };

    loadReferralData();
  }, [user]);

  const copyReferralCode = (code: string, courseTitle: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Referral code for ${courseTitle} copied!`);
  };

  const shareReferralLink = (code: string, courseTitle: string) => {
    const referralLink = `${window.location.origin}?ref=${code}`;
    const message = `Check out "${courseTitle}" on Learn & Earn! Use my referral code ${code} to get started. ${referralLink}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Learn & Earn - ${courseTitle}`,
        text: message,
        url: referralLink
      });
    } else {
      navigator.clipboard.writeText(message);
      toast.success('Referral message copied to clipboard!');
    }
  };

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
              <p className="text-gray-600">Loading referral data...</p>
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
              <Share2 className="h-16 w-16 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Referral Error</h2>
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

  if (!stats.canRefer) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UnifiedHeader />
        <main className="max-w-[993px] mx-auto w-full px-6 py-8 max-sm:p-4 flex-grow">
          <div className="flex items-center mb-6">
            <Share2 className="h-8 w-8 text-[#00C853] mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">Refer & Earn</h1>
          </div>

          <Card className="text-center py-12">
            <CardContent>
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Access to Start Referring</h3>
              <p className="text-gray-600 mb-6">
                You need to purchase a course before you can start referring friends and earning commissions.
              </p>
              <Button 
                onClick={() => window.location.href = '/dashboard'}
                className="bg-[#00C853] hover:bg-[#00B248] text-white"
              >
                Browse Courses
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <UnifiedHeader />
      <main className="max-w-[993px] mx-auto w-full px-6 py-8 max-sm:p-4 flex-grow">
        <div className="flex items-center mb-6">
          <Share2 className="h-8 w-8 text-[#00C853] mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">Refer & Earn</h1>
        </div>

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <Wallet className="h-4 w-4 text-[#00C853]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#00C853]">₹{stats.overallStats.totalEarned.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">From all referrals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.overallStats.totalReferrals}</div>
              <p className="text-xs text-gray-500 mt-1">Successful referrals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
              <Share2 className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">50%</div>
              <p className="text-xs text-gray-500 mt-1">Per successful referral</p>
            </CardContent>
          </Card>
        </div>

        {/* Course-Specific Referral Codes */}
        <div className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900">Your Course Referral Codes</h2>
          
          {stats.courseReferrals.map((course) => (
            <Card key={course.courseId}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{course.courseTitle}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Earn 50% commission for each successful referral
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Earned</div>
                    <div className="text-lg font-bold text-[#00C853]">₹{course.totalEarned.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">{course.totalReferrals} referrals</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 p-3 bg-gray-100 rounded-lg font-mono text-center font-semibold">
                    {course.referralCode}
                  </div>
                  <Button 
                    onClick={() => copyReferralCode(course.referralCode, course.courseTitle)} 
                    variant="outline" 
                    size="sm"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button 
                  onClick={() => shareReferralLink(course.referralCode, course.courseTitle)}
                  className="w-full bg-[#00C853] hover:bg-[#00B248]"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share {course.courseTitle}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How it Works */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>How Referrals Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>How it works:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Each course you purchase gets its own unique referral code</li>
                <li>Share your course-specific referral code with friends</li>
                <li>They use your code when purchasing that course</li>
                <li>You earn 50% commission on their purchase</li>
                <li>Commission is added to your wallet instantly</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Referral History */}
        {referralHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Referral History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {referralHistory.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{referral.courses?.title || 'Course'}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#00C853]">
                        +₹{referral.commission_amount?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">{referral.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Referrals;
