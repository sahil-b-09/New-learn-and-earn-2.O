
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, PlayCircle, BookOpen, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';

interface Module {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  module_order: number;
  is_active: boolean;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  lesson_order: number;
  completed?: boolean;
}

interface OptimizedWebCourseContentProps {
  courseId: string;
  courseTitle: string;
}

const OptimizedWebCourseContent: React.FC<OptimizedWebCourseContentProps> = React.memo(({ courseId, courseTitle }) => {
  const { user } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);

  // Optimized data fetching
  const { data: modulesData, isLoading } = useOptimizedQuery({
    queryKey: ['course-modules', courseId, user?.id],
    queryFn: async () => {
      if (!user || !courseId) return [];

      // Load modules with lessons in a single query
      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select(`
          *,
          lessons:lessons(*)
        `)
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('module_order');

      if (modulesError) throw modulesError;

      if (!modulesData || modulesData.length === 0) {
        return [];
      }

      // Get all lesson IDs for progress check
      const allLessonIds = modulesData.flatMap(module => 
        (module.lessons || []).map(lesson => lesson.id)
      );

      // Batch fetch user progress
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('lesson_id, completed')
        .eq('user_id', user.id)
        .in('lesson_id', allLessonIds);

      const progressMap = new Map(
        progressData?.map(p => [p.lesson_id, p.completed]) || []
      );

      // Add progress to lessons
      return modulesData.map(module => ({
        ...module,
        lessons: (module.lessons || [])
          .map(lesson => ({
            ...lesson,
            completed: progressMap.get(lesson.id) || false
          }))
          .sort((a, b) => a.lesson_order - b.lesson_order)
      }));
    },
    dependencies: [courseId, user?.id],
    enabled: !!user && !!courseId,
  });

  useEffect(() => {
    if (modulesData) {
      setModules(modulesData);
      
      // Set first module as active if none selected
      if (modulesData.length > 0 && !activeModule) {
        setActiveModule(modulesData[0].id);
        if (modulesData[0].lessons.length > 0) {
          setActiveLesson(modulesData[0].lessons[0].id);
        }
      }
    }
  }, [modulesData, activeModule]);

  // Memoized calculations
  const progress = useMemo(() => {
    const totalLessons = modules.reduce((total, module) => total + module.lessons.length, 0);
    const completedLessons = modules.reduce(
      (total, module) => total + module.lessons.filter(lesson => lesson.completed).length,
      0
    );
    return totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  }, [modules]);

  const currentLesson = useMemo(() => {
    if (!activeLesson) return null;
    
    for (const module of modules) {
      const lesson = module.lessons.find(l => l.id === activeLesson);
      if (lesson) return lesson;
    }
    return null;
  }, [activeLesson, modules]);

  const nextLesson = useMemo(() => {
    if (!activeLesson) return null;
    
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      const lessonIndex = module.lessons.findIndex(l => l.id === activeLesson);
      
      if (lessonIndex !== -1) {
        // Next lesson in same module
        if (lessonIndex < module.lessons.length - 1) {
          return module.lessons[lessonIndex + 1];
        }
        // First lesson in next module
        if (i < modules.length - 1 && modules[i + 1].lessons.length > 0) {
          return modules[i + 1].lessons[0];
        }
      }
    }
    return null;
  }, [activeLesson, modules]);

  const markLessonComplete = useCallback(async (lessonId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update local state
      setModules(prev => 
        prev.map(module => ({
          ...module,
          lessons: module.lessons.map(lesson => 
            lesson.id === lessonId ? { ...lesson, completed: true } : lesson
          )
        }))
      );

      toast.success('Lesson completed!');
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      toast.error('Failed to mark lesson as complete');
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-t-[#00C853] border-gray-200 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600">Loading course content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Course Navigation Sidebar */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Course Progress</CardTitle>
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-600">{Math.round(progress)}% Complete</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {modules.map((module) => (
              <div key={module.id} className="border rounded-lg p-3">
                <button
                  onClick={() => setActiveModule(module.id)}
                  className={`w-full text-left font-medium ${
                    activeModule === module.id ? 'text-[#00C853]' : 'text-gray-700'
                  }`}
                >
                  {module.title}
                </button>
                
                {activeModule === module.id && (
                  <div className="mt-2 space-y-1">
                    {module.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLesson(lesson.id)}
                        className={`w-full text-left text-sm p-2 rounded flex items-center justify-between ${
                          activeLesson === lesson.id
                            ? 'bg-green-50 text-[#00C853]'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex items-center">
                          {lesson.completed ? (
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          )}
                          {lesson.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-3">
        {currentLesson ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PlayCircle className="h-6 w-6 mr-2 text-[#00C853]" />
                {currentLesson.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap">{currentLesson.content}</div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  {!currentLesson.completed && (
                    <Button
                      onClick={() => markLessonComplete(currentLesson.id)}
                      className="bg-[#00C853] hover:bg-[#00B248] text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Complete
                    </Button>
                  )}
                  
                  {currentLesson.completed && (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Completed
                    </div>
                  )}

                  {nextLesson && (
                    <Button
                      onClick={() => setActiveLesson(nextLesson.id)}
                      variant="outline"
                    >
                      Next Lesson
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Lesson</h3>
              <p className="text-gray-600">Choose a module and lesson from the sidebar to start learning.</p>
            </CardContent>
          </Card>
        )}
        
        {progress === 100 && (
          <Card className="mt-6 bg-green-50 border-green-200">
            <CardContent className="text-center py-6">
              <Award className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">Congratulations!</h3>
              <p className="text-green-600">You have completed the entire course. Well done!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
});

OptimizedWebCourseContent.displayName = 'OptimizedWebCourseContent';

export default OptimizedWebCourseContent;
