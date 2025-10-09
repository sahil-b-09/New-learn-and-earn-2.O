
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import UnifiedHeader from '@/layout/UnifiedHeader';
import Footer from '@/layout/Footer';
import GrantAccessForm from '@/admin/GrantAccessForm';
import GrantCourseAccess from '@/admin/GrantCourseAccess';
import ContentManagement from '@/admin/ContentManagement';
import AdminManagement from '@/admin/AdminManagement';
import EnhancedAnalyticsDashboard from '@/admin/analytics/EnhancedAnalyticsDashboard';
// import SupportDashboard from '@/admin/support/SupportDashboard';
import PaymentsDashboard from '@/admin/payments/PaymentsDashboard';
import FinancialManagementDashboard from '@/admin/finance/FinancialManagementDashboard';
// import UserManagement from '@/admin/users/UserManagement';
import MessagingDashboard from '@/admin/messaging/MessagingDashboard';
import MarketingDisplayDashboard from '@/admin/marketing/MarketingDisplayDashboard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import { Activity, Settings, Users, FileText, MessageSquare, CreditCard, MessageCircle, ShieldAlert, Sparkles, ChartBar as BarChart3, TrendingUp, DollarSign, Megaphone, UserCog, Database, Briefcase } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert';

const AdminPanel: React.FC = () => {
  const { user, isAdmin: contextIsAdmin, isLoading: authLoading } = useAuth();
  
  // Double-check admin status from database using the existing is_admin function
  const { data: isAdmin, isLoading, error } = useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      try {
        console.log('Double-checking admin status for user:', user.id);
        
        // Use the existing is_admin function
        const { data, error } = await supabase.rpc('is_admin_user');
        
        if (error) {
          console.error('Error checking admin status:', error);
          throw error;
        }
        
        console.log('Admin status result from database:', data);
        return data || false;
      } catch (error) {
        console.error('Exception checking admin status:', error);
        throw error;
      }
    },
    enabled: !!user && !authLoading,
    staleTime: 60000, // Cache for 1 minute
    retry: 2,
  });
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-[#00C853] border-gray-200 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600">Checking admin permissions...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UnifiedHeader />
        <main className="max-w-[993px] mx-auto w-full px-6 py-8 flex-grow">
          <Alert variant="destructive">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>
              Failed to verify admin permissions. Please try refreshing the page or contact support.
              <br />
              <small className="text-xs opacity-75">Error: {error.message}</small>
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }
  
  // Use the database result, fallback to context if needed
  const finalIsAdmin = isAdmin ?? contextIsAdmin;
  
  if (!finalIsAdmin) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UnifiedHeader />
        <main className="max-w-[993px] mx-auto w-full px-6 py-8 flex-grow">
          <Alert variant="destructive">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have admin permissions to access this page.
              Please contact an administrator if you believe this is a mistake.
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <UnifiedHeader />
      <main className="max-w-[993px] mx-auto w-full px-6 py-8 max-sm:p-4 flex-grow">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comprehensive Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">Complete platform management and analytics suite</p>
          </div>
          <div className="text-sm text-gray-500">
            Logged in as <span className="font-medium">{user.email}</span>
          </div>
        </div>
        
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="mb-6 grid grid-cols-5 md:grid-cols-9 gap-1 text-xs p-1">
            <TabsTrigger value="tools" className="flex items-center gap-1 px-2 py-1.5">
              <Settings className="h-3 w-3" />
              <span className="hidden sm:inline text-xs">Tools</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1 px-2 py-1.5">
              <BarChart3 className="h-3 w-3" />
              <span className="hidden sm:inline text-xs">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1 px-2 py-1.5">
              <UserCog className="h-3 w-3" />
              <span className="hidden sm:inline text-xs">Users</span>
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center gap-1 px-2 py-1.5">
              <Megaphone className="h-3 w-3" />
              <span className="hidden sm:inline text-xs">Marketing</span>
            </TabsTrigger>
            <TabsTrigger value="finance" className="flex items-center gap-1 px-2 py-1.5">
              <DollarSign className="h-3 w-3" />
              <span className="hidden sm:inline text-xs">Finance</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-1 px-2 py-1.5">
              <FileText className="h-3 w-3" />
              <span className="hidden sm:inline text-xs">Content</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-1 px-2 py-1.5">
              <MessageSquare className="h-3 w-3" />
              <span className="hidden sm:inline text-xs">Support</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1 px-2 py-1.5">
              <CreditCard className="h-3 w-3" />
              <span className="hidden sm:inline text-xs">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="messaging" className="flex items-center gap-1 px-2 py-1.5">
              <MessageCircle className="h-3 w-3" />
              <span className="hidden sm:inline text-xs">Messaging</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tools" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Quick Access Tools</h2>
                <div className="space-y-6">
                  <GrantAccessForm />
                  <GrantCourseAccess />
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-4">Admin Management</h2>
                <div className="space-y-6">
                  <AdminManagement currentAdminId={user.id} />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics">
            <EnhancedAnalyticsDashboard />
          </TabsContent>
          
          <TabsContent value="users">
            <AdminManagement />
          </TabsContent>
          
          
          <TabsContent value="marketing">
            <MarketingDisplayDashboard />
          </TabsContent>
          
          <TabsContent value="finance">
            <FinancialManagementDashboard />
          </TabsContent>
          
          <TabsContent value="content">
            <ContentManagement />
          </TabsContent>
          
          <TabsContent value="support">
            <div className="p-6 bg-white rounded-lg shadow">
              <p className="text-gray-600">Support Dashboard - Coming Soon</p>
            </div>
          </TabsContent>
          
          <TabsContent value="payments">
            <PaymentsDashboard />
          </TabsContent>
          
          <TabsContent value="messaging">
            <MessagingDashboard />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default AdminPanel;
