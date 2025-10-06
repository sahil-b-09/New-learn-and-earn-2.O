
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import UnifiedHeader from '@/components/layout/UnifiedHeader';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { getUserCourses, type CourseWithProgress } from '@/services/courseContentService';
import { toast } from 'sonner';

const MyCourses: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCourses = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Loading user courses...');
        const userCourses = await getUserCourses();
        
        setCourses(userCourses);
        console.log('Courses loaded successfully:', userCourses.length);
      } catch (error) {
        console.error('Error loading courses:', error);
        setError('Failed to load your courses. Please try again.');
        toast.error('Failed to load courses');
      } finally {
        setIsLoading(false);
      }
    };

    loadCourses();
  }, [user]);

  const handleCourseClick = (courseId: string) => {
    navigate(`/course/${courseId}`);
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
              <p className="text-gray-600">Loading your courses...</p>
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
              <BookOpen className="h-16 w-16 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Course Loading Error</h2>
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
        <div className="flex items-center mb-6">
          <BookOpen className="h-8 w-8 text-[#00C853] mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        </div>

        {courses.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">No Courses Yet</h2>
              <p className="text-gray-500 mb-6">
                You haven't purchased any courses yet. Browse our course catalog to get started.
              </p>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="bg-[#00C853] hover:bg-[#00B248] text-white"
              >
                Browse Courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {course.description}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center text-gray-500">
                        <BookOpen className="h-4 w-4 mr-1" />
                        {course.totalModules} modules
                      </span>
                      <span className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {course.completedModules}/{course.totalModules} completed
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#00C853] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {Math.round(course.progress)}% complete
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleCourseClick(course.id)}
                        className="bg-[#00C853] hover:bg-[#00B248] text-white"
                      >
                        {course.progress > 0 ? 'Continue' : 'Start'}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MyCourses;
