
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOrderData {
  id: string;
  amount: number;
  currency: string;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface PaymentInitData {
  orderId: string;
  amount: number;
  currency: string;
  userId: string;
  courseId: string;
  referralCode?: string;
}

// Load Razorpay script
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

// Create Razorpay order
export const createRazorpayOrder = async (
  courseId: string,
  amount: number,
  userId: string,
  referralCode?: string
): Promise<{ success: boolean; data?: RazorpayOrderData; error?: string }> => {
  try {
    console.log('Creating Razorpay order:', { courseId, amount, userId, referralCode });
    
    // For demo purposes, create a mock order
    const mockOrder: RazorpayOrderData = {
      id: `order_${Date.now()}`,
      amount: amount * 100, // Convert to paise
      currency: 'INR'
    };
    
    console.log('Mock order created:', mockOrder);
    return { success: true, data: mockOrder };
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, error: 'Failed to create order' };
  }
};

// Initialize Razorpay payment
export const initializeRazorpayPayment = async (
  paymentData: PaymentInitData,
  onSuccess: (response: RazorpayResponse) => void,
  onError: (error: any) => void
) => {
  try {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error('Failed to load Razorpay script');
    }

    const options = {
      key: 'rzp_test_9999999999', // Demo key
      amount: paymentData.amount,
      currency: paymentData.currency,
      name: 'Learn & Earn',
      description: 'Course Purchase',
      order_id: paymentData.orderId,
      handler: (response: RazorpayResponse) => {
        console.log('Payment successful:', response);
        onSuccess(response);
      },
      prefill: {
        name: 'Student',
        email: 'student@example.com',
      },
      theme: {
        color: '#00C853'
      },
      modal: {
        ondismiss: () => {
          console.log('Payment modal dismissed');
          onError(new Error('Payment cancelled'));
        }
      }
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  } catch (error) {
    console.error('Error initializing payment:', error);
    onError(error);
  }
};

// Process payment success
export const processPaymentSuccess = async (
  response: RazorpayResponse,
  userId: string,
  courseId: string,
  amount: number,
  referralCode?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Processing payment success:', { response, userId, courseId, amount, referralCode });
    
    // Create purchase record
    const purchaseData = {
      user_id: userId,
      course_id: courseId,
      amount: amount,
      payment_id: response.razorpay_payment_id,
      payment_status: 'completed',
      has_used_referral_code: Boolean(referralCode),
      used_referral_code: referralCode || null,
      purchased_at: new Date().toISOString()
    };
    
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert(purchaseData)
      .select()
      .single();
      
    if (purchaseError) {
      console.error('Error creating purchase:', purchaseError);
      throw purchaseError;
    }
    
    console.log('Purchase created:', purchase);
    
    // Process referral if applicable
    if (referralCode) {
      await processReferralReward(referralCode, userId, courseId, amount);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error processing payment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Process referral reward
const processReferralReward = async (
  referralCode: string,
  referredUserId: string,
  courseId: string,
  amount: number
) => {
  try {
    console.log('Processing referral reward:', { referralCode, referredUserId, courseId, amount });
    
    // Find the user who owns this referral code
    const { data: referrer, error: referrerError } = await supabase
      .from('users')
      .select('id')
      .eq('referral_code', referralCode)
      .single();
      
    if (referrerError || !referrer) {
      console.error('Referrer not found:', referrerError);
      return;
    }
    
    // Get course referral reward percentage (50%)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('referral_reward')
      .eq('id', courseId)
      .single();
      
    if (courseError || !course) {
      console.error('Course not found:', courseError);
      return;
    }
    
    const rewardAmount = course.referral_reward || (amount * 0.5); // 50% default
    
    // Get current wallet balance
    const { data: currentWallet, error: walletFetchError } = await supabase
      .from('wallet')
      .select('balance, total_earned')
      .eq('user_id', referrer.id)
      .single();
      
    if (walletFetchError) {
      console.error('Error fetching wallet:', walletFetchError);
      return;
    }
    
    const newBalance = (currentWallet?.balance || 0) + rewardAmount;
    const newTotalEarned = (currentWallet?.total_earned || 0) + rewardAmount;
    
    // Update referrer's wallet
    const { error: walletError } = await supabase
      .from('wallet')
      .update({
        balance: newBalance,
        total_earned: newTotalEarned,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', referrer.id);
      
    if (walletError) {
      console.error('Error updating wallet:', walletError);
      return;
    }
    
    // Create referral record
    const referralData = {
      user_id: referrer.id,
      referred_user_id: referredUserId,
      course_id: courseId,
      commission_amount: rewardAmount,
      status: 'completed',
      referral_code: referralCode
    };
    
    const { error: referralError } = await supabase
      .from('referrals')
      .insert(referralData);
      
    if (referralError) {
      console.error('Error creating referral:', referralError);
    }
    
    // Create wallet transaction
    const transactionData = {
      user_id: referrer.id,
      type: 'referral_reward',
      amount: rewardAmount,
      description: `Referral reward for course purchase`,
      reference_id: courseId,
      status: 'completed'
    };
    
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert(transactionData);
      
    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
    }
    
    console.log('Referral reward processed successfully');
  } catch (error) {
    console.error('Error processing referral reward:', error);
  }
};
