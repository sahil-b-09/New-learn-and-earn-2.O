
import React from 'react';
import { CheckCircle, BookOpen } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Module, Lesson, UserProgress } from '@/types/course';

interface LessonItemProps {
  lesson: Lesson;
  isCompleted: boolean;
  isActive: boolean;
  onClick: () => void;
}

const LessonItem: React.FC<LessonItemProps> = ({ lesson, isCompleted, isActive, onClick }) => {
  return (
    <div 
      className={`
        p-3 mb-2 rounded-md cursor-pointer transition-colors
        ${isActive ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'}
        ${isCompleted ? 'bg-green-50 border-green-100' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {isCompleted ? (
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
        ) : (
          <div className={`h-4 w-4 rounded-full border ${isActive ? 'border-blue-500 bg-blue-100' : 'border-gray-300'} flex-shrink-0`} />
        )}
        <span className={`text-sm ${isCompleted ? 'text-green-700' : 'text-gray-700'} ${isActive ? 'font-medium' : ''}`}>
          {lesson.title}
        </span>
      </div>
    </div>
  );
};

interface ModuleContentProps {
  activeModule: Module;
  activeLessonId: string | null;
  lessons: Lesson[];
  userProgress: UserProgress[];
  onSelectLesson: (lesson: Lesson) => void;
  onMarkComplete: () => void;
  isMarkingComplete: boolean;
  completedLessonIds: string[];
}

const ModuleContent: React.FC<ModuleContentProps> = ({ 
  activeModule, 
  activeLessonId,
  lessons,
  onSelectLesson,
  onMarkComplete,
  isMarkingComplete,
  completedLessonIds
}) => {
  // Find the active lesson from the lessons array
  const activeLesson = lessons.find(lesson => lesson.id === activeLessonId) || lessons[0];
  
  // Calculate module progress
  const totalLessons = lessons.length;
  const completedLessons = completedLessonIds.length;
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  
  // Check if the current lesson is completed
  const isCurrentLessonCompleted = completedLessonIds.includes(activeLesson?.id || '');
  
  // Check if all lessons are completed
  const isModuleCompleted = totalLessons > 0 && completedLessons === totalLessons;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Left sidebar - Lesson list */}
      <div className="md:col-span-1 bg-white rounded-lg shadow-sm border border-gray-100 p-4 h-fit">
        <div className="mb-3">
          <h2 className="font-semibold text-gray-800 mb-1">{activeModule.title}</h2>
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>{completedLessons} of {totalLessons} completed</span>
            <span>{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-1.5" />
        </div>
        
        <div className="border-t pt-3">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Lessons</h3>
          <div className="space-y-1">
            {lessons.map((lesson) => (
              <LessonItem
                key={lesson.id}
                lesson={lesson}
                isCompleted={completedLessonIds.includes(lesson.id)}
                isActive={lesson.id === activeLesson?.id}
                onClick={() => onSelectLesson(lesson)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="md:col-span-3 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
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
                onClick={() => {
                  const currentIndex = lessons.findIndex(l => l.id === activeLesson.id);
                  if (currentIndex > 0) {
                    onSelectLesson(lessons[currentIndex - 1]);
                  }
                }}
                disabled={lessons.findIndex(l => l.id === activeLesson.id) === 0}
              >
                Previous Lesson
              </Button>
              
              {!isCurrentLessonCompleted ? (
                <Button 
                  onClick={onMarkComplete}
                  disabled={isMarkingComplete}
                  className="bg-[#00C853] hover:bg-green-700"
                >
                  {isMarkingComplete ? "Saving..." : "Mark as Complete"}
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    const currentIndex = lessons.findIndex(l => l.id === activeLesson.id);
                    if (currentIndex < lessons.length - 1) {
                      onSelectLesson(lessons[currentIndex + 1]);
                    }
                  }}
                  disabled={lessons.findIndex(l => l.id === activeLesson.id) === lessons.length - 1}
                  className="bg-[#4F46E5] hover:bg-blue-700"
                >
                  Next Lesson
                </Button>
              )}
            </div>
            
            {isModuleCompleted && (
              <div className="mt-8 p-4 bg-green-50 border border-green-100 rounded-lg text-center">
                <h3 className="text-green-800 font-medium">🎉 Module Completed!</h3>
                <p className="text-green-700 text-sm mt-1">Congratulations on completing all lessons in this module.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">Select a lesson to start learning</p>
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
    
    // Handle tables (basic implementation)
    .replace(/\|(.+)\|/g, '<tr>$1</tr>')
    .replace(/<tr>(.+?)<\/tr>/g, function(match) {
      return match.replace(/\|(.+?)\|/g, '<td class="border px-4 py-2">$1</td>');
    })
    .replace(/(<tr>.+?<\/tr>\n)+/g, '<table class="min-w-full border-collapse my-4">$&</table>')
    
    // Format horizontal rules
    .replace(/^---$/gm, '<hr class="my-6 border-t border-gray-200" />');
  
  return formattedContent;
}

export default ModuleContent;
