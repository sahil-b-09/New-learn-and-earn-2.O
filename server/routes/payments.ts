import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { sanitizeInput } from '../middleware/validation';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// Rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 payment attempts per window
  message: { error: 'Too many payment attempts, please try again later' }
});

// Create Razorpay order
router.post('/create-order', authenticateUser, paymentLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { course_id, referral_code } = sanitizeInput(req.body);
    const userId = req.user!.id;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Payment gateway not configured' });
    }

    // Get course details
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', course_id)
      .eq('is_active', true)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user already purchased this course
    const { data: existingPurchase } = await supabaseAdmin
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', course_id)
      .eq('payment_status', 'completed')
      .single();

    if (existingPurchase) {
      return res.status(400).json({ error: 'Course already purchased' });
    }

    // Get user details
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('name, email, phone')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create Razorpay order
    const amount = Math.round(parseFloat(course.price) * 100); // Convert to paise
    const receipt = `order_${Date.now()}_${userId.substring(0, 8)}`;

    const orderData = {
      amount,
      currency: 'INR',
      receipt,
      notes: {
        course_id,
        user_id: userId,
        referral_code: referral_code || '',
        course_title: course.title
      }
    };

    // Call Razorpay API to create order
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Razorpay order creation failed:', error);
      return res.status(500).json({ error: 'Failed to create payment order' });
    }

    const order = await response.json();

    // Validate referral code if provided
    let validatedReferralCode = null;
    let referrerId = null;
    
    if (referral_code) {
      // Check general referral code
      const { data: generalReferrer } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('referral_code', referral_code)
        .single();
      
      if (generalReferrer) {
        referrerId = generalReferrer.id;
        validatedReferralCode = referral_code;
      } else {
        // Check course-specific referral code
        const { data: courseReferrer } = await supabaseAdmin
          .from('course_referral_codes')
          .select('user_id')
          .eq('referral_code', referral_code)
          .eq('course_id', course_id)
          .single();
        
        if (courseReferrer) {
          referrerId = courseReferrer.user_id;
          validatedReferralCode = referral_code;
        }
      }
      
      // Prevent self-referral
      if (referrerId === userId) {
        return res.status(400).json({ error: 'Cannot use your own referral code' });
      }
      
      // Invalid referral code (log but don't block purchase)
      if (!referrerId) {
        console.warn(`Invalid referral code used: ${referral_code} for user: ${userId}`);
        // Still allow purchase but don't apply referral
        validatedReferralCode = null;
      }
    }

    // Create pending purchase record
    const purchaseData = {
      user_id: userId,
      course_id,
      amount: parseFloat(course.price),
      payment_id: order.id,
      payment_status: 'pending',
      used_referral_code: validatedReferralCode,
      has_used_referral_code: !!validatedReferralCode,
      purchased_at: new Date().toISOString()
      // NOTE: referrer_id not stored in purchases - resolved during commission processing
    };

    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .insert(purchaseData)
      .select()
      .single();

    if (purchaseError) {
      console.error('Purchase creation error:', purchaseError);
      return res.status(500).json({ error: 'Failed to create purchase record' });
    }

    res.status(201).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: RAZORPAY_KEY_ID,
      purchase_id: purchase.id,
      prefill: {
        name: user.name || '',
        email: user.email || '',
        contact: user.phone || ''
      },
      notes: order.notes
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify payment
router.post('/verify', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      purchase_id 
    } = sanitizeInput(req.body);

    const userId = req.user!.id;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Get purchase record
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .select(`
        *,
        course:courses!course_id(*)
      `)
      .eq('id', purchase_id)
      .eq('user_id', userId)
      .single();

    if (purchaseError || !purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    if (purchase.payment_status === 'completed') {
      return res.status(400).json({ error: 'Payment already completed' });
    }

    // Update purchase status
    const { error: updateError } = await supabaseAdmin
      .from('purchases')
      .update({
        payment_status: 'completed',
        payment_id: razorpay_payment_id
      })
      .eq('id', purchase_id);

    if (updateError) {
      console.error('Purchase update error:', updateError);
      return res.status(500).json({ error: 'Failed to update purchase' });
    }

    // Process referral commission if applicable
    if (purchase.has_used_referral_code && purchase.used_referral_code) {
      await processReferralCommission(purchase, purchase.course);
    }

    // Create notification for user
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Course Purchased Successfully!',
        message: `You have successfully purchased "${purchase.course.title}". You can now access the course content.`,
        type: 'success',
        action_url: `/courses/${purchase.course_id}/content`
      });

    res.json({
      message: 'Payment verified successfully',
      purchase: {
        id: purchase.id,
        course_id: purchase.course_id,
        payment_status: 'completed'
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Payment webhook (for server-to-server verification)
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { event, payload } = req.body;

    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;

      // Find purchase by order ID
      const { data: purchase, error } = await supabaseAdmin
        .from('purchases')
        .select(`
          *,
          course:courses!course_id(*)
        `)
        .eq('payment_id', orderId)
        .single();

      if (error || !purchase) {
        console.error('Purchase not found for order:', orderId);
        return res.status(404).json({ error: 'Purchase not found' });
      }

      // Update purchase status if not already completed
      if (purchase.payment_status !== 'completed') {
        await supabaseAdmin
          .from('purchases')
          .update({
            payment_status: 'completed',
            payment_id: payment.id
          })
          .eq('id', purchase.id);

        // Process referral commission
        if (purchase.has_used_referral_code && purchase.used_referral_code) {
          await processReferralCommission(purchase, purchase.course);
        }

        // Create success notification
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: purchase.user_id,
            title: 'Payment Confirmed!',
            message: `Your payment for "${purchase.course.title}" has been confirmed. Course access is now available.`,
            type: 'success',
            action_url: `/courses/${purchase.course_id}/content`
          });
      }
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Helper function to process referral commission
async function processReferralCommission(purchase: any, course: any) {
  try {
    // Find referrer
    let referrer: { user_id: string } | null = null;

    // Check course-specific referral code first
    const { data: courseReferralCode } = await supabaseAdmin
      .from('course_referral_codes')
      .select('user_id')
      .eq('referral_code', purchase.used_referral_code)
      .eq('course_id', purchase.course_id)
      .single();

    if (courseReferralCode) {
      referrer = { user_id: courseReferralCode.user_id };
    } else {
      // Check general referral code
      const { data: generalReferrer } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('referral_code', purchase.used_referral_code)
        .single();

      if (generalReferrer) {
        referrer = { user_id: generalReferrer.id };
      }
    }

    if (!referrer || referrer.user_id === purchase.user_id) {
      return; // No valid referrer or self-referral
    }

    // Calculate 50% commission of course price (Learn & Earn business model)
    const coursePrice = parseFloat(course.price) || 0;
    const commissionAmount = coursePrice * 0.5;
    
    if (commissionAmount <= 0) {
      return; // No commission to process
    }

    // Create referral record
    await supabaseAdmin
      .from('referrals')
      .insert({
        user_id: referrer.user_id,
        referred_user_id: purchase.user_id,
        course_id: purchase.course_id,
        purchase_id: purchase.id,
        referral_code: purchase.used_referral_code,
        commission_amount: commissionAmount,
        status: 'completed'
      });

    // Update referrer's wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallet')
      .select('*')
      .eq('user_id', referrer.user_id)
      .single();

    if (wallet) {
      const newBalance = parseFloat(wallet.balance) + commissionAmount;
      const newTotalEarned = parseFloat(wallet.total_earned) + commissionAmount;

      await supabaseAdmin
        .from('wallet')
        .update({
          balance: newBalance.toString(),
          total_earned: newTotalEarned.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', referrer.user_id);

      // Create wallet transaction
      await supabaseAdmin
        .from('wallet_transactions')
        .insert({
          user_id: referrer.user_id,
          type: 'credit',
          amount: commissionAmount.toString(),
          status: 'completed',
          description: `Referral commission: ${course.title}`,
          reference_id: purchase.id
        });

      // Notify referrer
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: referrer.user_id,
          title: 'Commission Earned!',
          message: `You earned ₹${commissionAmount} from a referral purchase of "${course.title}"`,
          type: 'success'
        });
    }

  } catch (error) {
    console.error('Referral commission processing error:', error);
  }
}

export default router;