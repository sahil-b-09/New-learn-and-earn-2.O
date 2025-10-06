
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import UnifiedHeader from '@/components/layout/UnifiedHeader';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet as WalletIcon, TrendingUp, Download } from 'lucide-react';
import WithdrawFunds from '@/components/wallet/WithdrawFunds';
import PayoutHistory from '@/components/wallet/PayoutHistory';
import { getUserWallet, getWalletTransactions, type WalletData, type WalletTransaction } from '@/services/walletService';
import { toast } from 'sonner';

const Wallet: React.FC = () => {
  const { user } = useAuth();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWalletData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Loading wallet data for user:', user.id);
        
        // Load wallet data and transactions
        const wallet = await getUserWallet();
        const walletTransactions = await getWalletTransactions();
        
        setWalletData(wallet);
        setTransactions(walletTransactions);
        console.log('Wallet data loaded successfully');
      } catch (error) {
        console.error('Error loading wallet data:', error);
        setError('Failed to load wallet data. Please refresh the page.');
        toast.error('Failed to load wallet data');
      } finally {
        setIsLoading(false);
      }
    };

    loadWalletData();
  }, [user]);

  const handleWithdrawSuccess = async () => {
    // Refresh wallet data after successful withdrawal
    try {
      const wallet = await getUserWallet();
      const walletTransactions = await getWalletTransactions();
      
      if (wallet) setWalletData(wallet);
      setTransactions(walletTransactions);
      
      toast.success('Withdrawal request submitted successfully');
    } catch (error) {
      console.error('Error refreshing wallet data:', error);
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UnifiedHeader />
        <main className="max-w-[993px] mx-auto w-full px-6 py-8 flex-grow">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-t-[#00C853] border-gray-200 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600">Loading wallet data...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UnifiedHeader />
        <main className="max-w-[993px] mx-auto w-full px-6 py-8 flex-grow">
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <WalletIcon className="h-16 w-16 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Wallet Error</h2>
              <p>{error}</p>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-[#00C853] text-white rounded-lg hover:bg-[#00B248]"
            >
              Retry
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const availableBalance = walletData?.balance || 0;
  const totalEarned = walletData?.total_earned || 0;
  const totalWithdrawn = walletData?.total_withdrawn || 0;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <UnifiedHeader />
      <main className="max-w-[993px] mx-auto w-full px-6 py-8 max-sm:p-4 flex-grow">
        <div className="flex items-center mb-6">
          <WalletIcon className="h-8 w-8 text-[#00C853] mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <WalletIcon className="h-4 w-4 text-[#00C853]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#00C853]">₹{availableBalance.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">Ready for withdrawal</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">₹{totalEarned.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">From referrals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
              <Download className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">₹{totalWithdrawn.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">Successful payouts</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Withdraw Funds</CardTitle>
          </CardHeader>
          <CardContent>
            <WithdrawFunds 
              balance={availableBalance} 
              onWithdrawSuccess={handleWithdrawSuccess}
            />
          </CardContent>
        </Card>

        <PayoutHistory />
      </main>
      <Footer />
    </div>
  );
};

export default Wallet;
