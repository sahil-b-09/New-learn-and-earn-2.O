import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, PlayCircle, BookOpen, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

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

interface WebCourseContentProps {
  courseId: string;
  courseTitle: string;
}

const WebCourseContent: React.FC<WebCourseContentProps> = ({ courseId, courseTitle }) => {
  const { user } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadCourseContent = async () => {
      if (!user || !courseId) return;

      try {
        setIsLoading(true);

        // Load modules for this course
        const { data: modulesData, error: modulesError } = await supabase
          .from('course_modules')
          .select('*')
          .eq('course_id', courseId)
          .eq('is_active', true)
          .order('module_order');

        if (modulesError) {
          console.error('Error loading modules:', modulesError);
          // Create demo modules if none exist
          await createDemoModules();
          return;
        }

        if (!modulesData || modulesData.length === 0) {
          // Create demo modules if none exist
          await createDemoModules();
          return;
        }

        // Load ALL lessons for each module (no limits)
        const modulesWithLessons = await Promise.all(
          modulesData.map(async (module) => {
            const { data: lessonsData, error: lessonsError } = await supabase
              .from('lessons')
              .select('*')
              .eq('module_id', module.id)
              .order('lesson_order');

            if (lessonsError) {
              console.error('Error loading lessons:', lessonsError);
              return { ...module, lessons: [] };
            }

            // Check completion status for each lesson
            const lessonsWithProgress = await Promise.all(
              (lessonsData || []).map(async (lesson) => {
                const { data: progressData } = await supabase
                  .from('user_progress')
                  .select('completed')
                  .eq('user_id', user.id)
                  .eq('lesson_id', lesson.id)
                  .single();

                return {
                  ...lesson,
                  completed: progressData?.completed || false
                };
              })
            );

            return { ...module, lessons: lessonsWithProgress };
          })
        );

        setModules(modulesWithLessons);
        
        // Set first module as active and expanded if none selected
        if (modulesWithLessons.length > 0 && !activeModule) {
          const firstModule = modulesWithLessons[0];
          setActiveModule(firstModule.id);
          setExpandedModules(new Set([firstModule.id]));
          if (firstModule.lessons.length > 0) {
            setActiveLesson(firstModule.lessons[0].id);
          }
        }

        // Calculate overall progress
        calculateProgress(modulesWithLessons);
      } catch (error) {
        console.error('Error loading course content:', error);
        toast.error('Failed to load course content');
      } finally {
        setIsLoading(false);
      }
    };

    loadCourseContent();
  }, [user, courseId, activeModule]);

  const createDemoModules = async () => {
    try {
      // Create demo modules for the course
      const demoModules = [
        {
          course_id: courseId,
          title: 'Introduction & Getting Started',
          description: 'Welcome to the course! Learn the basics and set up your environment.',
          content: 'This module covers the fundamentals and helps you get started.',
          module_order: 1,
          is_active: true
        },
        {
          course_id: courseId,
          title: 'Core Concepts',
          description: 'Dive deep into the main concepts and principles.',
          content: 'Understanding the core concepts is essential for mastery.',
          module_order: 2,
          is_active: true
        },
        {
          course_id: courseId,
          title: 'Practical Applications',
          description: 'Apply what you\'ve learned through hands-on exercises.',
          content: 'Put theory into practice with real-world examples.',
          module_order: 3,
          is_active: true
        }
      ];

      for (const moduleData of demoModules) {
        const { data: moduleResult, error: moduleError } = await supabase
          .from('course_modules')
          .insert(moduleData)
          .select()
          .single();

        if (moduleError) {
          console.error('Error creating module:', moduleError);
          continue;
        }

        // Create demo lessons for each module
        const demoLessons = [
          {
            module_id: moduleResult.id,
            title: `${moduleData.title} - Lesson 1`,
            content: `Welcome to ${moduleData.title}! This lesson introduces the key concepts you'll learn in this module.`,
            lesson_order: 1
          },
          {
            module_id: moduleResult.id,
            title: `${moduleData.title} - Lesson 2`,
            content: `In this lesson, we'll dive deeper into the practical aspects of ${moduleData.title.toLowerCase()}.`,
            lesson_order: 2
          }
        ];

        for (const lessonData of demoLessons) {
          const { error: lessonError } = await supabase
            .from('lessons')
            .insert(lessonData);

          if (lessonError) {
            console.error('Error creating lesson:', lessonError);
          }
        }
      }

      // Reload the content
      window.location.reload();
    } catch (error) {
      console.error('Error creating demo modules:', error);
    }
  };

  const calculateProgress = (modulesData: Module[]) => {
    const totalLessons = modulesData.reduce((total, module) => total + module.lessons.length, 0);
    const completedLessons = modulesData.reduce(
      (total, module) => total + module.lessons.filter(lesson => lesson.completed).length,
      0
    );
    
    const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    setProgress(progressPercentage);
  };

  const markLessonComplete = async (lessonId: string) => {
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

      if (error) {
        console.error('Error marking lesson complete:', error);
        return;
      }

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
      
      // Recalculate progress
      calculateProgress(modules);
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      toast.error('Failed to mark lesson as complete');
    }
  };

  const toggleModuleExpanded = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const getCurrentLesson = () => {
    if (!activeLesson) return null;
    
    for (const module of modules) {
      const lesson = module.lessons.find(l => l.id === activeLesson);
      if (lesson) return lesson;
    }
    return null;
  };

  const getNextLesson = () => {
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
  };

  const currentLesson = getCurrentLesson();
  const nextLesson = getNextLesson();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-[#00C853] border-gray-200 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600">Loading course content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-6">
      {/* Mobile-First Course Navigation */}
      <div className="lg:col-span-1 order-2 lg:order-1">
        <Card className="sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Course Progress</CardTitle>
            <div className="space-y-2">
              <Progress value={progress} className="w-full h-2" />
              <p className="text-sm text-gray-600">{Math.round(progress)}% Complete</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
            {modules.map((module) => (
              <div key={module.id} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    setActiveModule(module.id);
                    toggleModuleExpanded(module.id);
                  }}
                  className={`w-full text-left p-3 font-medium flex items-center justify-between transition-colors ${
                    activeModule === module.id ? 'bg-green-50 text-[#00C853]' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-medium truncate pr-2">{module.title}</span>
                  {expandedModules.has(module.id) ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  )}
                </button>
                
                {expandedModules.has(module.id) && (
                  <div className="bg-gray-50 border-t">
                    {module.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLesson(lesson.id)}
                        className={`w-full text-left text-sm p-3 border-b last:border-b-0 flex items-center transition-colors ${
                          activeLesson === lesson.id
                            ? 'bg-green-100 text-[#00C853]'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {lesson.completed ? (
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="truncate">{lesson.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area - Mobile Optimized */}
      <div className="lg:col-span-3 order-1 lg:order-2">
        {currentLesson ? (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-start gap-3 text-lg lg:text-xl">
                <PlayCircle className="h-6 w-6 mt-0.5 text-[#00C853] flex-shrink-0" />
                <span className="leading-tight">{currentLesson.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose prose-sm lg:prose max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed text-gray-700">
                  {currentLesson.content}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                  {!currentLesson.completed ? (
                    <Button
                      onClick={() => markLessonComplete(currentLesson.id)}
                      className="bg-[#00C853] hover:bg-[#00B248] text-white w-full sm:w-auto"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Complete
                    </Button>
                  ) : (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Completed
                    </div>
                  )}

                  {nextLesson && (
                    <Button
                      onClick={() => setActiveLesson(nextLesson.id)}
                      variant="outline"
                      className="w-full sm:w-auto"
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
              <p className="text-gray-600 text-sm lg:text-base">Choose a module and lesson from the sidebar to start learning.</p>
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
};

export default WebCourseContent;
