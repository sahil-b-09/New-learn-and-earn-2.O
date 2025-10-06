
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Welcome Card Skeleton */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>

    {/* Courses Section Skeleton */}
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-start mb-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const WalletSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Balance Card Skeleton */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <Skeleton className="h-10 w-48 mb-2" />
      <Skeleton className="h-4 w-24" />
    </div>

    {/* Actions Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>

    {/* Payout Methods Skeleton */}
    <div className="space-y-4">
      <Skeleton className="h-6 w-40" />
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="p-4 border rounded-lg">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
