
import { supabase } from '@/integrations/supabase/client';

export interface WalletData {
  id: string;
  user_id: string;
  total_earned: number;
  balance: number;
  total_withdrawn: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  description: string | null;
  reference_id: string | null;
  status: string;
  created_at: string;
}

// Get user's wallet data
export async function getUserWallet(): Promise<WalletData | null> {
  try {
    console.log('Fetching wallet data...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('Authentication required');
    }

    console.log('Fetching wallet for user:', user.id);

    // First try to get existing wallet
    const { data: existingWallet, error: fetchError } = await supabase
      .from('wallet')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching wallet:', fetchError);
      throw fetchError;
    }

    if (existingWallet) {
      console.log('Found existing wallet:', existingWallet);
      return existingWallet as WalletData;
    }

    // Create wallet if it doesn't exist
    console.log('No wallet found, creating new one...');
    const { data: newWallet, error: createError } = await supabase
      .from('wallet')
      .insert({
        user_id: user.id,
        total_earned: 0,
        balance: 0,
        total_withdrawn: 0
      })
      .select()
      .single();
      
    if (createError) {
      console.error('Error creating wallet:', createError);
      throw createError;
    }
    
    console.log('Successfully created new wallet:', newWallet);
    return newWallet as WalletData;
  } catch (error) {
    console.error('Exception fetching wallet:', error);
    throw error;
  }
}

// Get user's wallet transactions
export async function getWalletTransactions(): Promise<WalletTransaction[]> {
  try {
    console.log('Fetching wallet transactions...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return [];
    }
    
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }

    console.log('Successfully fetched wallet transactions:', data?.length || 0);
    return data as WalletTransaction[];
  } catch (error) {
    console.error('Exception fetching transactions:', error);
    throw error;
  }
}

// Update wallet balance
export async function updateWalletBalance(
  userId: string,
  amount: number,
  type: 'credit' | 'debit'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallet')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError) {
      console.error('Error fetching wallet for update:', walletError);
      return { success: false, error: walletError.message };
    }

    // Calculate new balance
    const currentBalance = wallet.balance || 0;
    const newBalance = type === 'credit' ? currentBalance + amount : currentBalance - amount;

    if (newBalance < 0) {
      return { success: false, error: 'Insufficient balance' };
    }

    // Update wallet
    const { error: updateError } = await supabase
      .from('wallet')
      .update({ 
        balance: newBalance,
        total_earned: type === 'credit' ? (wallet.total_earned || 0) + amount : wallet.total_earned,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating wallet balance:', updateError);
      return { success: false, error: updateError.message };
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: type,
        amount: amount,
        status: 'completed',
        description: `Wallet ${type === 'credit' ? 'credit' : 'debit'}`
      });

    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
    }

    return { success: true };
  } catch (error) {
    console.error('Exception updating wallet balance:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
