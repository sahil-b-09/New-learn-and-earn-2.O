
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, ChevronRight, AlertCircle } from 'lucide-react';
import { CourseWithProgress } from '@/types/course';

interface CourseProgressCardProps {
  course: CourseWithProgress;
}

const CourseProgressCard: React.FC<CourseProgressCardProps> = ({ course }) => {
  const navigate = useNavigate();

  // Handle the case where modules might not exist or be empty
  const hasModules = course.modules && course.modules.length > 0;
  const totalModules = course.totalModules || 0;
  const completedModules = course.completedModules || 0;
  const progress = course.progress || 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-800">{course.title}</h3>
        <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full text-blue-600 text-xs">
          <BookOpen className="w-3 h-3" />
          <span>Web Course</span>
        </div>
      </div>
      
      {hasModules ? (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-gray-700">
              {completedModules}/{totalModules} modules
            </span>
            <span className="text-xs font-medium text-gray-700">
              {progress}%
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      ) : (
        <div className="mb-4 py-2 px-3 bg-amber-50 border border-amber-100 rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-amber-700">Content is being prepared</span>
        </div>
      )}
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full text-[#4F46E5] justify-between hover:bg-blue-50 hover:text-blue-700"
        onClick={() => navigate(`/course-content/${course.id}`)}
      >
        <span>
          {!hasModules ? 'View Course' :
           progress === 0 ? 'Start Learning' : 
           progress === 100 ? 'Review Course' : 
           'Continue Learning'}
        </span>
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
};

export default CourseProgressCard;
