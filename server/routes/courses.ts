import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { validateSchema, courseCreateSchema, sanitizeInput } from '../middleware/validation';
import rateLimit from 'express-rate-limit';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Rate limiting for course endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' }
});

// Get all active courses (public)
router.get('/', apiLimiter, async (req, res) => {
  try {
    const { data: courses, error } = await supabaseAdmin
      .from('courses')
      .select(`
        id,
        title,
        description,
        price,
        referral_reward,
        thumbnail_url,
        is_active,
        created_at
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
      return res.status(500).json({ error: 'Failed to fetch courses' });
    }

    res.json({ courses });

  } catch (error) {
    console.error('Courses fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get course details (public)
router.get('/:id', apiLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: course, error } = await supabaseAdmin
      .from('courses')
      .select(`
        id,
        title,
        description,
        price,
        referral_reward,
        pdf_url,
        thumbnail_url,
        is_active,
        created_at,
        course_modules:course_modules!course_id(
          id,
          title,
          description,
          module_order,
          is_active,
          lessons:lessons!module_id(
            id,
            title,
            lesson_order,
            is_active
          )
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Sort modules and lessons by order
    if (course.course_modules) {
      course.course_modules.sort((a, b) => a.module_order - b.module_order);
      course.course_modules.forEach(module => {
        if (module.lessons) {
          module.lessons.sort((a, b) => a.lesson_order - b.lesson_order);
        }
      });
    }

    res.json({ course });

  } catch (error) {
    console.error('Course detail fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Purchase a course
router.post('/:id/purchase', authenticateUser, async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const userId = req.user!.id;
    const { referral_code, payment_id } = sanitizeInput(req.body);

    // Check if course exists and is active
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', courseId)
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
      .eq('course_id', courseId)
      .eq('payment_status', 'completed')
      .single();

    if (existingPurchase) {
      return res.status(400).json({ error: 'Course already purchased' });
    }

    // Validate referral code if provided
    let referrer: { user_id: string } | null = null;
    if (referral_code) {
      // Check course-specific referral code first
      const { data: courseReferralCode } = await supabaseAdmin
        .from('course_referral_codes')
        .select('user_id')
        .eq('referral_code', referral_code)
        .eq('course_id', courseId)
        .single();

      if (courseReferralCode) {
        referrer = { user_id: courseReferralCode.user_id };
      } else {
        // Check general referral code
        const { data: generalReferrer } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('referral_code', referral_code)
          .single();

        if (generalReferrer) {
          referrer = { user_id: generalReferrer.id };
        }
      }

      // Don't allow self-referral
      if (referrer && referrer.user_id === userId) {
        return res.status(400).json({ error: 'Cannot use your own referral code' });
      }
    }

    // Create purchase record
    const purchaseData = {
      user_id: userId,
      course_id: courseId,
      amount: parseFloat(course.price),
      payment_id: payment_id || null,
      payment_status: payment_id ? 'completed' : 'pending',
      used_referral_code: referral_code || null,
      has_used_referral_code: !!referral_code,
      purchased_at: new Date().toISOString()
    };

    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .insert(purchaseData)
      .select()
      .single();

    if (purchaseError) {
      console.error('Purchase creation error:', purchaseError);
      return res.status(500).json({ error: 'Failed to create purchase' });
    }

    // Process referral commission if referral code was used
    if (referrer && purchase.payment_status === 'completed') {
      const commissionAmount = parseFloat(course.referral_reward) || 0;
      
      if (commissionAmount > 0) {
        // Create referral record
        await supabaseAdmin
          .from('referrals')
          .insert({
            user_id: referrer.user_id,
            referred_user_id: userId,
            course_id: courseId,
            purchase_id: purchase.id,
            referral_code,
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

          // Create wallet transaction record
          await supabaseAdmin
            .from('wallet_transactions')
            .insert({
              user_id: referrer.user_id,
              type: 'credit',
              amount: commissionAmount.toString(),
              status: 'completed',
              description: `Referral commission for course: ${course.title}`,
              reference_id: purchase.id
            });

          // Create notification for referrer
          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: referrer.user_id,
              title: 'Referral Commission Earned!',
              message: `You earned ₹${commissionAmount} commission for referring someone to "${course.title}"`,
              type: 'success'
            });
        }
      }
    }

    res.status(201).json({
      message: 'Course purchased successfully',
      purchase: {
        id: purchase.id,
        course_id: purchase.course_id,
        amount: purchase.amount,
        payment_status: purchase.payment_status,
        purchased_at: purchase.purchased_at
      }
    });

  } catch (error) {
    console.error('Course purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's purchased courses
router.get('/user/purchases', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const { data: purchases, error } = await supabaseAdmin
      .from('purchases')
      .select(`
        id,
        amount,
        payment_status,
        purchased_at,
        course:courses!course_id(
          id,
          title,
          description,
          thumbnail_url
        )
      `)
      .eq('user_id', userId)
      .eq('payment_status', 'completed')
      .order('purchased_at', { ascending: false });

    if (error) {
      console.error('Error fetching user purchases:', error);
      return res.status(500).json({ error: 'Failed to fetch purchases' });
    }

    res.json({ purchases });

  } catch (error) {
    console.error('User purchases fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get course content (for purchased courses only)
router.get('/:id/content', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { id: courseId } = req.params;
    const userId = req.user!.id;

    // Check if user has purchased this course
    const { data: purchase } = await supabaseAdmin
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('payment_status', 'completed')
      .single();

    if (!purchase) {
      return res.status(403).json({ error: 'Course not purchased' });
    }

    // Get course content with modules and lessons
    const { data: course, error } = await supabaseAdmin
      .from('courses')
      .select(`
        id,
        title,
        description,
        pdf_url,
        course_modules:course_modules!course_id(
          id,
          title,
          description,
          content,
          module_order,
          is_active,
          lessons:lessons!module_id(
            id,
            title,
            content,
            video_url,
            lesson_order,
            is_active
          )
        )
      `)
      .eq('id', courseId)
      .eq('is_active', true)
      .single();

    if (error || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Sort modules and lessons by order
    if (course.course_modules) {
      course.course_modules = course.course_modules
        .filter(module => module.is_active)
        .sort((a, b) => a.module_order - b.module_order);

      course.course_modules.forEach(module => {
        if (module.lessons) {
          module.lessons = module.lessons
            .filter(lesson => lesson.is_active)
            .sort((a, b) => a.lesson_order - b.lesson_order);
        }
      });
    }

    // Get user progress
    const { data: progress } = await supabaseAdmin
      .from('user_progress')
      .select('module_id, lesson_id, completed')
      .eq('user_id', userId);

    res.json({ 
      course,
      progress: progress || []
    });

  } catch (error) {
    console.error('Course content fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lesson progress
router.post('/:courseId/modules/:moduleId/lessons/:lessonId/complete', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const userId = req.user!.id;

    // Verify user has access to this course
    const { data: purchase } = await supabaseAdmin
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('payment_status', 'completed')
      .single();

    if (!purchase) {
      return res.status(403).json({ error: 'Course not purchased' });
    }

    // Check if progress already exists
    const { data: existingProgress } = await supabaseAdmin
      .from('user_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single();

    if (existingProgress) {
      // Update existing progress
      await supabaseAdmin
        .from('user_progress')
        .update({
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', existingProgress.id);
    } else {
      // Create new progress record
      await supabaseAdmin
        .from('user_progress')
        .insert({
          user_id: userId,
          module_id: moduleId,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString()
        });
    }

    res.json({ message: 'Lesson completed successfully' });

  } catch (error) {
    console.error('Progress update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate referral code for a course
router.post('/:id/referral-code', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { id: courseId } = req.params;
    const userId = req.user!.id;

    // Check if course exists
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .eq('is_active', true)
      .single();

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if referral code already exists for this user-course combination
    const { data: existingCode } = await supabaseAdmin
      .from('course_referral_codes')
      .select('referral_code')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (existingCode) {
      return res.json({
        referral_code: existingCode.referral_code,
        message: 'Referral code already exists'
      });
    }

    // Generate new referral code
    const referralCode = `${courseId.substring(0, 8)}-${userId.substring(0, 8)}-${Date.now().toString().slice(-6)}`.toUpperCase();

    const { data: newReferralCode, error } = await supabaseAdmin
      .from('course_referral_codes')
      .insert({
        user_id: userId,
        course_id: courseId,
        referral_code: referralCode
      })
      .select()
      .single();

    if (error) {
      console.error('Referral code creation error:', error);
      return res.status(500).json({ error: 'Failed to create referral code' });
    }

    res.status(201).json({
      referral_code: newReferralCode.referral_code,
      message: 'Referral code created successfully'
    });

  } catch (error) {
    console.error('Referral code generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;