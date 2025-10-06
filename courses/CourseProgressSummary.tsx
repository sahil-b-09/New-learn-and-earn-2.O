
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle, Clock } from 'lucide-react';
import { CourseWithProgress } from '@/types/course';

interface CourseProgressSummaryProps {
  course: CourseWithProgress;
  onContinue: () => void;
  onShare: () => void;
}

const CourseProgressSummary: React.FC<CourseProgressSummaryProps> = ({ course, onContinue, onShare }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{course.title}</h2>
          <p className="text-gray-600 text-sm mb-4">{course.description || "No description available"}</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full text-blue-600 text-xs font-semibold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Web Course</span>
        </div>
      </div>
      
      {/* Simplified Progress Bar */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Course Progress
          </span>
          <span className="text-sm font-medium text-gray-700">
            {course.progress}%
          </span>
        </div>
        <Progress value={course.progress} className="h-2" />
      </div>
      
      {/* Simple Progress Stats */}
      <div className="flex items-center justify-between mb-5 p-3 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-800">{course.totalModules}</div>
          <div className="text-xs text-gray-500">Total Modules</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">{course.completedModules}</div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">{course.totalModules - course.completedModules}</div>
          <div className="text-xs text-gray-500">Remaining</div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3">
        <button 
          onClick={onContinue}
          className="flex-1 py-2.5 px-4 bg-[#4F46E5] hover:bg-blue-700 text-white rounded-md font-medium flex items-center justify-center gap-2 transition-colors"
        >
          {course.progress > 0 ? (
            <>
              <Clock className="w-4 h-4" /> 
              Continue Learning
            </>
          ) : (
            <>
              <BookOpen className="w-4 h-4" /> 
              Start Learning
            </>
          )}
        </button>
        <button 
          onClick={onShare}
          className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
          Share & Earn
        </button>
      </div>
    </div>
  );
};

export default CourseProgressSummary;
