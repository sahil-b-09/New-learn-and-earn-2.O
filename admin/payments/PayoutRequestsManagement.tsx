
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { sendPayoutNotification } from '@/services/telegramService';

interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  payout_method_id: string;
  admin_notes: string | null;
  user?: {
    email: string | null;
    name: string | null;
  };
  payout_method?: {
    method_type: string;
    upi_id: string | null;
    bank_account_number: string | null;
  };
}

const PayoutRequestsManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: payoutRequests = [], isLoading } = useQuery({
    queryKey: ['admin-payout-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payout_requests')
        .select(`
          *,
          user:users(email, name),
          payout_method:payout_methods(method_type, upi_id, bank_account_number)
        `)
        .order('requested_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching payout requests:", error);
        throw error;
      }
      
      return (data || []).map(item => ({
        ...item,
        user: item.user || { email: 'Unknown User', name: 'Unknown' },
        payout_method: item.payout_method || { method_type: 'Unknown', upi_id: null, bank_account_number: null }
      })) as PayoutRequest[];
    },
  });

  const completePayout = useMutation({
    mutationFn: async (payoutId: string) => {
      const payout = payoutRequests.find(p => p.id === payoutId);
      if (!payout) throw new Error('Payout not found');

      // Update payout status
      const { error: payoutError } = await supabase
        .from('payout_requests')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString(),
          admin_notes: 'Completed by admin'
        })
        .eq('id', payoutId);

      if (payoutError) throw payoutError;

      // Get current wallet data
      const { data: walletData, error: walletFetchError } = await supabase
        .from('wallet')
        .select('balance, total_withdrawn')
        .eq('user_id', payout.user_id)
        .single();

      if (walletFetchError) throw walletFetchError;

      // Update user wallet
      const { error: walletError } = await supabase
        .from('wallet')
        .update({ 
          balance: (walletData.balance || 0) - payout.amount,
          total_withdrawn: (walletData.total_withdrawn || 0) + payout.amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', payout.user_id);

      if (walletError) throw walletError;

      // Create wallet transaction
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: payout.user_id,
          type: 'debit',
          amount: payout.amount,
          status: 'completed',
          description: 'Payout processed',
          reference_id: payoutId
        });

      if (transactionError) throw transactionError;

      return payoutId;
    },
    onMutate: (payoutId) => {
      setProcessingId(payoutId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payout-requests'] });
      toast.success('Payout completed successfully');
    },
    onError: (error) => {
      console.error('Error completing payout:', error);
      toast.error('Failed to complete payout');
    },
    onSettled: () => {
      setProcessingId(null);
    }
  });

  const sendNotification = async (payout: PayoutRequest) => {
    try {
      const result = await sendPayoutNotification({
        user_id: payout.user_id,
        user_email: payout.user?.email || 'Unknown',
        amount: payout.amount,
        payout_method: payout.payout_method?.method_type || 'Unknown',
        request_id: payout.id
      });

      if (result.success) {
        toast.success('Notification sent to Telegram');
      } else {
        toast.error('Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout Requests Management</CardTitle>
      </CardHeader>
      <CardContent>
        {payoutRequests.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">No payout requests</h3>
            <p className="text-gray-500">When users request payouts, they will appear here</p>
          </div>
        ) : (
          <div className="border rounded-md overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(request.requested_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.user?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{request.user?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(request.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{request.payout_method?.method_type || 'Unknown'}</div>
                        {request.payout_method?.upi_id && (
                          <div className="text-xs text-gray-500">{request.payout_method.upi_id}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => completePayout.mutate(request.id)}
                              disabled={processingId === request.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {processingId === request.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Complete'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendNotification(request)}
                            >
                              Notify
                            </Button>
                          </>
                        )}
                        {request.status === 'completed' && request.processed_at && (
                          <span className="text-xs text-gray-500">
                            Completed on {new Date(request.processed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PayoutRequestsManagement;
