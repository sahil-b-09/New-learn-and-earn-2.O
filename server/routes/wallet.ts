import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { validateSchema, payoutRequestSchema, sanitizeInput } from '../middleware/validation';
import rateLimit from 'express-rate-limit';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Rate limiting for wallet endpoints
const walletLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: { error: 'Too many wallet requests, please try again later' }
});

// Get wallet balance and details
router.get('/balance', authenticateUser, walletLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const { data: wallet, error } = await supabaseAdmin
      .from('wallet')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Create wallet if it doesn't exist
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('wallet')
        .insert({
          user_id: userId,
          balance: '0.00',
          total_earned: '0.00',
          total_withdrawn: '0.00'
        })
        .select()
        .single();

      if (createError) {
        console.error('Wallet creation error:', createError);
        return res.status(500).json({ error: 'Failed to create wallet' });
      }

      return res.json({ wallet: newWallet });
    }

    res.json({ wallet });

  } catch (error) {
    console.error('Wallet balance fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get wallet transactions
router.get('/transactions', authenticateUser, walletLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const { data: transactions, error } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit as string) - 1);

    if (error) {
      console.error('Transactions fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Transaction count error:', countError);
    }

    res.json({
      transactions,
      pagination: {
        current_page: parseInt(page as string),
        total_pages: Math.ceil((count || 0) / parseInt(limit as string)),
        total_count: count || 0,
        has_more: offset + transactions.length < (count || 0)
      }
    });

  } catch (error) {
    console.error('Wallet transactions fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get or create payout methods
router.get('/payout-methods', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const { data: payoutMethods, error } = await supabaseAdmin
      .from('payout_methods')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Payout methods fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch payout methods' });
    }

    res.json({ payout_methods: payoutMethods || [] });

  } catch (error) {
    console.error('Payout methods fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add payout method
router.post('/payout-methods', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { 
      method_type, 
      upi_id, 
      account_number, 
      ifsc_code, 
      account_holder_name, 
      is_default 
    } = sanitizeInput(req.body);

    // Validate required fields based on method type
    if (method_type === 'UPI' && !upi_id) {
      return res.status(400).json({ error: 'UPI ID is required for UPI method' });
    }

    if (method_type === 'BANK' && (!account_number || !ifsc_code || !account_holder_name)) {
      return res.status(400).json({ error: 'Bank details are required for bank transfer method' });
    }

    // If this is set as default, remove default from other methods
    if (is_default) {
      await supabaseAdmin
        .from('payout_methods')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const payoutMethodData = {
      user_id: userId,
      method_type,
      upi_id: method_type === 'UPI' ? upi_id : null,
      account_number: method_type === 'BANK' ? account_number : null,
      ifsc_code: method_type === 'BANK' ? ifsc_code : null,
      account_holder_name: method_type === 'BANK' ? account_holder_name : null,
      is_default: !!is_default,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: payoutMethod, error } = await supabaseAdmin
      .from('payout_methods')
      .insert(payoutMethodData)
      .select()
      .single();

    if (error) {
      console.error('Payout method creation error:', error);
      return res.status(500).json({ error: 'Failed to create payout method' });
    }

    res.status(201).json({
      message: 'Payout method added successfully',
      payout_method: payoutMethod
    });

  } catch (error) {
    console.error('Payout method creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request payout
router.post('/payout-request', authenticateUser, validateSchema(payoutRequestSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { amount, payout_method_id } = sanitizeInput(req.body);

    // Get user wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallet')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const currentBalance = parseFloat(wallet.balance);

    // Check if user has sufficient balance
    if (currentBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Check minimum payout amount
    if (amount < 10) {
      return res.status(400).json({ error: 'Minimum payout amount is ₹10' });
    }

    // Verify payout method belongs to user
    const { data: payoutMethod, error: methodError } = await supabaseAdmin
      .from('payout_methods')
      .select('*')
      .eq('id', payout_method_id)
      .eq('user_id', userId)
      .single();

    if (methodError || !payoutMethod) {
      return res.status(404).json({ error: 'Payout method not found' });
    }

    // Check for pending payout requests
    const { data: pendingRequests } = await supabaseAdmin
      .from('payout_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (pendingRequests && pendingRequests.length > 0) {
      return res.status(400).json({ error: 'You have a pending payout request. Please wait for it to be processed.' });
    }

    // Create payout request
    const payoutRequestData = {
      user_id: userId,
      amount: amount.toString(),
      payout_method_id,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data: payoutRequest, error: requestError } = await supabaseAdmin
      .from('payout_requests')
      .insert(payoutRequestData)
      .select()
      .single();

    if (requestError) {
      console.error('Payout request creation error:', requestError);
      return res.status(500).json({ error: 'Failed to create payout request' });
    }

    // Deduct amount from wallet balance (hold it)
    const newBalance = currentBalance - amount;
    
    await supabaseAdmin
      .from('wallet')
      .update({
        balance: newBalance.toString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    // Create wallet transaction for the hold
    await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'debit',
        amount: amount.toString(),
        status: 'pending',
        description: `Payout request - ${payoutMethod.method_type}`,
        reference_id: payoutRequest.id
      });

    // Create notification
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Payout Request Submitted',
        message: `Your payout request of ₹${amount} has been submitted and is pending approval.`,
        type: 'info'
      });

    // TODO: Send Telegram notification to admin
    // This would be implemented with the Telegram bot API

    res.status(201).json({
      message: 'Payout request submitted successfully',
      payout_request: {
        id: payoutRequest.id,
        amount: payoutRequest.amount,
        status: payoutRequest.status,
        created_at: payoutRequest.created_at
      }
    });

  } catch (error) {
    console.error('Payout request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payout requests
router.get('/payout-requests', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const { data: payoutRequests, error } = await supabaseAdmin
      .from('payout_requests')
      .select(`
        *,
        payout_method:payout_methods!payout_method_id(
          method_type,
          upi_id,
          account_number,
          ifsc_code,
          account_holder_name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Payout requests fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch payout requests' });
    }

    res.json({ payout_requests: payoutRequests || [] });

  } catch (error) {
    console.error('Payout requests fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get referral statistics
router.get('/referral-stats', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get referral statistics
    const { data: referrals, error: referralsError } = await supabaseAdmin
      .from('referrals')
      .select(`
        id,
        commission_amount,
        status,
        created_at,
        course:courses!course_id(title),
        referred_user:users!referred_user_id(name, email)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (referralsError) {
      console.error('Referrals fetch error:', referralsError);
      return res.status(500).json({ error: 'Failed to fetch referral stats' });
    }

    // Calculate statistics
    const totalReferrals = referrals?.length || 0;
    const completedReferrals = referrals?.filter(r => r.status === 'completed') || [];
    const totalCommission = completedReferrals.reduce((sum, r) => sum + parseFloat(r.commission_amount || '0'), 0);

    // Get user's referral codes
    const { data: referralCodes } = await supabaseAdmin
      .from('course_referral_codes')
      .select(`
        referral_code,
        course:courses!course_id(id, title)
      `)
      .eq('user_id', userId);

    // Get general referral code
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('referral_code')
      .eq('id', userId)
      .single();

    res.json({
      statistics: {
        total_referrals: totalReferrals,
        successful_referrals: completedReferrals.length,
        total_commission: totalCommission,
        pending_commission: referrals?.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.commission_amount || '0'), 0) || 0
      },
      recent_referrals: referrals?.slice(0, 10) || [],
      referral_codes: {
        general_code: user?.referral_code || null,
        course_codes: referralCodes || []
      }
    });

  } catch (error) {
    console.error('Referral stats fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;