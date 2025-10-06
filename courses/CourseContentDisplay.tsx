
import React, { useState, useMemo } from 'react';
import { CheckCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CourseWithProgress } from '@/types/course';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface CourseContentDisplayProps {
  course: CourseWithProgress;
}

const CourseContentDisplay: React.FC<CourseContentDisplayProps> = ({ course }) => {
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  // Mock completed lesson IDs for now - this should come from user progress
  const completedLessonIds: string[] = [];

  // Group lessons by module
  const lessonsByModule = useMemo(() => {
    const groupedLessons: Record<string, any[]> = {};
    course.modules.forEach(module => {
      groupedLessons[module.id] = module.lessons || [];
    });
    return groupedLessons;
  }, [course.modules]);

  // Find active lesson
  const activeLesson = useMemo(() => {
    if (!activeLessonId) return null;
    for (const module of course.modules) {
      const lesson = module.lessons?.find(lesson => lesson.id === activeLessonId);
      if (lesson) return lesson;
    }
    return null;
  }, [course.modules, activeLessonId]);

  // Calculate module progress percentages
  const moduleProgress = useMemo(() => {
    const progress: Record<string, number> = {};
    course.modules.forEach(module => {
      const moduleLessons = lessonsByModule[module.id] || [];
      const completedCount = completedLessonIds.filter(id => 
        moduleLessons.some(lesson => lesson.id === id)
      ).length;
      progress[module.id] = moduleLessons.length > 0 
        ? Math.round((completedCount / moduleLessons.length) * 100) 
        : 0;
    });
    return progress;
  }, [course.modules, lessonsByModule, completedLessonIds]);

  const handleSelectModule = (module: any) => {
    setActiveModuleId(module.id);
  };

  const handleSelectLesson = (lesson: any) => {
    setActiveLessonId(lesson.id);
  };

  const handleMarkComplete = () => {
    // TODO: Implement mark as complete functionality
    console.log('Mark lesson as complete:', activeLessonId);
  };

  // Check if current lesson is completed
  const isCurrentLessonCompleted = activeLessonId 
    ? completedLessonIds.includes(activeLessonId)
    : false;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left sidebar - Course navigation */}
      <div className="md:col-span-1 bg-white rounded-lg shadow-sm border border-gray-100 p-4 h-fit">
        <h2 className="font-semibold text-gray-800 mb-4">{course.title}</h2>
        
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>{course.completedModules} of {course.totalModules} modules completed</span>
            <span>{Math.round(course.progress)}%</span>
          </div>
          <Progress value={course.progress} className="h-1.5" />
        </div>
        
        <Accordion type="multiple" defaultValue={activeModuleId ? [activeModuleId] : []}>
          {course.modules.map((module) => {
            const moduleLessons = lessonsByModule[module.id] || [];
            const progress = moduleProgress[module.id];
            const isActive = activeModuleId === module.id;
            
            return (
              <AccordionItem 
                key={module.id} 
                value={module.id}
                className={`${isActive ? 'border-l-2 border-l-blue-500 pl-2' : ''} mb-2 border-b-0`}
              >
                <AccordionTrigger className="hover:no-underline py-2 px-0">
                  <div className="flex flex-col items-start w-full">
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-sm ${isActive ? 'font-medium text-blue-700' : 'text-gray-700'}`}>
                        {module.title}
                      </span>
                      {progress === 100 && (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-2" />
                      )}
                    </div>
                    
                    <div className="w-full mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{completedLessonIds.filter(id => 
                          moduleLessons.some(lesson => lesson.id === id)
                        ).length} of {moduleLessons.length} completed</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="pt-2 pb-1 px-0">
                  <div className="space-y-1 pl-1">
                    {moduleLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className={`
                          p-2.5 mb-1 rounded-md flex items-center gap-2 cursor-pointer transition-colors
                          ${lesson.id === activeLessonId ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}
                          ${completedLessonIds.includes(lesson.id) ? 'text-green-700' : ''}
                        `}
                        onClick={() => {
                          handleSelectModule(module);
                          handleSelectLesson(lesson);
                        }}
                      >
                        {completedLessonIds.includes(lesson.id) ? (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <div className={`h-4 w-4 rounded-full border ${lesson.id === activeLessonId ? 'border-blue-500 bg-blue-100' : 'border-gray-300'} flex-shrink-0`} />
                        )}
                        <span className={`text-sm ${lesson.id === activeLessonId ? 'font-medium' : ''}`}>
                          {lesson.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* Main content area */}
      <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        {activeLesson ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {activeLesson.title}
              </h2>
              {isCurrentLessonCompleted && (
                <div className="flex items-center text-green-600 text-sm bg-green-50 px-2 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span>Completed</span>
                </div>
              )}
            </div>
            
            <div className="prose max-w-none mb-8" dangerouslySetInnerHTML={{ __html: formatContent(activeLesson.content) }} />
            
            <div className="flex justify-between pt-4 border-t border-gray-100">
              <Button 
                variant="outline" 
                className="flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5"></path>
                  <path d="m12 19-7-7 7-7"></path>
                </svg>
                Previous Lesson
              </Button>
              
              {!isCurrentLessonCompleted ? (
                <Button 
                  onClick={handleMarkComplete}
                  className="bg-[#00C853] hover:bg-green-700 flex items-center gap-1.5"
                >
                  Mark as Complete
                  <CheckCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  className="bg-[#4F46E5] hover:bg-blue-700 flex items-center gap-1.5"
                >
                  Next Lesson 
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg mb-2">Ready to start learning?</p>
            <p className="text-gray-400 text-sm mb-6">Select a lesson from the sidebar to begin.</p>
            
            {course.modules.length > 0 && (
              <Button 
                onClick={() => {
                  const firstModule = course.modules[0];
                  const firstModuleLessons = lessonsByModule[firstModule.id] || [];
                  if (firstModuleLessons.length > 0) {
                    handleSelectModule(firstModule);
                    handleSelectLesson(firstModuleLessons[0]);
                  }
                }}
                className="bg-[#4F46E5] hover:bg-blue-700"
              >
                Start First Lesson
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format content with Markdown-like formatting
function formatContent(content: string): string {
  if (!content) return '';
  
  // Convert markdown-style headers to HTML
  let formattedContent = content
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-gray-800 mt-6 mb-3">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-medium text-gray-700 mt-5 mb-2">$1</h3>')
    .replace(/^#### (.+)$/gm, '<h4 class="text-base font-medium text-gray-700 mt-4 mb-2">$1</h4>')
    
    // Format bold text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\_\_(.+?)\_\_/g, '<strong>$1</strong>')
    
    // Format italic text
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\_(.+?)\_/g, '<em>$1</em>')
    
    // Format lists
    .replace(/^\- (.+)$/gm, '<li class="ml-6 list-disc text-gray-700 mb-1">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-6 list-decimal text-gray-700 mb-1">$1</li>')
    
    // Format paragraphs (ensuring they have proper spacing)
    .replace(/^(?!(#|<h|<li|<\/ul|<ul|<ol|<\/ol))(.+)$/gm, '<p class="mb-4 text-gray-700">$2</p>')
    
    // Wrap adjacent list items in ul/ol tags
    .replace(/(<li class="ml-6 list-disc.+?<\/li>\n)+/g, '<ul class="my-3">$&</ul>')
    .replace(/(<li class="ml-6 list-decimal.+?<\/li>\n)+/g, '<ol class="my-3">$&</ol>')
    
    // Format code blocks
    .replace(/```(.+?)```/gs, '<pre class="bg-gray-50 p-3 rounded-md text-sm my-4 overflow-x-auto">$1</pre>')
    
    // Format inline code
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
    
    // Format blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-gray-200 pl-4 italic text-gray-600 my-4">$1</blockquote>')
    
    // Format horizontal rules
    .replace(/^---$/gm, '<hr class="my-6 border-t border-gray-200" />');
  
  return formattedContent;
}

export default CourseContentDisplay;
