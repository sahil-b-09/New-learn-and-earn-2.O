
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import UnifiedHeader from '@/components/layout/UnifiedHeader';
import Footer from '@/components/layout/Footer';
import WebCourseContent from '@/components/courses/WebCourseContent';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Course {
  id: string;
  title: string;
  description: string | null;
}

const CourseContent: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAccessAndLoadCourse = async () => {
      if (!user || !courseId) {
        setError('Authentication required');
        setIsLoading(false);
        return;
      }

      try {
        // Check if user has purchased this course
        const { data: purchase, error: purchaseError } = await supabase
          .from('purchases')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('payment_status', 'completed')
          .maybeSingle();

        if (purchaseError) {
          console.error('Error checking purchase:', purchaseError);
          setError('Error verifying course access');
          setIsLoading(false);
          return;
        }

        if (!purchase) {
          setHasAccess(false);
          setError('You need to purchase this course to access the content');
          setIsLoading(false);
          return;
        }

        setHasAccess(true);

        // Load course details
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, title, description')
          .eq('id', courseId)
          .single();

        if (courseError) {
          console.error('Error loading course:', courseError);
          setError('Course not found');
          setIsLoading(false);
          return;
        }

        setCourse(courseData);
      } catch (error) {
        console.error('Error in checkAccessAndLoadCourse:', error);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    checkAccessAndLoadCourse();
  }, [user, courseId]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UnifiedHeader />
        <main className="flex-grow flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-t-[#00C853] border-gray-200 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-600">Loading course content...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !hasAccess) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UnifiedHeader />
        <main className="max-w-[993px] mx-auto w-full px-4 lg:px-6 py-6 lg:py-8 flex-grow">
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
          
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'You do not have access to this course content.'}
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UnifiedHeader />
        <main className="max-w-[993px] mx-auto w-full px-4 lg:px-6 py-6 lg:py-8 flex-grow">
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
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
      <main className="max-w-[993px] mx-auto w-full px-4 lg:px-6 py-4 lg:py-8 flex-grow">
        <div className="mb-4 lg:mb-6">
          <Button
            onClick={() => navigate('/my-courses')}
            variant="outline"
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Courses
          </Button>
        </div>
        
        <WebCourseContent 
          courseId={courseId!} 
          courseTitle={course.title}
        />
      </main>
      <Footer />
    </div>
  );
};

export default CourseContent;
