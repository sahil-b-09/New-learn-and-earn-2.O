import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Eye, 
  EyeOff, 
  Plus, 
  Edit,
  Star,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AccessGuard } from '@/components/ui/access-guard';
import { requireAdmin } from '@/lib/rbac';

const MarketingDisplaySchema = z.object({
  display_earnings: z.string().min(1, "Earnings amount is required"),
  display_referrals: z.string().min(1, "Referrals count is required"),
  display_title: z.string().optional(),
  is_featured: z.boolean().default(false),
  show_on_landing: z.boolean().default(false),
});

type MarketingDisplayForm = z.infer<typeof MarketingDisplaySchema>;

interface MarketingDisplayData {
  id: string;
  user_id: string;
  display_earnings: number;
  display_referrals: number;
  display_title?: string;
  is_featured: boolean;
  show_on_landing: boolean;
  updated_by_admin: string;
  users?: { name: string; email: string };
}

interface User {
  id: string;
  name: string;
  email: string;
}

const MarketingDisplayDashboardContent: React.FC = () => {
  const { toast: toastHook } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [editingRecord, setEditingRecord] = useState<MarketingDisplayData | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<MarketingDisplayForm>({
    resolver: zodResolver(MarketingDisplaySchema),
    defaultValues: {
      display_earnings: '0',
      display_referrals: '0',
      display_title: '',
      is_featured: false,
      show_on_landing: false,
    },
  });

  // Fetch marketing display data (placeholder implementation)
  const { data: marketingData = [], isLoading } = useQuery({
    queryKey: ['marketing-display-data'],
    queryFn: async () => {
      // Placeholder: Return empty array for now until marketing_display_data table is properly configured
      return [];
    },
  });

  // Fetch users for selection
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email')
          .order('name');

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching users:', error);
        return [];
      }
    },
  });

  // Create/Update marketing display data (placeholder implementation)
  const createMutation = useMutation({
    mutationFn: async (values: MarketingDisplayForm & { user_id: string }) => {
      const user = await requireAdmin();
      // Placeholder: Marketing display functionality will be implemented when table is configured
      console.log('Marketing display data would be saved:', values);
      toast.success('Marketing display settings saved!');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-display-data'] });
      setShowCreateDialog(false);
      setEditingRecord(null);
      form.reset();
      toast.success(editingRecord ? 'Marketing display data updated!' : 'Marketing display data created!');
    },
    onError: (error) => {
      console.error('Error saving marketing display data:', error);
      toast.error('Failed to save marketing display data');
    },
  });

  // Delete marketing display data
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await requireAdmin(); // Ensure admin access
      const { error } = await supabase
        .from('marketing_display_data' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-display-data'] });
      toast.success('Marketing display data deleted!');
    },
    onError: (error) => {
      console.error('Error deleting marketing display data:', error);
      toast.error('Failed to delete marketing display data');
    },
  });

  const handleEdit = (record: MarketingDisplayData) => {
    setEditingRecord(record);
    form.reset({
      display_earnings: record.display_earnings.toString(),
      display_referrals: record.display_referrals.toString(),
      display_title: record.display_title || '',
      is_featured: record.is_featured,
      show_on_landing: record.show_on_landing,
    });
    setSelectedUserId(record.user_id);
    setShowCreateDialog(true);
  };

  const handleSubmit = (values: MarketingDisplayForm) => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    createMutation.mutate({
      ...values,
      user_id: selectedUserId,
    });
  };

  const handleClose = () => {
    setShowCreateDialog(false);
    setEditingRecord(null);
    form.reset();
    setSelectedUserId('');
  };

  const stats = {
    totalRecords: marketingData.length,
    featuredRecords: marketingData.filter(d => d.is_featured).length,
    landingPageRecords: marketingData.filter(d => d.show_on_landing).length,
    totalDisplayEarnings: marketingData.reduce((sum, d) => sum + d.display_earnings, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Marketing Display Data</h2>
          <p className="text-muted-foreground">
            Manage display statistics for marketing purposes (separate from real wallet data)
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-display-data">
          <Plus className="h-4 w-4 mr-2" />
          Add Display Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-records">{stats.totalRecords}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-featured-records">{stats.featuredRecords}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Landing Page</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-landing-records">{stats.landingPageRecords}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Display Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-display-earnings">₹{stats.totalDisplayEarnings.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Marketing Display Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing Display Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading marketing display data...</div>
          ) : marketingData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No marketing display data found. Create some records to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {marketingData.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`card-display-record-${record.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold" data-testid={`text-user-name-${record.id}`}>
                        {record.users?.name || 'Unknown User'}
                      </h3>
                      {record.is_featured && <Badge variant="secondary">Featured</Badge>}
                      {record.show_on_landing && <Badge variant="outline">Landing</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{record.users?.email}</p>
                    {record.display_title && (
                      <p className="text-sm font-medium text-blue-600">{record.display_title}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Display Earnings</p>
                      <p className="font-semibold" data-testid={`text-earnings-${record.id}`}>₹{record.display_earnings.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Display Referrals</p>
                      <p className="font-semibold" data-testid={`text-referrals-${record.id}`}>{record.display_referrals}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(record)}
                        data-testid={`button-edit-${record.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteMutation.mutate(record.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${record.id}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Edit Marketing Display Data' : 'Create Marketing Display Data'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {!editingRecord && (
                <div className="space-y-2">
                  <Label htmlFor="user-select">Select User</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger data-testid="select-user">
                      <SelectValue placeholder="Choose a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id} data-testid={`option-user-${user.id}`}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <FormField
                control={form.control}
                name="display_earnings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Earnings (₹)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0" data-testid="input-display-earnings" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display_referrals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Referrals</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder="0" data-testid="input-display-referrals" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Title (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Top Performer, Rising Star" data-testid="input-display-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <FormField
                  control={form.control}
                  name="is_featured"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-featured"
                        />
                      </FormControl>
                      <FormLabel className="text-sm">Featured</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="show_on_landing"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-show-on-landing"
                        />
                      </FormControl>
                      <FormLabel className="text-sm">Show on Landing</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  data-testid="button-save-display-data"
                >
                  {createMutation.isPending ? 'Saving...' : editingRecord ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const MarketingDisplayDashboard: React.FC = () => {
  return (
    <AccessGuard requiredRole="admin">
      <MarketingDisplayDashboardContent />
    </AccessGuard>
  );
};

export default MarketingDisplayDashboard;