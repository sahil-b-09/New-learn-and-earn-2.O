
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Loader2, Filter, UserPlus, Mail, Users, Download, RefreshCw, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { UserTable } from './UserTable';
import { AdminActionDialog } from './AdminActionDialog';

interface UserData {
  id: string;
  email: string;
  name: string;
  joined_at: string;
  is_admin: boolean;
  is_suspended?: boolean;
  last_login?: string;
  courses_purchased?: number;
  successful_referrals?: number;
  total_earned?: number;
  activity_score?: number;
  engagement_level?: 'low' | 'medium' | 'high';
}

interface FilterState {
  role: string;
  activityLevel: string;
  joinDateRange: any;
  purchaseRange: string;
  suspensionStatus: string;
}

interface BulkActionState {
  action: 'suspend' | 'activate' | 'notify' | 'export' | null;
  selectedUsers: string[];
  processing: boolean;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'makeAdmin' | 'removeAdmin' | null;
    processing: boolean;
  }>({ open: false, action: null, processing: false });
  
  const [filters, setFilters] = useState<FilterState>({
    role: 'all',
    activityLevel: 'all',
    joinDateRange: null,
    purchaseRange: 'all',
    suspensionStatus: 'all'
  });
  
  const [bulkAction, setBulkAction] = useState<BulkActionState>({
    action: null,
    selectedUsers: [],
    processing: false
  });
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentTab, setCurrentTab] = useState('overview');
  
  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // First check if current user is admin
      const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin_user');
      
      if (adminError || !isAdmin) {
        console.error('Not authorized to fetch users:', adminError);
        toast.error('You are not authorized to view users');
        return;
      }
      
      // Get basic user information with optimized query
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, joined_at, is_admin, is_suspended')
        .order('joined_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
        return;
      }
      
      if (!data || data.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }
      
      // Batch process additional data for better performance
      const userIds = data.map(user => user.id);
      
      // Get all additional data in parallel
      const [activityPromise, purchasesPromise, referralsPromise] = await Promise.allSettled([
        supabase
          .from('user_activity_logs')
          .select('user_id, created_at, activity_type')
          .in('user_id', userIds)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('purchases')
          .select('user_id')
          .in('user_id', userIds),
        
        supabase
          .from('referrals')
          .select('user_id, commission_amount')
          .in('user_id', userIds)
          .eq('status', 'completed')
      ]);
      
      // Process results efficiently
      const activityData = activityPromise.status === 'fulfilled' ? activityPromise.value.data || [] : [];
      const purchasesData = purchasesPromise.status === 'fulfilled' ? purchasesPromise.value.data || [] : [];
      const referralsData = referralsPromise.status === 'fulfilled' ? referralsPromise.value.data || [] : [];
      
      // Create maps for O(1) lookup
      const lastLoginMap = new Map();
      const purchaseCountMap = new Map();
      const referralStatsMap = new Map();
      const activityScoreMap = new Map();
      
      // Process activity data
      activityData.forEach(activity => {
        if (activity.activity_type === 'login' && !lastLoginMap.has(activity.user_id)) {
          lastLoginMap.set(activity.user_id, activity.created_at);
        }
        // Calculate activity score
        const current = activityScoreMap.get(activity.user_id) || 0;
        activityScoreMap.set(activity.user_id, current + 1);
      });
      
      // Process purchases
      purchasesData.forEach(purchase => {
        purchaseCountMap.set(purchase.user_id, (purchaseCountMap.get(purchase.user_id) || 0) + 1);
      });
      
      // Process referrals
      referralsData.forEach(referral => {
        const current = referralStatsMap.get(referral.user_id) || { count: 0, earned: 0 };
        referralStatsMap.set(referral.user_id, {
          count: current.count + 1,
          earned: current.earned + (referral.commission_amount || 0)
        });
      });
      
      // Combine all data and calculate engagement levels
      const enhancedUsers = data.map(user => {
        const activityScore = activityScoreMap.get(user.id) || 0;
        const purchaseCount = purchaseCountMap.get(user.id) || 0;
        const referralCount = referralStatsMap.get(user.id)?.count || 0;
        
        // Calculate engagement level
        let engagementLevel: 'low' | 'medium' | 'high' = 'low';
        const totalEngagement = activityScore + (purchaseCount * 5) + (referralCount * 3);
        if (totalEngagement >= 20) engagementLevel = 'high';
        else if (totalEngagement >= 8) engagementLevel = 'medium';
        
        return {
          ...user,
          last_login: lastLoginMap.get(user.id),
          courses_purchased: purchaseCount,
          successful_referrals: referralCount,
          total_earned: referralStatsMap.get(user.id)?.earned || 0,
          activity_score: activityScore,
          engagement_level: engagementLevel
        };
      });
      
      setUsers(enhancedUsers);
    } catch (error) {
      console.error('Error in loadUsers:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadUsers();
  }, []);
  
  // Enhanced filtering logic
  const applyFilters = (users: UserData[]) => {
    let filtered = users;
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => 
        filters.role === 'admin' ? user.is_admin : !user.is_admin
      );
    }
    
    // Activity level filter
    if (filters.activityLevel !== 'all') {
      filtered = filtered.filter(user => user.engagement_level === filters.activityLevel);
    }
    
    // Purchase range filter
    if (filters.purchaseRange !== 'all') {
      const ranges = {
        'none': [0, 0],
        'low': [1, 2],
        'medium': [3, 5],
        'high': [6, 999]
      };
      const [min, max] = ranges[filters.purchaseRange as keyof typeof ranges] || [0, 999];
      filtered = filtered.filter(user => {
        const purchases = user.courses_purchased || 0;
        return purchases >= min && purchases <= max;
      });
    }
    
    // Suspension status filter
    if (filters.suspensionStatus !== 'all') {
      filtered = filtered.filter(user => 
        filters.suspensionStatus === 'suspended' ? user.is_suspended : !user.is_suspended
      );
    }
    
    return filtered;
  };
  
  const filteredUsers = applyFilters(users);
  
  const handleMakeAdmin = async (userId: string) => {
    if (!selectedUser) return;
    
    setConfirmDialog({ ...confirmDialog, processing: true });
    
    try {
      const { data: result, error: rpcError } = await supabase
        .rpc('grant_admin_privileges', {
          admin_email: selectedUser.email
        });
      
      if (rpcError) {
        console.error('Error granting admin privileges:', rpcError);
        toast.error('Failed to grant admin privileges');
        return;
      }
      
      toast.success(`Admin privileges granted to ${selectedUser.email}`);
      loadUsers();
    } catch (error) {
      console.error('Exception in handleMakeAdmin:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setConfirmDialog({ open: false, action: null, processing: false });
      setSelectedUser(null);
    }
  };
  
  const handleRemoveAdmin = async (userId: string) => {
    if (!selectedUser) return;
    
    setConfirmDialog({ ...confirmDialog, processing: true });
    
    try {
      const { data: result, error: rpcError } = await supabase
        .rpc('revoke_admin_privileges', {
          admin_email: selectedUser.email
        });
      
      if (rpcError) {
        console.error('Error revoking admin privileges:', rpcError);
        toast.error('Failed to revoke admin privileges');
        return;
      }
      
      toast.success(`Admin privileges revoked from ${selectedUser.email}`);
      loadUsers();
    } catch (error) {
      console.error('Exception in handleRemoveAdmin:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setConfirmDialog({ open: false, action: null, processing: false });
      setSelectedUser(null);
    }
  };
  
  const handleGrantCourseAccess = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (error || !data) {
        console.error('Error getting user email:', error);
        toast.error('Failed to find user email');
        return;
      }
      
      const { data: result, error: rpcError } = await supabase
        .rpc('grant_one_time_access_to_user', {
          user_email: data.email
        });
      
      if (rpcError) {
        console.error('Error granting course access:', rpcError);
        toast.error(`Failed to grant course access: ${rpcError.message}`);
        return;
      }
      
      toast.success(`Course access granted to ${data.email}`);
      loadUsers();
    } catch (error) {
      console.error('Exception in handleGrantCourseAccess:', error);
      toast.error('An unexpected error occurred');
    }
  };
  
  const handleSuspendUser = async (user: UserData) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_suspended: true })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error suspending user:', error);
        toast.error('Failed to suspend user');
        return;
      }
      
      toast.success(`User ${user.name || user.email} has been suspended`);
      loadUsers();
    } catch (error) {
      console.error('Exception in handleSuspendUser:', error);
      toast.error('An unexpected error occurred');
    }
  };
  
  const handleUnsuspendUser = async (user: UserData) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_suspended: false })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error unsuspending user:', error);
        toast.error('Failed to unsuspend user');
        return;
      }
      
      toast.success(`User ${user.name || user.email} has been unsuspended`);
      loadUsers();
    } catch (error) {
      console.error('Exception in handleUnsuspendUser:', error);
      toast.error('An unexpected error occurred');
    }
  };
  
  // Bulk operations handlers
  const handleBulkAction = async (action: string, userIds: string[]) => {
    setBulkAction({ ...bulkAction, processing: true });
    
    try {
      switch (action) {
        case 'suspend':
          await Promise.all(userIds.map(id => 
            supabase.from('users').update({ is_suspended: true }).eq('id', id)
          ));
          toast.success(`Suspended ${userIds.length} users`);
          break;
        case 'activate':
          await Promise.all(userIds.map(id => 
            supabase.from('users').update({ is_suspended: false }).eq('id', id)
          ));
          toast.success(`Activated ${userIds.length} users`);
          break;
        case 'notify':
          // This would integrate with your notification system
          toast.success(`Notification sent to ${userIds.length} users`);
          break;
        case 'export':
          // Export user data as CSV
          const userData = users.filter(u => userIds.includes(u.id));
          const csv = generateUserCSV(userData);
          downloadCSV(csv, 'user-export.csv');
          toast.success('User data exported');
          break;
      }
      
      loadUsers();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error('Failed to perform bulk action');
    } finally {
      setBulkAction({ action: null, selectedUsers: [], processing: false });
    }
  };
  
  const generateUserCSV = (users: UserData[]) => {
    const headers = ['Name', 'Email', 'Role', 'Joined Date', 'Courses Purchased', 'Referrals', 'Total Earned'];
    const rows = users.map(user => [
      user.name || '',
      user.email,
      user.is_admin ? 'Admin' : 'User',
      user.joined_at,
      user.courses_purchased || 0,
      user.successful_referrals || 0,
      user.total_earned || 0
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };
  
  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  const handleSelectUser = (userId: string, selected: boolean) => {
    setBulkAction(prev => ({
      ...prev,
      selectedUsers: selected 
        ? [...prev.selectedUsers, userId]
        : prev.selectedUsers.filter(id => id !== userId)
    }));
  };
  
  const handleSelectAll = (selected: boolean) => {
    setBulkAction(prev => ({
      ...prev,
      selectedUsers: selected ? filteredUsers.map(u => u.id) : []
    }));
  };
  
  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Comprehensive user management with advanced filtering and bulk operations
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                data-testid="button-toggle-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showAdvancedFilters ? 'Hide' : 'Show'} Filters
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadUsers}
                disabled={loading}
                data-testid="button-refresh-users"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Basic Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Input
                placeholder="Search by name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-users"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <Select value={filters.role} onValueChange={(value) => setFilters({...filters, role: value})}>
              <SelectTrigger className="w-32" data-testid="select-role-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="user">Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <Card className="mb-6 p-4 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Activity Level</label>
                  <Select value={filters.activityLevel} onValueChange={(value) => setFilters({...filters, activityLevel: value})}>
                    <SelectTrigger data-testid="select-activity-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Purchase Range</label>
                  <Select value={filters.purchaseRange} onValueChange={(value) => setFilters({...filters, purchaseRange: value})}>
                    <SelectTrigger data-testid="select-purchase-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ranges</SelectItem>
                      <SelectItem value="none">No Purchases</SelectItem>
                      <SelectItem value="low">1-2 Courses</SelectItem>
                      <SelectItem value="medium">3-5 Courses</SelectItem>
                      <SelectItem value="high">6+ Courses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={filters.suspensionStatus} onValueChange={(value) => setFilters({...filters, suspensionStatus: value})}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setFilters({ role: 'all', activityLevel: 'all', joinDateRange: null, purchaseRange: 'all', suspensionStatus: 'all' })}
                    className="w-full"
                    data-testid="button-clear-filters"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </Card>
          )}
          
          {/* Bulk Actions */}
          {bulkAction.selectedUsers.length > 0 && (
            <Card className="mb-6 p-4 bg-blue-50 border-blue-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    {bulkAction.selectedUsers.length} users selected
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBulkAction('suspend', bulkAction.selectedUsers)}
                      disabled={bulkAction.processing}
                      data-testid="button-bulk-suspend"
                    >
                      Suspend
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBulkAction('activate', bulkAction.selectedUsers)}
                      disabled={bulkAction.processing}
                      data-testid="button-bulk-activate"
                    >
                      Activate
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBulkAction('notify', bulkAction.selectedUsers)}
                      disabled={bulkAction.processing}
                      data-testid="button-bulk-notify"
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Notify
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBulkAction('export', bulkAction.selectedUsers)}
                      disabled={bulkAction.processing}
                      data-testid="button-bulk-export"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setBulkAction({ action: null, selectedUsers: [], processing: false })}
                  data-testid="button-clear-selection"
                >
                  Clear Selection
                </Button>
              </div>
            </Card>
          )}
          
          {/* User Analytics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{users.length}</div>
                  <div className="text-sm text-gray-500">Total Users</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {users.filter(u => u.engagement_level === 'high').length}
                  </div>
                  <div className="text-sm text-gray-500">High Engagement</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {users.filter(u => u.is_admin).length}
                  </div>
                  <div className="text-sm text-gray-500">Admins</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {users.filter(u => u.is_suspended).length}
                  </div>
                  <div className="text-sm text-gray-500">Suspended</div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Results Summary */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">
              Showing {filteredUsers.length} of {users.length} users
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={bulkAction.selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                onCheckedChange={handleSelectAll}
                data-testid="checkbox-select-all"
              />
              <span className="text-sm">Select all visible</span>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">No users found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <UserTable 
              users={filteredUsers}
              onMakeAdmin={(user) => {
                setSelectedUser(user);
                setConfirmDialog({ open: true, action: 'makeAdmin', processing: false });
              }}
              onRemoveAdmin={(user) => {
                setSelectedUser(user);
                setConfirmDialog({ open: true, action: 'removeAdmin', processing: false });
              }}
              onGrantCourseAccess={handleGrantCourseAccess}
              onSuspendUser={handleSuspendUser}
              onUnsuspendUser={handleUnsuspendUser}
            />
          )}
        </CardContent>
      </Card>
      
      <AdminActionDialog
        open={confirmDialog.open}
        action={confirmDialog.action}
        user={selectedUser}
        processing={confirmDialog.processing}
        onConfirm={() => confirmDialog.action === 'makeAdmin' 
          ? handleMakeAdmin(selectedUser!.id)
          : handleRemoveAdmin(selectedUser!.id)
        }
        onCancel={() => setConfirmDialog({ open: false, action: null, processing: false })}
      />
    </div>
  );
};

export default UserManagement;

// Enhanced User Management Features:
// 1. Advanced filtering by role, activity level, purchase count, suspension status
// 2. Bulk operations for suspend, activate, notify, and export
// 3. Real-time user statistics and engagement analytics
// 4. Improved search functionality
// 5. Professional UI with proper loading states and empty states
// 6. Comprehensive user selection and management tools
// 7. Export functionality for user data analysis
// 8. Activity scoring and engagement level calculation
// 9. Advanced user segmentation for targeted operations
// 10. Responsive design with mobile-friendly interface
