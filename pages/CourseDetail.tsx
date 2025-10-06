
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEOHead from '@/components/seo/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Clock, Users, Star, Play } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  referral_reward: number;
  is_active: boolean;
}

const CourseDetail: React.FC = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [isPurchased, setIsPurchased] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId) return;
      
      try {
        setIsLoading(true);
        
        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .eq('is_active', true)
          .single();
          
        if (courseError) {
          console.error('Error fetching course:', courseError);
          toast({
            title: "Error",
            description: "Course not found",
            variant: "destructive"
          });
          navigate('/dashboard');
          return;
        }
        
        setCourse(courseData);
        
        // Check if user has purchased this course
        if (user) {
          const { data: purchase, error: purchaseError } = await supabase
            .from('purchases')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .eq('payment_status', 'completed')
            .maybeSingle();
            
          if (!purchaseError && purchase) {
            setIsPurchased(true);
          }
        }
        
      } catch (error) {
        console.error('Error fetching course data:', error);
        toast({
          title: "Error",
          description: "Failed to load course details",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCourseData();
  }, [courseId, user, navigate, toast]);

  const handlePurchase = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to purchase courses",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    
    navigate(`/payment/${courseId}`);
  };

  const handleStartCourse = () => {
    navigate(`/course/${courseId}/content`);
  };

  if (isLoading) {
    return (
      <>
        <SEOHead title="Loading Course..." />
        <div className="flex flex-col min-h-screen bg-gray-50">
          <Header />
          <main className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-t-[#00C853] border-gray-200 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600">Loading course details...</p>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  if (!course) {
    return (
      <>
        <SEOHead title="Course Not Found" />
        <div className="flex flex-col min-h-screen bg-gray-50">
          <Header />
          <main className="max-w-[1200px] mx-auto w-full px-6 py-8 flex-grow">
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Course Not Found</h1>
              <p className="text-gray-600 mb-6">The course you're looking for doesn't exist or is no longer available.</p>
              <Button onClick={() => navigate('/dashboard')} className="bg-[#00C853] hover:bg-green-700">
                Back to Dashboard
              </Button>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead 
        title={course.title}
        description={course.description || `Learn ${course.title} through our comprehensive course. Earn ₹${course.referral_reward} per referral!`}
        type="article"
        url={`/course/${course.id}`}
        image={course.thumbnail_url || undefined}
      />
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-[1200px] mx-auto w-full px-6 py-8 flex-grow">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Course Content */}
            <div className="lg:col-span-2">
              {/* Course Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline">PDF Course</Badge>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight break-words">
                  {course.title}
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {course.description || 'Comprehensive course designed to help you master essential skills and earn while you learn.'}
                </p>
              </div>

              {/* Course Image */}
              {course.thumbnail_url && (
                <div className="mb-8">
                  <img 
                    src={course.thumbnail_url} 
                    alt={`${course.title} course thumbnail`}
                    className="w-full h-64 object-cover rounded-lg shadow-md"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Course Features */}
              <Card className="mb-8">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">What you'll learn</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <BookOpen className="h-5 w-5 text-[#00C853] mr-3 flex-shrink-0" />
                      <span className="break-words">Comprehensive course modules</span>
                    </div>
                    <div className="flex items-center">
                      <Play className="h-5 w-5 text-[#00C853] mr-3 flex-shrink-0" />
                      <span className="break-words">Interactive lessons</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-[#00C853] mr-3 flex-shrink-0" />
                      <span className="break-words">Self-paced learning</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-[#00C853] mr-3 flex-shrink-0" />
                      <span className="break-words">Lifetime access</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Referral Information */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Earn with Referrals</h2>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Star className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                      <span className="font-semibold text-yellow-800 break-words">
                        Earn ₹{course.referral_reward} per referral!
                      </span>
                    </div>
                    <p className="text-yellow-700 text-sm">
                      Share your referral code with friends and earn {((course.referral_reward / course.price) * 100).toFixed(0)}% commission on every successful purchase.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Purchase Card */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-gray-900 mb-2">₹{course.price}</div>
                    <p className="text-gray-600">One-time payment</p>
                  </div>

                  {isPurchased ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <div className="text-green-800 font-semibold mb-1">Course Purchased!</div>
                        <div className="text-green-600 text-sm">You have full access to this course</div>
                      </div>
                      <Button 
                        onClick={handleStartCourse}
                        className="w-full bg-[#00C853] hover:bg-green-700"
                        size="lg"
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Start Learning
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Button 
                        onClick={handlePurchase}
                        className="w-full bg-[#00C853] hover:bg-green-700"
                        size="lg"
                      >
                        Buy Course
                      </Button>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">
                          Secure payment powered by Razorpay
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4 mt-6">
                    <h3 className="font-semibold mb-3">This course includes:</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center">
                        <BookOpen className="h-4 w-4 text-[#00C853] mr-2 flex-shrink-0" />
                        <span className="break-words">Structured learning modules</span>
                      </li>
                      <li className="flex items-center">
                        <Clock className="h-4 w-4 text-[#00C853] mr-2 flex-shrink-0" />
                        <span className="break-words">Self-paced progress</span>
                      </li>
                      <li className="flex items-center">
                        <Users className="h-4 w-4 text-[#00C853] mr-2 flex-shrink-0" />
                        <span className="break-words">Lifetime access</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default CourseDetail;
