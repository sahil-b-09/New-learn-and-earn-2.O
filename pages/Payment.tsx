
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import UnifiedHeader from '@/components/layout/UnifiedHeader';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ShoppingCart, Shield, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
}

const Payment: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId) {
        navigate('/dashboard');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .eq('is_active', true)
          .single();

        if (error || !data) {
          console.error('Error loading course:', error);
          toast.error('Course not found');
          navigate('/dashboard');
          return;
        }

        setCourse(data);
      } catch (error) {
        console.error('Error loading course:', error);
        toast.error('Failed to load course details');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadCourse();
  }, [courseId, navigate]);

  const handlePaymentPlaceholder = () => {
    toast.info('Payment system is being set up. Please check back soon!');
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UnifiedHeader />
        <main className="max-w-[993px] mx-auto w-full px-6 py-8 flex-grow">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-t-[#00C853] border-gray-200 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600">Loading payment details...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UnifiedHeader />
        <main className="max-w-[993px] mx-auto w-full px-6 py-8 flex-grow">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Course Not Found</h2>
            <p className="text-gray-600 mb-6">The requested course could not be found.</p>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <UnifiedHeader />
      <main className="max-w-[993px] mx-auto w-full px-6 py-8 flex-grow">
        <div className="mb-6">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Course Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {course.thumbnail_url && (
                  <img 
                    src={course.thumbnail_url} 
                    alt={course.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                <div>
                  <h3 className="text-xl font-semibold">{course.title}</h3>
                  <p className="text-gray-600 mt-2">{course.description}</p>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Course Price:</span>
                    <span className="text-2xl font-bold text-[#00C853]">₹{course.price}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary - Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Payment System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-2">
                    <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="font-semibold text-yellow-800">Payment System Coming Soon</span>
                  </div>
                  <p className="text-yellow-700 text-sm">
                    We're setting up Razorpay integration. Course purchases will be available soon!
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 mb-2">
                      Referral Code (Optional)
                    </label>
                    <Input
                      id="referralCode"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="Enter referral code"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Have a referral code? Enter it here to get rewards for your referrer!
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span>Course Fee:</span>
                    <span>₹{course.price}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span>Platform Fee:</span>
                    <span>₹0</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center font-semibold text-lg">
                      <span>Total Amount:</span>
                      <span className="text-[#00C853]">₹{course.price}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Instant course access after payment
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Lifetime access to course content
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Earn 50% commission on referrals
                  </div>
                </div>

                <Button 
                  onClick={handlePaymentPlaceholder}
                  disabled
                  className="w-full bg-gray-400 text-white py-3 text-lg cursor-not-allowed"
                >
                  Payment Coming Soon - ₹{course.price}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Payment system is being integrated. Please check back soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Payment;
