
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Database, Plus, TestTube, Trash2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { triggerInitialization } from '@/utils/autoSetupCourses';
import { supabase } from '@/integrations/supabase/client';
import { TestDataManager } from '@/utils/testDataManager';

interface InitializationButtonProps {
  // No props needed since admin check is now database-driven
}

const InitializationButton: React.FC<InitializationButtonProps> = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();

  // Check if current user is admin using database
  const checkIfAdmin = async (): Promise<boolean> => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Use the existing is_admin RPC function from the database
      const { data, error } = await supabase.rpc('is_admin_user');
      
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      
      return data || false;
    } catch (error) {
      console.error('Exception checking admin status:', error);
      return false;
    }
  };

  // Call API endpoint to trigger initialization
  const callInitializationAPI = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const response = await fetch('/api/admin/initialize-test-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API call failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  };

  // Get initialization status using TestDataManager
  const getInitializationStatus = async () => {
    try {
      setStatusLoading(true);
      const result = await TestDataManager.getDatabaseStatus();
      setStatus(result);
      
      toast({
        title: "Status Retrieved",
        description: `Found ${result.courses.count} courses and ${result.users.count} users`,
        variant: "default"
      });
      
      return result;
    } catch (error) {
      console.error('Status check error:', error);
      toast({
        title: "Status Check Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setStatusLoading(false);
    }
  };

  // Run comprehensive test
  const runComprehensiveTest = async () => {
    try {
      setTestLoading(true);
      toast({
        title: "Running Comprehensive Test",
        description: "Testing admin status, database connectivity, and data creation...",
      });
      
      const results = await TestDataManager.runComprehensiveTest();
      setTestResults(results);
      
      if (results.courseCreation.success && results.verification.success) {
        toast({
          title: "Test Completed Successfully",
          description: `Created/verified ${results.verification.totalCourses} courses. Admin status: ${results.adminStatus.isAdmin ? 'Confirmed' : 'Not admin'}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Test Completed with Issues",
          description: "Some tests failed. Check console for details.",
          variant: "destructive"
        });
      }
      
      // Refresh status after test
      await getInitializationStatus();
    } catch (error) {
      console.error('Comprehensive test error:', error);
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Clear test data
  const clearTestData = async () => {
    try {
      setClearLoading(true);
      const result = await TestDataManager.clearTestData();
      
      toast({
        title: "Test Data Cleared",
        description: `Removed ${result.deletedCount} test courses`,
        variant: "default"
      });
      
      // Refresh status after clearing
      await getInitializationStatus();
    } catch (error) {
      console.error('Clear test data error:', error);
      toast({
        title: "Clear Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setClearLoading(false);
    }
  };

  const handleReinitialization = async () => {
    try {
      // Check if user is admin
      const isAdmin = await checkIfAdmin();
      if (!isAdmin) {
        console.log("Non-admin attempted to use initialization button");
        toast({
          title: "Access Denied",
          description: "Only administrators can initialize test data.",
          variant: "destructive"
        });
        return;
      }

      setIsLoading(true);
      toast({
        title: "Initializing Test Data",
        description: "Please wait while test data is being created...",
      });
      
      // Try API endpoint first
      try {
        const result = await callInitializationAPI();
        
        if (result.success) {
          toast({
            title: "Initialization Complete",
            description: `Created ${result.createdCourses} new courses. Found ${result.existingCourses} existing courses.`,
            variant: "default"
          });
          // Refresh status after successful initialization
          await getInitializationStatus();
        } else {
          throw new Error(result.error || 'API initialization failed');
        }
      } catch (apiError) {
        console.log('API initialization failed, trying frontend method:', apiError);
        
        // Fallback to frontend initialization
        const result = await triggerInitialization();
        
        if (result.success) {
          toast({
            title: "Initialization Complete (Frontend)",
            description: "Course data has been successfully set up.",
            variant: "default"
          });
        } else {
          toast({
            title: "Initialization Failed",
            description: "Both API and frontend initialization failed. Check console for details.",
            variant: "destructive"
          });
          console.error("Initialization error details:", result.error);
        }
      }
    } catch (error) {
      console.error("Error during manual initialization:", error);
      toast({
        title: "Initialization Error",
        description: "An unexpected error occurred during the process.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold">Test Data Management & Verification</h3>
      
      {status && (
        <div className="text-sm space-y-2 p-3 bg-muted rounded">
          <div className="flex justify-between">
            <span>Courses:</span> 
            <span className="font-medium">{status.courses?.count || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Users:</span> 
            <span className="font-medium">{status.users?.count || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span> 
            <span className={`font-medium ${status.isInitialized ? 'text-green-600' : 'text-orange-600'}`}>
              {status.isInitialized ? 'Initialized' : 'Not Initialized'}
            </span>
          </div>
          {status.currentUser && (
            <div className="flex justify-between">
              <span>Current User:</span> 
              <span className="font-medium text-xs">{status.currentUser.email}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button 
          onClick={getInitializationStatus}
          disabled={statusLoading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          data-testid="button-check-status"
        >
          {statusLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking...</span>
            </>
          ) : (
            <>
              <Database className="h-4 w-4" />
              <span>Check Status</span>
            </>
          )}
        </Button>

        <Button 
          onClick={runComprehensiveTest}
          disabled={testLoading}
          variant="default"
          size="sm"
          className="flex items-center gap-2"
          data-testid="button-comprehensive-test"
        >
          {testLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Testing...</span>
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4" />
              <span>Run Full Test</span>
            </>
          )}
        </Button>

        <Button 
          onClick={handleReinitialization}
          disabled={isLoading}
          variant="secondary"
          size="sm"
          className="flex items-center gap-2"
          data-testid="button-initialize-data"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Initializing...</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span>Legacy Init</span>
            </>
          )}
        </Button>

        <Button 
          onClick={clearTestData}
          disabled={clearLoading}
          variant="destructive"
          size="sm"
          className="flex items-center gap-2"
          data-testid="button-clear-data"
        >
          {clearLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Clearing...</span>
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              <span>Clear Test Data</span>
            </>
          )}
        </Button>
      </div>

      {testResults && (
        <div className="text-xs space-y-2 p-3 bg-blue-50 dark:bg-blue-950 rounded">
          <div className="font-medium text-blue-800 dark:text-blue-200">Last Test Results:</div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Admin Status:</span>
              <span className={testResults.adminStatus.isAdmin ? 'text-green-600' : 'text-red-600'}>
                {testResults.adminStatus.isAdmin ? '✓ Admin' : '✗ Not Admin'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Course Creation:</span>
              <span className={testResults.courseCreation.success ? 'text-green-600' : 'text-red-600'}>
                {testResults.courseCreation.success ? '✓ Success' : '✗ Failed'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Data Verification:</span>
              <span className={testResults.verification.success ? 'text-green-600' : 'text-red-600'}>
                {testResults.verification.success ? '✓ Passed' : '✗ Failed'}
              </span>
            </div>
          </div>
        </div>
      )}

      {status?.courses?.data && status.courses.data.length > 0 && (
        <div className="text-xs space-y-1 p-3 bg-green-50 dark:bg-green-950 rounded">
          <div className="font-medium text-green-800 dark:text-green-200">Available Courses:</div>
          {status.courses.data.slice(0, 3).map((course: any, index: number) => (
            <div key={index} className="text-green-700 dark:text-green-300">
              • {course.title} (₹{course.price})
            </div>
          ))}
          {status.courses.data.length > 3 && (
            <div className="text-green-600 dark:text-green-400">...and {status.courses.data.length - 3} more</div>
          )}
        </div>
      )}
    </div>
  );
};

export default InitializationButton;
