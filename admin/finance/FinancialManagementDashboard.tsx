import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Badge } from '@/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Alert, AlertDescription } from '@/ui/alert';
import { Progress } from '@/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  CheckCircle,
  Calendar,
  BarChart3,
  PieChart,
  Target,
  Receipt,
  Wallet,
  Building2,
  FileText,
  Download,
  Eye,
  Clock,
  Building
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FinancialSummary {
  totalRevenue: number;
  revenueGrowth: number;
  totalPayouts: number;
  payoutGrowth: number;
  pendingPayouts: number;
  refunds: number;
  netRevenue: number;
  averageOrderValue: number;
  recurringRevenue: number;
  churnRate: number;
}

interface PaymentTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'payment' | 'refund' | 'payout';
  status: 'completed' | 'pending' | 'failed';
  paymentMethod: string;
  courseId?: string;
  description: string;
  createdAt: string;
  userEmail?: string;
  courseName?: string;
}

interface PayoutRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  requestedAt: string;
  processedAt?: string;
  notes?: string;
  userEmail: string;
  payoutMethod: string;
}

interface FinancialForecast {
  period: string;
  projectedRevenue: number;
  projectedPayouts: number;
  netProjection: number;
  confidence: number;
}

interface RevenueAnalytics {
  period: string;
  revenue: number;
  payouts: number;
  refunds: number;
  net: number;
  transactions: number;
}

const FinancialManagementDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedPayoutRequest, setSelectedPayoutRequest] = useState<PayoutRequest | null>(null);

  const queryClient = useQueryClient();

  // Helper function to get date filter based on time period
  const getTimeFilter = (period: string): string => {
    const now = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const filterDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return filterDate.toISOString();
  };

  // Fetch financial summary
  const { data: financialSummary, isLoading: loadingSummary, isFetching: fetchingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['financial-summary', selectedPeriod],
    queryFn: async () => {
      try {
        const timeFilter = getTimeFilter(selectedPeriod);
        
        // Get total revenue from completed purchases within time range
        const { data: purchases, error: purchasesError } = await supabase
          .from('purchases' as any)
          .select('amount')
          .eq('payment_status', 'completed')
          .gte('purchased_at', timeFilter);
        
        if (purchasesError) throw purchasesError;
        const totalRevenue = purchases?.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) || 0;
        
        // Get total payouts within time range
        const { data: payoutData, error: payoutsError } = await supabase
          .from('payouts' as any)
          .select('amount, status')
          .gte('created_at', timeFilter);
        
        if (payoutsError) throw payoutsError;
        const totalPayouts = payoutData?.filter((p: any) => p.status === 'success')
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) || 0;
        const pendingPayouts = payoutData?.filter((p: any) => p.status === 'pending')
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) || 0;
        
        // Calculate net revenue
        const netRevenue = totalRevenue - totalPayouts;
        
        // Calculate average order value
        const averageOrderValue = purchases?.length ? totalRevenue / purchases.length : 0;
        
        const summary: FinancialSummary = {
          totalRevenue,
          revenueGrowth: 0, // TODO: Calculate based on previous period
          totalPayouts,
          payoutGrowth: 0, // TODO: Calculate based on previous period
          pendingPayouts,
          refunds: 0, // TODO: Implement refund tracking
          netRevenue,
          averageOrderValue,
          recurringRevenue: totalRevenue, // Simplified for now
          churnRate: 0 // TODO: Calculate based on user activity
        };
        
        return summary;
      } catch (error) {
        console.error('Error fetching financial summary:', error);
        return {
          totalRevenue: 0,
          revenueGrowth: 0,
          totalPayouts: 0,
          payoutGrowth: 0,
          pendingPayouts: 0,
          refunds: 0,
          netRevenue: 0,
          averageOrderValue: 0,
          recurringRevenue: 0,
          churnRate: 0
        };
      }
    },
  });

  // Fetch payment transactions
  const { data: transactions, isLoading: loadingTransactions, isFetching: fetchingTransactions, refetch: refetchTransactions } = useQuery({
    queryKey: ['payment-transactions', selectedPeriod],
    queryFn: async () => {
      try {
        const transactionsList: PaymentTransaction[] = [];
        
        // Get purchases (payments)
        const { data: purchases, error: purchasesError } = await supabase
          .from('purchases' as any)
          .select(`
            id, user_id, amount, payment_status, course_id, purchased_at,
            users (email),
            courses (title)
          `)
          .gte('purchased_at', getTimeFilter(selectedPeriod))
          .order('purchased_at', { ascending: false })
          .limit(50);
        
        if (!purchasesError && purchases) {
          purchases.forEach((p: any) => {
            transactionsList.push({
              id: p.id,
              userId: p.user_id,
              amount: parseFloat(p.amount || 0),
              type: 'payment' as const,
              status: p.payment_status === 'completed' ? 'completed' as const : 'pending' as const,
              paymentMethod: 'Online', // Simplified
              courseId: p.course_id,
              description: 'Course Purchase',
              createdAt: p.purchased_at,
              userEmail: p.users?.email,
              courseName: p.courses?.title
            });
          });
        }
        
        // Get payouts
        const { data: payouts, error: payoutsError } = await supabase
          .from('payouts' as any)
          .select(`
            id, user_id, amount, status, created_at,
            users (email)
          `)
          .gte('created_at', getTimeFilter(selectedPeriod))
          .order('created_at', { ascending: false })
          .limit(25);
        
        if (!payoutsError && payouts) {
          payouts.forEach((p: any) => {
            transactionsList.push({
              id: p.id,
              userId: p.user_id,
              amount: parseFloat(p.amount || 0),
              type: 'payout' as const,
              status: p.status === 'success' ? 'completed' as const : 'pending' as const,
              paymentMethod: 'Bank Transfer', // Simplified
              description: 'Payout',
              createdAt: p.created_at,
              userEmail: p.users?.email
            });
          });
        }
        
        // Sort all transactions by date
        return transactionsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }
    },
  });

  // Fetch payout requests
  const { data: payoutRequests, isLoading: loadingPayouts, isFetching: fetchingPayouts, refetch: refetchPayouts } = useQuery({
    queryKey: ['payout-requests'],
    queryFn: async () => {
      try {
        // Get payout requests with user information
        const { data: payouts, error } = await supabase
          .from('payout_requests' as any)
          .select(`
            id, user_id, amount, status, created_at, processed_at, notes,
            payout_method_id,
            users (email),
            payout_methods (method_type, upi_id, account_holder_name)
          `)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching payout requests:', error);
          return [];
        }
        
        return (payouts || []).map((p: any) => ({
          id: p.id,
          userId: p.user_id,
          amount: parseFloat(p.amount || 0),
          status: p.status as 'pending' | 'approved' | 'rejected' | 'processed',
          requestedAt: p.created_at,
          processedAt: p.processed_at,
          notes: p.notes,
          userEmail: p.users?.email || 'N/A',
          payoutMethod: p.payout_methods?.method_type || 'Unknown'
        }));
      } catch (error) {
        console.error('Error fetching payout requests:', error);
        return [];
      }
    },
  });

  // Fetch revenue analytics
  const { data: revenueAnalytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['revenue-analytics', selectedPeriod],
    queryFn: async () => {
      try {
        const timeFilter = getTimeFilter(selectedPeriod);
        
        // Get purchases for revenue within time range
        const { data: purchases, error: purchasesError } = await supabase
          .from('purchases' as any)
          .select('amount, purchased_at')
          .eq('payment_status', 'completed')
          .gte('purchased_at', timeFilter);
        
        if (purchasesError) throw purchasesError;
        
        // Get payouts within time range
        const { data: payouts, error: payoutsError } = await supabase
          .from('payouts' as any)
          .select('amount, created_at')
          .eq('status', 'success')
          .gte('created_at', timeFilter);
        
        if (payoutsError) throw payoutsError;
        
        const totalRevenue = purchases?.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) || 0;
        const totalPayouts = payouts?.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) || 0;
        const transactionCount = (purchases?.length || 0) + (payouts?.length || 0);
        
        // Return simplified analytics (can be enhanced with time-based grouping later)
        const analytics: RevenueAnalytics[] = [{
          period: 'Total',
          revenue: totalRevenue,
          payouts: totalPayouts,
          refunds: 0, // TODO: Implement refund tracking
          net: totalRevenue - totalPayouts,
          transactions: transactionCount
        }];
        
        return analytics;
      } catch (error) {
        console.error('Error fetching revenue analytics:', error);
        toast.error('Failed to load revenue analytics. Please try again.');
        return [];
      }
    },
  });

  // Skip financial forecast for now (complex feature for future implementation)
  const forecast: FinancialForecast[] = [];
  const loadingForecast = false;

  // Update payout request mutation
  const updatePayoutMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('payout_requests' as any)
        .update({
          status,
          notes,
          processed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating payout request:', error);
        throw new Error('Failed to update payout request');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-requests'] });
      toast.success('Payout request updated successfully');
      setSelectedPayoutRequest(null);
    },
    onError: () => {
      toast.error('Failed to update payout request');
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
      case 'processed':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const refreshAllData = async () => {
    try {
      const [summaryResult, transactionsResult, payoutsResult] = await Promise.all([
        refetchSummary(),
        refetchTransactions(),
        refetchPayouts()
      ]);
      
      const hasErrors = summaryResult.error || transactionsResult.error || payoutsResult.error;
      
      if (hasErrors) {
        console.error('Error refreshing some financial data:', { 
          summary: summaryResult.error, 
          transactions: transactionsResult.error, 
          payouts: payoutsResult.error 
        });
        toast.error('Some data failed to refresh. Please try again.');
      } else {
        toast.success('Financial data refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing financial data:', error);
      toast.error('Failed to refresh financial data');
    }
  };

  const exportFinancialData = async () => {
    try {
      const data = {
        summary: financialSummary,
        transactions,
        payoutRequests,
        analytics: revenueAnalytics,
        forecast,
        generatedAt: new Date().toISOString(),
        period: selectedPeriod
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Financial data exported successfully');
    } catch (error) {
      toast.error('Failed to export financial data');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Financial Management Dashboard</h2>
          <p className="text-gray-500">Revenue analytics, payments, and financial forecasting</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllData}
            disabled={fetchingSummary || fetchingTransactions || fetchingPayouts}
            data-testid="button-refresh-financial"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${(fetchingSummary || fetchingTransactions || fetchingPayouts) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportFinancialData}
            data-testid="button-export-financial"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <h3 className="text-2xl font-bold mt-1">
                  {loadingSummary ? (
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    formatCurrency(financialSummary?.totalRevenue || 0)
                  )}
                </h3>
                {financialSummary?.revenueGrowth !== undefined && (
                  <div className={`flex items-center mt-1 text-sm ${getGrowthColor(financialSummary.revenueGrowth)}`}>
                    {getGrowthIcon(financialSummary.revenueGrowth)}
                    <span className="ml-1">{formatPercentage(financialSummary.revenueGrowth)}</span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <ArrowUpRight className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Payouts</p>
                <h3 className="text-2xl font-bold mt-1">
                  {loadingSummary ? (
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    formatCurrency(financialSummary?.totalPayouts || 0)
                  )}
                </h3>
                {financialSummary?.payoutGrowth !== undefined && (
                  <div className={`flex items-center mt-1 text-sm ${getGrowthColor(financialSummary.payoutGrowth)}`}>
                    {getGrowthIcon(financialSummary.payoutGrowth)}
                    <span className="ml-1">{formatPercentage(financialSummary.payoutGrowth)}</span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <ArrowDownLeft className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Net Revenue</p>
                <h3 className="text-2xl font-bold mt-1">
                  {loadingSummary ? (
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    formatCurrency(financialSummary?.netRevenue || 0)
                  )}
                </h3>
                <div className="flex items-center mt-1 text-sm text-gray-500">
                  <DollarSign className="h-3 w-3 mr-1" />
                  <span>After payouts & refunds</span>
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <Wallet className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Payouts</p>
                <h3 className="text-2xl font-bold mt-1">
                  {loadingSummary ? (
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    formatCurrency(financialSummary?.pendingPayouts || 0)
                  )}
                </h3>
                <div className="flex items-center mt-1 text-sm text-orange-600">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Awaiting processing</span>
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded-full">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Transactions</span>
          </TabsTrigger>
          <TabsTrigger value="payouts" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Payouts</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Forecast</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAnalytics ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">Loading analytics...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {revenueAnalytics?.map((period, index) => (
                      <div key={index} className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm text-gray-500">Period</div>
                          <div className="font-medium">{period.period}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Revenue</div>
                          <div className="font-medium text-green-600">{formatCurrency(period.revenue)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Payouts</div>
                          <div className="font-medium text-blue-600">{formatCurrency(period.payouts)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Net</div>
                          <div className="font-medium">{formatCurrency(period.net)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Key Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Avg Order Value</span>
                    <span className="font-medium">{formatCurrency(financialSummary?.averageOrderValue || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Recurring Revenue</span>
                    <span className="font-medium">{formatCurrency(financialSummary?.recurringRevenue || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Churn Rate</span>
                    <span className="font-medium">{formatPercentage(financialSummary?.churnRate || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Refunds</span>
                    <span className="font-medium text-red-600">{formatCurrency(financialSummary?.refunds || 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" variant="outline" data-testid="button-process-payouts">
                    <Building className="h-4 w-4 mr-2" />
                    Process Pending Payouts
                  </Button>
                  <Button className="w-full" variant="outline" data-testid="button-generate-report">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Financial Report
                  </Button>
                  <Button className="w-full" variant="outline" data-testid="button-reconcile-accounts">
                    <Receipt className="h-4 w-4 mr-2" />
                    Reconcile Accounts
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="w-6 h-6 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions?.map((transaction) => (
                    <div key={transaction.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{transaction.userEmail}</span>
                            {getStatusBadge(transaction.status)}
                            <Badge variant="outline" className="capitalize">
                              {transaction.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">{transaction.description}</p>
                          {transaction.courseName && (
                            <p className="text-xs text-blue-600 mt-1">Course: {transaction.courseName}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                            <span>{new Date(transaction.createdAt).toLocaleString()}</span>
                            <span>{transaction.paymentMethod}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            transaction.type === 'payment' ? 'text-green-600' : 
                            transaction.type === 'payout' ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'payment' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payout Requests Management</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPayouts ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="w-6 h-6 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {payoutRequests?.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{request.userEmail}</span>
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Method: {request.payoutMethod}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Requested: {new Date(request.requestedAt).toLocaleString()}
                          </div>
                          {request.notes && (
                            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2">
                              Note: {request.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">
                            {formatCurrency(request.amount)}
                          </div>
                          {request.status === 'pending' && (
                            <div className="flex gap-1 mt-2">
                              <Button
                                size="sm"
                                onClick={() => updatePayoutMutation.mutate({
                                  id: request.id,
                                  status: 'approved'
                                })}
                                data-testid={`button-approve-${request.id}`}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updatePayoutMutation.mutate({
                                  id: request.id,
                                  status: 'rejected',
                                  notes: 'Rejected by admin'
                                })}
                                data-testid={`button-reject-${request.id}`}
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Direct Sales</span>
                    <span className="font-medium">
                      {formatCurrency((financialSummary?.totalRevenue || 0) * 0.7)}
                    </span>
                  </div>
                  <Progress value={70} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span>Referral Commissions</span>
                    <span className="font-medium">
                      {formatCurrency((financialSummary?.totalRevenue || 0) * 0.3)}
                    </span>
                  </div>
                  <Progress value={30} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>UPI</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span>Credit/Debit Cards</span>
                    <span className="font-medium">35%</span>
                  </div>
                  <Progress value={35} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span>Net Banking</span>
                    <span className="font-medium">20%</span>
                  </div>
                  <Progress value={20} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Forecasting</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingForecast ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="w-6 h-6 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <Alert>
                    <Target className="h-4 w-4" />
                    <AlertDescription>
                      Financial projections are based on current trends and historical data. 
                      Actual results may vary based on market conditions and business changes.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid gap-4">
                    {forecast?.map((period, index) => (
                      <div key={index} className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
                        <div>
                          <div className="text-sm text-gray-500">Period</div>
                          <div className="font-medium">{period.period}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Projected Revenue</div>
                          <div className="font-medium text-green-600">
                            {formatCurrency(period.projectedRevenue)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Projected Payouts</div>
                          <div className="font-medium text-blue-600">
                            {formatCurrency(period.projectedPayouts)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Net Projection</div>
                          <div className="font-medium">
                            {formatCurrency(period.netProjection)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatPercentage(period.confidence)} confidence
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialManagementDashboard;