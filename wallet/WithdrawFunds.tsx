
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useOptimizedWallet } from '@/hooks/useOptimizedWallet';
import PayoutMethodDialog from './PayoutMethodDialog';
import { sendPayoutNotification } from '@/services/telegramService';

interface WithdrawFundsProps {
  balance: number;
  onWithdrawSuccess?: () => void;
}

const WithdrawFunds: React.FC<WithdrawFundsProps> = ({ balance, onWithdrawSuccess }) => {
  const [amount, setAmount] = useState('');
  const [showMethodDialog, setShowMethodDialog] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: walletData } = useOptimizedWallet();
  const payoutMethods = walletData?.payoutMethods || [];

  const withdrawMutation = useMutation({
    mutationFn: async (withdrawAmount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!selectedMethodId) {
        throw new Error('Please select a payout method');
      }

      const { data: payoutRequest, error } = await supabase
        .from('payout_requests')
        .insert({
          user_id: user.id,
          amount: withdrawAmount,
          payout_method_id: selectedMethodId,
          status: 'pending'
        })
        .select(`
          *,
          user:users(email, name),
          payout_method:payout_methods(method_type, upi_id)
        `)
        .single();

      if (error) throw error;

      try {
        await sendPayoutNotification({
          user_id: user.id,
          user_email: payoutRequest.user?.email || user.email || 'Unknown',
          amount: withdrawAmount,
          payout_method: payoutRequest.payout_method?.method_type || 'Unknown',
          request_id: payoutRequest.id
        });
      } catch (notificationError) {
        console.error('Failed to send Telegram notification:', notificationError);
      }

      return payoutRequest;
    },
    onSuccess: () => {
      setAmount('');
      setSelectedMethodId('');
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Withdrawal request submitted successfully! You will be notified once processed.');
      onWithdrawSuccess?.();
    },
    onError: (error) => {
      console.error('Withdrawal error:', error);
      toast.error(error.message || 'Failed to submit withdrawal request');
    },
  });

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    
    const withdrawAmount = parseFloat(amount);
    
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (withdrawAmount < 100) {
      toast.error('Minimum withdrawal amount is ₹100');
      return;
    }

    if (withdrawAmount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    withdrawMutation.mutate(withdrawAmount);
  };

  if (payoutMethods.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need to add a payout method before you can withdraw funds.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => setShowMethodDialog(true)}
            className="mt-4 w-full"
          >
            Add Payout Method
          </Button>
          <PayoutMethodDialog 
            open={showMethodDialog} 
            onOpenChange={setShowMethodDialog}
            onMethodAdded={() => {
              setShowMethodDialog(false);
              queryClient.invalidateQueries({ queryKey: ['wallet'] });
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleWithdraw} className="space-y-4">
        <div>
          <Label htmlFor="amount">Withdrawal Amount</Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount (min ₹100)"
            min="100"
            max={balance}
            step="1"
            disabled={withdrawMutation.isPending}
          />
          <p className="text-sm text-gray-500 mt-1">
            Available balance: ₹{balance.toFixed(2)}
          </p>
        </div>

        <div>
          <Label htmlFor="method">Payout Method</Label>
          <select
            id="method"
            value={selectedMethodId}
            onChange={(e) => setSelectedMethodId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            disabled={withdrawMutation.isPending}
          >
            <option value="">Select payout method</option>
            {payoutMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.method_type === 'UPI' ? `UPI: ${method.upi_id}` : 
                 method.method_type === 'BANK' ? `Bank: ${method.account_number?.slice(-4)}` : 
                 method.method_type}
                {method.is_default && ' (Default)'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={withdrawMutation.isPending || !amount || !selectedMethodId}
            className="flex-1"
          >
            {withdrawMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Request Withdrawal'
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowMethodDialog(true)}
            disabled={withdrawMutation.isPending}
          >
            Manage Methods
          </Button>
        </div>
      </form>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Withdrawal requests are processed manually. You will receive a notification once your request is approved and processed.
        </AlertDescription>
      </Alert>

      <PayoutMethodDialog 
        open={showMethodDialog} 
        onOpenChange={setShowMethodDialog}
        onMethodAdded={() => {
          setShowMethodDialog(false);
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
        }}
      />
    </div>
  );
};

export default WithdrawFunds;
