
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, UserMinus, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger 
} from '@/components/ui/sheet';

interface AdminResult {
  success: boolean;
  message: string;
  user_id?: string;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  joined_at: string;
}

// Helper function to validate and convert data to AdminResult
function toAdminResult(data: unknown): AdminResult {
  // Default result if data is invalid
  const defaultResult: AdminResult = {
    success: false,
    message: "Invalid response format"
  };
  
  // Check if data is an object and has the required properties
  if (data && typeof data === 'object' && 'success' in data && 'message' in data) {
    const typedData = data as { success: boolean; message: string; user_id?: string };
    return {
      success: !!typedData.success, // Convert to boolean
      message: String(typedData.message), // Convert to string
      user_id: typedData.user_id ? String(typedData.user_id) : undefined
    };
  }
  
  return defaultResult;
}

interface AdminManagementProps {
  currentAdminId: string;
}

const AdminManagement = ({ currentAdminId }: AdminManagementProps) => {
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdminResult | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const { toast } = useToast();

  // Fetch all admin users when the component mounts
  useEffect(() => {
    fetchAdminUsers();
  }, []);

  // Function to fetch all admin users
  const fetchAdminUsers = async () => {
    try {
      setLoadingAdmins(true);
      
      // Fetch users where is_admin is true
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, joined_at')
        .eq('is_admin', true)
        .order('joined_at', { ascending: false });
        
      if (error) throw error;
      
      setAdminUsers(data || []);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      toast({
        title: "Error",
        description: "Failed to load admin users",
        variant: "destructive"
      });
    } finally {
      setLoadingAdmins(false);
    }
  };

  const grantAdminPrivileges = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.rpc('grant_admin_privileges', {
        admin_email: userEmail.trim()
      });
      
      if (error) throw error;
      
      // Safely convert the data to AdminResult type
      const adminResult = toAdminResult(data);
      setResult(adminResult);
      
      if (adminResult.success) {
        toast({
          title: "Success",
          description: adminResult.message,
        });
        setUserEmail('');
        // Refresh the admin users list
        fetchAdminUsers();
      } else {
        toast({
          title: "Error",
          description: adminResult.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error granting admin privileges:', error);
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      toast({
        title: "Error",
        description: "Failed to grant admin privileges",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const revokeAdminPrivileges = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    // Prevent revoking your own admin privileges
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email?.toLowerCase() === userEmail.trim().toLowerCase()) {
      toast({
        title: "Error",
        description: "You cannot revoke your own admin privileges",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.rpc('revoke_admin_privileges', {
        admin_email: userEmail.trim()
      });
      
      if (error) throw error;
      
      // Safely convert the data to AdminResult type
      const adminResult = toAdminResult(data);
      setResult(adminResult);
      
      if (adminResult.success) {
        toast({
          title: "Success",
          description: adminResult.message,
        });
        setUserEmail('');
        // Refresh the admin users list
        fetchAdminUsers();
      } else {
        toast({
          title: "Error",
          description: adminResult.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error revoking admin privileges:', error);
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      toast({
        title: "Error",
        description: "Failed to revoke admin privileges",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to revoke admin privileges by ID (for the list view)
  const revokeAdminById = async (adminId: string, adminEmail: string) => {
    // Prevent revoking your own admin privileges
    if (adminId === currentAdminId) {
      toast({
        title: "Error",
        description: "You cannot revoke your own admin privileges",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('revoke_admin_privileges', {
        admin_email: adminEmail
      });
      
      if (error) throw error;
      
      const adminResult = toAdminResult(data);
      
      if (adminResult.success) {
        toast({
          title: "Success",
          description: `Admin privileges revoked from ${adminEmail}`,
        });
        // Refresh the admin users list
        fetchAdminUsers();
      } else {
        toast({
          title: "Error",
          description: adminResult.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error revoking admin privileges:', error);
      toast({
        title: "Error",
        description: "Failed to revoke admin privileges",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Admin Management</h2>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>View Admin Users</span>
              <div className="bg-gray-200 text-gray-800 rounded-full w-5 h-5 flex items-center justify-center text-xs ml-1">
                {adminUsers.length}
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Admin Users</SheetTitle>
              <SheetDescription>
                View and manage users with admin privileges
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-4">
              {loadingAdmins ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : adminUsers.length > 0 ? (
                adminUsers.map(admin => (
                  <div key={admin.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="font-medium">{admin.name || 'Unnamed'}</p>
                      <p className="text-sm text-gray-600">{admin.email}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeAdminById(admin.id, admin.email)}
                      disabled={admin.id === currentAdminId}
                      className={admin.id === currentAdminId ? "opacity-50 cursor-not-allowed" : "text-red-500 hover:text-red-700"}
                    >
                      {admin.id === currentAdminId ? "Current User" : "Revoke"}
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No admin users found</p>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
      
      <form className="space-y-4">
        <div>
          <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-1">
            User Email
          </label>
          <Input
            id="admin-email"
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="w-full"
          />
        </div>
        
        <div className="flex gap-4">
          <Button 
            onClick={grantAdminPrivileges}
            disabled={loading}
            className="bg-[#00C853] hover:bg-[#00B248] text-white flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Grant Admin Access
              </>
            )}
          </Button>
          
          <Button 
            onClick={revokeAdminPrivileges}
            disabled={loading}
            variant="outline"
            className="border-red-500 text-red-500 hover:bg-red-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <UserMinus className="h-4 w-4" />
                Revoke Admin Access
              </>
            )}
          </Button>
        </div>
      </form>
      
      {result && (
        <Alert className={`mt-4 ${result.success ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          <AlertDescription>
            {result.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AdminManagement;
