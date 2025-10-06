
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Play, BookOpen, Clock, ChevronRight, Award } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  content: string;
  lesson_order: number;
}

interface Module {
  id: string;
  title: string;
  description: string;
  module_order: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  modules: Module[];
}

interface UserProgress {
  lesson_id: string;
  completed: boolean;
  completed_at: string;
}

interface ModularCourseContentProps {
  course: Course;
  userProgress: UserProgress[];
  onLessonComplete: (lessonId: string) => void;
}

const ModularCourseContent: React.FC<ModularCourseContentProps> = ({
  course,
  userProgress,
  onLessonComplete
}) => {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  // Calculate progress
  const allLessons = course.modules.flatMap(module => module.lessons);
  const completedLessons = userProgress.filter(p => p.completed).length;
  const progressPercentage = allLessons.length > 0 ? (completedLessons / allLessons.length) * 100 : 0;

  const isLessonCompleted = (lessonId: string) => {
    return userProgress.some(p => p.lesson_id === lessonId && p.completed);
  };

  const getModuleProgress = (module: Module) => {
    const moduleLessons = module.lessons;
    const completedInModule = moduleLessons.filter(lesson => isLessonCompleted(lesson.id)).length;
    return moduleLessons.length > 0 ? (completedInModule / moduleLessons.length) * 100 : 0;
  };

  const handleModuleClick = (moduleId: string) => {
    setExpandedModule(expandedModule === moduleId ? null : moduleId);
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  const handleMarkComplete = () => {
    if (selectedLesson) {
      onLessonComplete(selectedLesson.id);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Course Navigation Sidebar */}
      <div className="lg:col-span-1">
        <Card className="sticky top-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-[#00C853]" />
              <span>{course.title}</span>
            </CardTitle>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-[#00C853] font-bold">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{completedLessons} of {allLessons.length} lessons</span>
                {progressPercentage === 100 && (
                  <Badge className="bg-[#00C853] text-white">
                    <Award className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[65vh] overflow-y-auto">
              {course.modules
                .sort((a, b) => a.module_order - b.module_order)
                .map((module, moduleIndex) => {
                  const moduleProgress = getModuleProgress(module);
                  const isExpanded = expandedModule === module.id;
                  
                  return (
                    <div key={module.id} className="border-b border-gray-100 last:border-b-0">
                      <button
                        onClick={() => handleModuleClick(module.id)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              moduleProgress === 100 
                                ? 'bg-[#00C853] text-white' 
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {moduleProgress === 100 ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                moduleIndex + 1
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{module.title}</div>
                              <div className="text-xs text-gray-500">{module.lessons.length} lessons</div>
                            </div>
                          </div>
                          <ChevronRight className={`h-4 w-4 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`} />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Progress value={moduleProgress} className="h-1 flex-1" />
                          <span className="text-xs text-gray-500">{Math.round(moduleProgress)}%</span>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="bg-gray-50 border-t border-gray-100">
                          {module.lessons
                            .sort((a, b) => a.lesson_order - b.lesson_order)
                            .map((lesson, lessonIndex) => {
                              const completed = isLessonCompleted(lesson.id);
                              const isSelected = selectedLesson?.id === lesson.id;
                              
                              return (
                                <button
                                  key={lesson.id}
                                  onClick={() => handleLessonClick(lesson)}
                                  className={`w-full p-3 pl-8 text-left hover:bg-gray-100 transition-colors border-l-2 ${
                                    isSelected 
                                      ? 'border-[#00C853] bg-green-50' 
                                      : 'border-transparent'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    {completed ? (
                                      <CheckCircle className="h-4 w-4 text-[#00C853]" />
                                    ) : (
                                      <Play className="h-4 w-4 text-gray-400" />
                                    )}
                                    <span className={`text-sm ${
                                      completed ? 'text-[#00C853] font-medium' : 'text-gray-700'
                                    }`}>
                                      {lessonIndex + 1}. {lesson.title}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-2">
        {selectedLesson ? (
          <Card>
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-[#00C853]" />
                  <span>{selectedLesson.title}</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {isLessonCompleted(selectedLesson.id) ? (
                    <Badge className="bg-[#00C853] text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-orange-200 text-orange-600">
                      <Clock className="h-3 w-3 mr-1" />
                      In Progress
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose max-w-none mb-6">
                <div 
                  className="text-gray-700 leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{ __html: selectedLesson.content }}
                />
              </div>
              
              {!isLessonCompleted(selectedLesson.id) && (
                <div className="border-t border-gray-100 pt-6">
                  <Button 
                    onClick={handleMarkComplete}
                    className="bg-[#00C853] hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Complete
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="max-w-md mx-auto">
                <BookOpen className="h-16 w-16 text-[#00C853] mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to {course.title}</h3>
                <p className="text-gray-600 mb-6">{course.description}</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-green-800 mb-2">🎯 Course Structure</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <div>📚 {course.modules.length} interactive modules</div>
                    <div>📝 {allLessons.length} practical lessons</div>
                    <div>✅ Track your progress as you learn</div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Select a module from the sidebar to start your learning journey
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ModularCourseContent;
