import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface WalletData {
  balance: number;
  transactions: any[];
}

export const useOptimizedWallet = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async (): Promise<WalletData> => {
      if (!user) throw new Error('User not authenticated');

      const [walletResult, transactionsResult] = await Promise.all([
        supabase.from('wallet').select('balance').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (walletResult.error) throw walletResult.error;
      if (transactionsResult.error) throw transactionsResult.error;

      return {
        balance: walletResult.data?.balance || 0,
        transactions: transactionsResult.data || [],
      };
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000,
  });
};
