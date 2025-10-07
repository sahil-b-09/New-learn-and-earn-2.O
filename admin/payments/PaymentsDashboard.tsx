import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, ArrowUpRight, ArrowDownLeft, HelpCircle, Loader2, Download, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/table';
import { Badge } from '@/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/ui/dialog';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { useToast } from '@/ui/use-toast';
import PayoutRequestsManagement from './PayoutRequestsManagement';

interface Purchase {
  id: string;
  user_id: string;
  course_id: string;
  purchased_at: string;
  has_used_referral_code: boolean;
  used_referral_code: string | null;
  amount: number;
  course?: {
    title: string;
    price: number;
  };
  user?: {
    email: string | null;
    name: string | null;
  };
}

interface Payout {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at: string | null;
  payout_method_id: string | null;
  razorpay_payout_id: string | null;
  failure_reason: string | null;
  user?: {
    email: string | null;
    name: string | null;
  };
}

const PaymentsDashboard: React.FC = () => {
  const { toast } = useToast();
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean, data: any | null }>({ 
    open: false, 
    data: null 
  });
  
  // Filter states
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState('');
  const [purchaseFilter, setPurchaseFilter] = useState('all');
  const [payoutSearchTerm, setPayoutSearchTerm] = useState('');
  const [payoutFilter, setPayoutFilter] = useState('all');
  
  // Check admin authorization first
  const { data: isAdmin, isLoading: isLoadingAuth } = useQuery({
    queryKey: ['admin-check'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_admin_user');
      if (error || !data) {
        throw new Error('Not authorized');
      }
      return data;
    },
  });

  // Fetch purchases data
  const { data: purchases = [], isLoading: loadingPurchases, isFetching: fetchingPurchases, refetch: refetchPurchases } = useQuery({
    queryKey: ['admin-purchases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          course:courses(title, price),
          user:users(email, name)
        `)
        .order('purchased_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching purchases:", error);
        throw error;
      }
      
      // Handle possible relation errors by providing default values
      return (data || []).map(item => ({
        ...item,
        course: item.course || { title: 'Unknown Course', price: 0 },
        user: item.user || { email: 'Unknown User', name: 'Unknown' },
        has_used_referral_code: item.has_used_referral_code || false,
        used_referral_code: item.used_referral_code || null
      })) as Purchase[];
    },
    enabled: !!isAdmin,
  });
  
  // Fetch payouts data
  const { data: payouts = [], isLoading: loadingPayouts, isFetching: fetchingPayouts, refetch: refetchPayouts } = useQuery({
    queryKey: ['admin-payouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payouts')
        .select(`
          *,
          user:users(email, name)
        `)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching payouts:", error);
        throw error;
      }
      
      // Handle possible relation errors by providing default values
      return (data || []).map(item => ({
        ...item,
        user: item.user || { email: 'Unknown User', name: 'Unknown' },
        processed_at: item.processed_at || null,
        payout_method_id: item.payout_method_id || null,
        razorpay_payout_id: item.razorpay_payout_id || null,
        failure_reason: item.failure_reason || null
      })) as Payout[];
    },
    enabled: !!isAdmin,
  });
  
  // Calculate summary metrics
  const totalPurchaseAmount = purchases.reduce((sum, p) => sum + (p.course?.price || 0), 0);
  const totalPaidOut = payouts
    .filter(p => p.status === 'success')
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingPayouts = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Successful</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Filter functions
  const filterPurchases = (purchases: Purchase[]) => {
    let filtered = purchases;

    // Search filter
    if (purchaseSearchTerm) {
      filtered = filtered.filter(purchase => 
        purchase.user?.email?.toLowerCase().includes(purchaseSearchTerm.toLowerCase()) ||
        purchase.user?.name?.toLowerCase().includes(purchaseSearchTerm.toLowerCase()) ||
        purchase.course?.title?.toLowerCase().includes(purchaseSearchTerm.toLowerCase())
      );
    }

    // Referral filter
    if (purchaseFilter !== 'all') {
      if (purchaseFilter === 'referral') {
        filtered = filtered.filter(purchase => purchase.has_used_referral_code);
      } else if (purchaseFilter === 'no-referral') {
        filtered = filtered.filter(purchase => !purchase.has_used_referral_code);
      }
    }

    return filtered;
  };

  const filterPayouts = (payouts: Payout[]) => {
    let filtered = payouts;

    // Search filter
    if (payoutSearchTerm) {
      filtered = filtered.filter(payout => 
        payout.user?.email?.toLowerCase().includes(payoutSearchTerm.toLowerCase()) ||
        payout.user?.name?.toLowerCase().includes(payoutSearchTerm.toLowerCase())
      );
    }

    // Status filter
    if (payoutFilter !== 'all') {
      filtered = filtered.filter(payout => payout.status === payoutFilter);
    }

    return filtered;
  };

  // Apply filters
  const filteredPurchases = filterPurchases(purchases);
  const filteredPayouts = filterPayouts(payouts);

  // Helper function to escape CSV values
  const escapeCsvValue = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '""';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  // Export functions
  const exportPurchasesData = () => {
    try {
      const headers = ['Date', 'User', 'Course', 'Amount', 'Referral Code', 'Has Referral'];
      const rows = filteredPurchases.map(purchase => [
        escapeCsvValue(new Date(purchase.purchased_at).toISOString().split('T')[0]),
        escapeCsvValue(purchase.user?.email || 'Unknown'),
        escapeCsvValue(purchase.course?.title || 'Unknown Course'),
        escapeCsvValue(purchase.amount || purchase.course?.price || 0),
        escapeCsvValue(purchase.used_referral_code || 'None'),
        escapeCsvValue(purchase.has_used_referral_code ? 'Yes' : 'No')
      ]);
      
      const csvContent = '\uFEFF' + [headers.map(h => escapeCsvValue(h)), ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `purchases-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Purchases data exported successfully');
    } catch (error) {
      toast.error('Failed to export purchases data');
    }
  };

  const exportPayoutsData = () => {
    try {
      const headers = ['Date', 'User', 'Amount', 'Status', 'Processed Date'];
      const rows = filteredPayouts.map(payout => [
        escapeCsvValue(new Date(payout.created_at).toISOString().split('T')[0]),
        escapeCsvValue(payout.user?.email || 'Unknown'),
        escapeCsvValue(payout.amount),
        escapeCsvValue(payout.status),
        escapeCsvValue(payout.processed_at ? new Date(payout.processed_at).toISOString().split('T')[0] : 'Not processed')
      ]);
      
      const csvContent = '\uFEFF' + [headers.map(h => escapeCsvValue(h)), ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payouts-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Payouts data exported successfully');
    } catch (error) {
      toast.error('Failed to export payouts data');
    }
  };

  const refreshAllData = async () => {
    try {
      const [purchasesResult, payoutsResult] = await Promise.all([
        refetchPurchases(),
        refetchPayouts()
      ]);
      
      const hasErrors = purchasesResult.error || payoutsResult.error;
      
      if (hasErrors) {
        console.error('Error refreshing some payment data:', { 
          purchases: purchasesResult.error, 
          payouts: payoutsResult.error 
        });
        toast.error('Some data failed to refresh. Please try again.');
      } else {
        toast.success('Payment data refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing payment data:', error);
      toast.error('Failed to refresh payment data');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Payments Dashboard</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllData}
            disabled={fetchingPurchases || fetchingPayouts}
            data-testid="button-refresh-payments"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${(fetchingPurchases || fetchingPayouts) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <h3 className="text-2xl font-bold">{formatCurrency(totalPurchaseAmount)}</h3>
                </div>
                <div className="p-2 rounded-full bg-green-50">
                  <ArrowUpRight className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Total Payouts</p>
                  <h3 className="text-2xl font-bold">{formatCurrency(totalPaidOut)}</h3>
                </div>
                <div className="p-2 rounded-full bg-blue-50">
                  <ArrowDownLeft className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Pending Payouts</p>
                  <h3 className="text-2xl font-bold">{formatCurrency(pendingPayouts)}</h3>
                </div>
                <div className="p-2 rounded-full bg-yellow-50">
                  <HelpCircle className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="purchases" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="purchases">Purchases</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="payout-requests">Payout Requests</TabsTrigger>
          </TabsList>
          
          <TabsContent value="purchases" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Purchase History</h2>
              <div className="flex space-x-2">
                <Input 
                  placeholder="Search purchases..." 
                  className="w-[200px]" 
                  value={purchaseSearchTerm}
                  onChange={(e) => setPurchaseSearchTerm(e.target.value)}
                  data-testid="input-search-purchases"
                />
                <Select value={purchaseFilter} onValueChange={setPurchaseFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-purchase-filter">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Purchases</SelectItem>
                    <SelectItem value="referral">With Referral</SelectItem>
                    <SelectItem value="no-referral">No Referral</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportPurchasesData}
                  data-testid="button-export-purchases"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
            
            {loadingPurchases ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredPurchases.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">No purchases found</h3>
                <p className="text-gray-500">When users make purchases, they will appear here</p>
              </div>
            ) : (
              <div className="border rounded-md overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Referral</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(purchase.purchased_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{purchase.user?.email || 'Unknown User'}</TableCell>
                        <TableCell>{purchase.course?.title || 'Unknown Course'}</TableCell>
                        <TableCell>{formatCurrency(purchase.course?.price || 0)}</TableCell>
                        <TableCell>
                          {purchase.has_used_referral_code ? (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                              {purchase.used_referral_code || 'Referral Used'}
                            </Badge>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setDetailsDialog({ open: true, data: purchase })}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="payouts" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Payout History</h2>
              <div className="flex space-x-2">
                <Input 
                  placeholder="Search payouts..." 
                  className="w-[200px]" 
                  value={payoutSearchTerm}
                  onChange={(e) => setPayoutSearchTerm(e.target.value)}
                  data-testid="input-search-payouts"
                />
                <Select value={payoutFilter} onValueChange={setPayoutFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-payout-filter">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="success">Successful</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportPayoutsData}
                  data-testid="button-export-payouts"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
            
            {loadingPayouts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredPayouts.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">No payouts found</h3>
                <p className="text-gray-500">Requested payouts will appear here</p>
              </div>
            ) : (
              <div className="border rounded-md overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processed On</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(payout.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{payout.user?.email || 'Unknown User'}</TableCell>
                        <TableCell>{formatCurrency(payout.amount)}</TableCell>
                        <TableCell>{getStatusBadge(payout.status)}</TableCell>
                        <TableCell>
                          {payout.processed_at ? 
                            new Date(payout.processed_at).toLocaleDateString() : 
                            '-'}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setDetailsDialog({ open: true, data: payout })}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="payout-requests" className="space-y-4">
            <PayoutRequestsManagement />
          </TabsContent>
        </Tabs>
        
        {/* Details Dialog */}
        <Dialog open={detailsDialog.open} onOpenChange={() => setDetailsDialog({ open: false, data: null })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {detailsDialog.data && 'course_id' in detailsDialog.data 
                  ? 'Purchase Details' 
                  : 'Payout Details'}
              </DialogTitle>
            </DialogHeader>
            
            {detailsDialog.data && (
              <div className="space-y-4 text-sm">
                {'course_id' in detailsDialog.data ? (
                  /* Purchase Details */
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">ID:</div>
                      <div>{detailsDialog.data.id}</div>
                      
                      <div className="font-medium">Date:</div>
                      <div>{new Date(detailsDialog.data.purchased_at).toLocaleString()}</div>
                      
                      <div className="font-medium">User:</div>
                      <div>
                        {detailsDialog.data.user?.name || 'Unknown'} <br />
                        <span className="text-gray-500 text-xs">{detailsDialog.data.user?.email || 'No email'}</span>
                      </div>
                      
                      <div className="font-medium">Course:</div>
                      <div>{detailsDialog.data.course?.title || 'Unknown Course'}</div>
                      
                      <div className="font-medium">Amount:</div>
                      <div>{formatCurrency(detailsDialog.data.course?.price || 0)}</div>
                      
                      <div className="font-medium">Referral Used:</div>
                      <div>
                        {detailsDialog.data.has_used_referral_code 
                          ? detailsDialog.data.used_referral_code || 'Yes'
                          : 'No'}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Payout Details */
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">ID:</div>
                      <div>{detailsDialog.data.id}</div>
                      
                      <div className="font-medium">Date Requested:</div>
                      <div>{new Date(detailsDialog.data.created_at).toLocaleString()}</div>
                      
                      <div className="font-medium">User:</div>
                      <div>
                        {detailsDialog.data.user?.name || 'Unknown'} <br />
                        <span className="text-gray-500 text-xs">{detailsDialog.data.user?.email || 'No email'}</span>
                      </div>
                      
                      <div className="font-medium">Amount:</div>
                      <div>{formatCurrency(detailsDialog.data.amount)}</div>
                      
                      <div className="font-medium">Status:</div>
                      <div>{getStatusBadge(detailsDialog.data.status)}</div>
                      
                      {detailsDialog.data.processed_at && (
                        <>
                          <div className="font-medium">Processed On:</div>
                          <div>{new Date(detailsDialog.data.processed_at).toLocaleString()}</div>
                        </>
                      )}
                      
                      {detailsDialog.data.razorpay_payout_id && (
                        <>
                          <div className="font-medium">Payment ID:</div>
                          <div className="break-all">{detailsDialog.data.razorpay_payout_id}</div>
                        </>
                      )}
                      
                      {detailsDialog.data.failure_reason && (
                        <>
                          <div className="font-medium">Failure Reason:</div>
                          <div className="text-red-600">{detailsDialog.data.failure_reason}</div>
                        </>
                      )}
                    </div>
                    
                    {detailsDialog.data.status === 'pending' && (
                      <div className="pt-2">
                        <DialogDescription className="text-xs text-gray-500 mb-2">
                          Pending payouts can be confirmed through the Telegram bot using the payout ID.
                        </DialogDescription>
                        <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                          /confirm_payout {detailsDialog.data.id}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        
      </CardContent>
    </Card>
  );
};

export default PaymentsDashboard;
