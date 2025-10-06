
import React from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '@/components/layout/UnifiedHeader';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/courses/CourseCard';
import WelcomeCard from '@/components/dashboard/WelcomeCard';
import { useOptimizedDashboard } from '@/hooks/useOptimizedDashboard';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { DashboardSkeleton } from '@/components/ui/loading-skeleton';
import { toast } from 'sonner';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error } = useOptimizedDashboard();

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  const handleCourseClick = (courseId: string, isPurchased: boolean) => {
    if (isPurchased) {
      navigate(`/course/${courseId}`);
    } else {
      navigate(`/payment/${courseId}`);
    }
  };

  if (error) {
    toast.error('Failed to load dashboard data');
    console.error('Dashboard error:', error);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UnifiedHeader />
        <main className="max-w-[993px] mx-auto w-full px-6 py-8 max-sm:p-4 flex-grow">
          <DashboardSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  const { courses = [], stats = { balance: 0, totalEarned: 0, coursesOwned: 0, totalReferrals: 0 } } = data || {};

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <UnifiedHeader />
      <main className="max-w-[993px] mx-auto w-full px-6 py-8 max-sm:p-4 flex-grow">
        <WelcomeCard userName={userName} walletBalance={stats.balance} />

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Courses</h2>
          
          {courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  title={course.title}
                  description={course.description || 'No description available'}
                  price={course.price}
                  type="Web Course"
                  onClick={() => handleCourseClick(course.id, course.isPurchased)}
                  isPurchased={course.isPurchased}
                  thumbnail={course.thumbnail_url || undefined}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses available</h3>
                <p className="text-gray-600">New courses will appear here when they're added.</p>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
