
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, Users, TrendingUp, ShoppingBag, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import AnalyticsPeriodSelector from './AnalyticsPeriodSelector';
import MetricCard from './MetricCard';
import AnalyticsChart from './AnalyticsChart';
import {
  fetchAnalyticsData,
  calculateMetricSummary,
  fetchDashboardSummary,
  DailyMetric
} from '@/services/analyticsService';
import { useToast } from '@/hooks/use-toast';

const AnalyticsDashboard: React.FC = () => {
  const [selectedDays, setSelectedDays] = useState(30);
  const [selectedTab, setSelectedTab] = useState('overview');
  const { toast } = useToast();
  
  // Fetch analytics data
  const { 
    data: analyticsData,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ['analytics', selectedDays],
    queryFn: () => fetchAnalyticsData(selectedDays),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch dashboard summary data
  const {
    data: dashboardSummary,
    isLoading: isLoadingSummary,
    error: summaryError,
    refetch: refetchSummary
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Calculate metric summaries from analytics data
  const userMetrics = calculateMetricSummary(analyticsData || [], 'active_users', 7, 7);
  const signupMetrics = calculateMetricSummary(analyticsData || [], 'new_signups', 7, 7);
  const revenueMetrics = calculateMetricSummary(analyticsData || [], 'total_revenue', 7, 7);
  const referralMetrics = calculateMetricSummary(analyticsData || [], 'referral_count', 7, 7);
  

  const handleRefreshData = async () => {
    await Promise.all([refetchAnalytics(), refetchSummary()]);
    toast({
      title: "Data Refreshed",
      description: "Analytics data has been updated",
    });
  };

  const isLoading = isLoadingAnalytics || isLoadingSummary;
  const error = analyticsError || summaryError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Analytics Dashboard</h2>
          <p className="text-gray-500">Track key metrics for your platform</p>
        </div>
        
        <div className="flex gap-2">
          <AnalyticsPeriodSelector 
            selectedDays={selectedDays} 
            onSelectDays={setSelectedDays} 
          />
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshData} 
            disabled={isLoading}
            className="ml-2"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading analytics data. Please try again.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <h3 className="text-2xl font-bold mt-1">
                  {isLoadingSummary ? (
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    dashboardSummary?.totalUsers.toLocaleString() || 0
                  )}
                </h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <h3 className="text-2xl font-bold mt-1">
                  {isLoadingSummary ? (
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    `₹${dashboardSummary?.totalRevenue.toLocaleString() || 0}`
                  )}
                </h3>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Courses</p>
                <h3 className="text-2xl font-bold mt-1">
                  {isLoadingSummary ? (
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    dashboardSummary?.totalCourses.toLocaleString() || 0
                  )}
                </h3>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Purchases</p>
                <h3 className="text-2xl font-bold mt-1">
                  {isLoadingSummary ? (
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    dashboardSummary?.totalPurchases.toLocaleString() || 0
                  )}
                </h3>
              </div>
              <div className="p-3 bg-orange-50 rounded-full">
                <ShoppingBag className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Separator />
      
      {/* Key metrics overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Active Users" 
          value={dashboardSummary?.activeUsers?.current || 0} 
          change={dashboardSummary?.activeUsers?.percentChange || 0} 
          loading={isLoading}
        />
        <MetricCard 
          title="New Sign-ups" 
          value={dashboardSummary?.newSignups?.current || 0} 
          change={dashboardSummary?.newSignups?.percentChange || 0}
          loading={isLoading}
        />
        <MetricCard 
          title="Revenue" 
          value={dashboardSummary?.revenue?.current || 0} 
          change={dashboardSummary?.revenue?.percentChange || 0}
          prefix="₹"
          loading={isLoading}
        />
        <MetricCard 
          title="Referrals" 
          value={dashboardSummary?.referrals?.current || 0} 
          change={dashboardSummary?.referrals?.percentChange || 0}
          loading={isLoading}
        />
      </div>
      
      {/* Dashboard tabs */}
      <Tabs 
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <AnalyticsChart
            title="Activity Overview"
            data={analyticsData || []}
            type="line"
            loading={isLoadingAnalytics}
            dataKeys={[
              { key: 'active_users', name: 'Active Users', color: '#2196F3' },
              { key: 'course_enrollments', name: 'Course Enrollments', color: '#00C853' },
            ]}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsChart
              title="Revenue vs Referral Commissions"
              data={analyticsData || []}
              type="bar"
              loading={isLoadingAnalytics}
              dataKeys={[
                { key: 'total_revenue', name: 'Total Revenue', color: '#00C853' },
                { key: 'referral_commissions', name: 'Referral Commissions', color: '#673AB7' },
              ]}
            />
            
            <AnalyticsChart
              title="User Growth"
              data={analyticsData || []}
              type="area"
              loading={isLoadingAnalytics}
              dataKeys={[
                { key: 'new_signups', name: 'New Sign-ups', color: '#FF9800' },
              ]}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsChart
              title="User Growth"
              data={analyticsData || []}
              type="area"
              loading={isLoadingAnalytics}
              dataKeys={[
                { key: 'new_signups', name: 'New Sign-ups', color: '#2196F3' },
              ]}
            />
            
            <AnalyticsChart
              title="Daily Active Users"
              data={analyticsData || []}
              type="line"
              loading={isLoadingAnalytics}
              dataKeys={[
                { key: 'active_users', name: 'Active Users', color: '#FF9800' },
              ]}
            />
          </div>
          
          <AnalyticsChart
            title="User Activity vs Course Completions"
            description="Comparing active users against lesson completion rates"
            data={analyticsData || []}
            type="line"
            loading={isLoadingAnalytics}
            dataKeys={[
              { key: 'active_users', name: 'Active Users', color: '#2196F3' },
              { key: 'lesson_completions', name: 'Lesson Completions', color: '#4CAF50' },
            ]}
          />
        </TabsContent>
        
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsChart
              title="Revenue"
              data={analyticsData || []}
              type="bar"
              loading={isLoadingAnalytics}
              dataKeys={[
                { key: 'total_revenue', name: 'Total Revenue', color: '#00C853' },
                { key: 'referral_commissions', name: 'Referral Commissions', color: '#673AB7' },
              ]}
            />
            
            <AnalyticsChart
              title="Referral Performance"
              data={analyticsData || []}
              type="line"
              loading={isLoadingAnalytics}
              dataKeys={[
                { key: 'referral_count', name: 'Referral Count', color: '#FF5722' },
              ]}
            />
          </div>
          
          <AnalyticsChart
            title="Revenue vs Enrollments"
            description="Correlation between revenue and new course enrollments"
            data={analyticsData || []}
            type="line"
            loading={isLoadingAnalytics}
            dataKeys={[
              { key: 'total_revenue', name: 'Revenue (₹)', color: '#00C853' },
              { key: 'course_enrollments', name: 'Enrollments', color: '#2196F3' },
            ]}
          />
        </TabsContent>
        
        <TabsContent value="courses" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsChart
              title="Course Enrollments"
              data={analyticsData || []}
              type="bar"
              loading={isLoadingAnalytics}
              dataKeys={[
                { key: 'course_enrollments', name: 'New Enrollments', color: '#2196F3' },
              ]}
            />
            
            <AnalyticsChart
              title="Lesson Completions"
              data={analyticsData || []}
              type="line"
              loading={isLoadingAnalytics}
              dataKeys={[
                { key: 'lesson_completions', name: 'Completed Lessons', color: '#4CAF50' },
                { key: 'course_completion_rate', name: 'Completion Rate (%)', color: '#673AB7' },
              ]}
            />
          </div>
          
          <AnalyticsChart
            title="Course Engagement Over Time"
            description="Showing course completion rates and enrollments"
            data={analyticsData || []}
            type="area"
            loading={isLoadingAnalytics}
            dataKeys={[
              { key: 'course_enrollments', name: 'Enrollments', color: '#2196F3' },
              { key: 'course_completion_rate', name: 'Completion Rate (%)', color: '#673AB7' },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
