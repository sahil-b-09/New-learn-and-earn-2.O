
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import TransactionItem from './TransactionItem';

interface PayoutMethodInfo {
  method_type: string;
  upi_id: string | null;
  account_number: string | null;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at: string | null;
  payout_method: PayoutMethodInfo;
}

const PayoutHistory: React.FC = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPayouts = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('payouts')
          .select(`
            id,
            amount,
            status,
            created_at,
            processed_at,
            payout_method:payout_methods(
              method_type,
              upi_id,
              bank_account_number
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Transform the data to match our interface
        const transformedPayouts = (data || []).map(item => ({
          ...item,
          payout_method: {
            method_type: item.payout_method?.method_type || 'UPI',
            upi_id: item.payout_method?.upi_id || null,
            account_number: item.payout_method?.bank_account_number || null
          }
        }));
        
        setPayouts(transformedPayouts as unknown as Payout[]);
      } catch (error) {
        console.error('Error fetching payouts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPayouts();
  }, [user]);

  if (isLoading) {
    return <div className="text-center py-4">Loading payout history...</div>;
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">Payout History</h3>
      
      {payouts.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No payouts yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => {
            const title = `Payout to ${payout.payout_method.method_type === 'UPI' 
              ? `UPI: ${payout.payout_method.upi_id}` 
              : `Bank: xxxxxx${payout.payout_method.account_number?.slice(-4) || ''}`}`;
              
            const date = new Date(payout.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            
            const statusMap: Record<string, 'Paid' | 'Pending' | 'Failed'> = {
              'pending': 'Pending',
              'success': 'Paid',
              'failed': 'Failed'
            };
            
            return (
              <TransactionItem 
                key={payout.id}
                title={title}
                type="Withdrawal"
                date={date}
                amount={payout.amount}
                status={statusMap[payout.status] || 'Pending'}
                isPositive={false}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PayoutHistory;
