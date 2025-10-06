
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface CourseLoadingSkeletonProps {
  count?: number;
  type?: 'card' | 'progress';
}

const CourseLoadingSkeleton: React.FC<CourseLoadingSkeletonProps> = ({ 
  count = 2, 
  type = 'card'
}) => {
  if (type === 'progress') {
    // Progress card skeleton style
    return (
      <>
        {Array(count).fill(0).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-start mb-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-1.5 w-full" />
            </div>
            <Skeleton className="h-8 w-full mt-4" />
          </div>
        ))}
      </>
    );
  }
  
  // Default course card skeleton style
  return (
    <>
      {Array(count).fill(0).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="w-3/4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          
          <div className="mt-auto pt-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-9 w-24 rounded" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default CourseLoadingSkeleton;
