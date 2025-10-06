import { Router } from 'express';
import { db } from '../db';
import { users, referrals, courses, course_referral_codes, purchases } from '../../shared/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateUser);

// GET /api/referrals/my-stats - Get user's referral statistics  
router.get('/my-stats', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Get user's referral stats
    const user = await db.select({
      referral_code: users.referral_code,
      name: users.name,
      email: users.email
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user can refer (has any completed purchase)
    const purchaseCheck = await db.execute(
      sql`SELECT COUNT(*)::INTEGER as completed_purchases FROM purchases WHERE user_id = ${userId} AND payment_status = 'completed'`
    );
    const canRefer = Number(purchaseCheck.rows[0]?.completed_purchases || 0) > 0;

    // Get referral performance stats (COMPLETED ONLY)
    const referralStats = await db.execute(
      sql`
        SELECT 
          COUNT(*)::INTEGER as total_referrals,
          COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as successful_referrals,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN commission_amount ELSE 0 END), 0) as total_earnings,
          COUNT(DISTINCT referred_user_id)::INTEGER as unique_users_referred
        FROM referrals 
        WHERE user_id = ${userId} AND status = 'completed'
      `
    );

    // Get per-course referral breakdown
    const courseReferrals = await db.execute(
      sql`
        SELECT 
          c.id as course_id,
          c.title as course_title,
          crc.referral_code,
          COUNT(r.id)::INTEGER as total_referrals,
          COALESCE(SUM(r.commission_amount), 0) as total_earnings
        FROM purchases p
        JOIN courses c ON p.course_id = c.id
        LEFT JOIN course_referral_codes crc ON (crc.user_id = ${userId} AND crc.course_id = c.id)
        LEFT JOIN referrals r ON (r.user_id = ${userId} AND r.course_id = c.id AND r.status = 'completed')
        WHERE p.user_id = ${userId} AND p.payment_status = 'completed'
        GROUP BY c.id, c.title, crc.referral_code
        ORDER BY total_earnings DESC
      `
    );

    // Get recent referrals (COMPLETED ONLY)
    const recentReferrals = await db.select({
      id: referrals.id,
      referred_user_name: users.name,
      referred_user_email: users.email,
      course_title: courses.title,
      commission_amount: referrals.commission_amount,
      status: referrals.status,
      created_at: referrals.created_at
    })
    .from(referrals)
    .leftJoin(users, eq(referrals.referred_user_id, users.id))
    .leftJoin(courses, eq(referrals.course_id, courses.id))
    .where(and(eq(referrals.user_id, userId), eq(referrals.status, 'completed')))
    .orderBy(desc(referrals.created_at))
    .limit(10);

    res.json({
      user_info: user[0],
      can_refer: canRefer,
      stats: referralStats.rows[0],
      course_referrals: courseReferrals.rows,
      recent_referrals: recentReferrals
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Failed to fetch referral statistics' });
  }
});

// POST /api/referrals/generate-course-code - Generate referral code for specific course
router.post('/generate-course-code', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { course_id } = req.body;

    if (!course_id) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    // Verify course exists
    const course = await db.select().from(courses).where(eq(courses.id, course_id)).limit(1);
    if (!course.length) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Generate course-specific referral code using database function
    const result = await db.execute(
      sql`SELECT generate_course_referral_code(${userId}, ${course_id}) as referral_code`
    );

    const referralCode = result.rows[0]?.referral_code;
    
    if (!referralCode) {
      return res.status(500).json({ error: 'Failed to generate referral code' });
    }

    res.json({ 
      referral_code: referralCode,
      course_title: course[0].title,
      share_url: `${req.protocol}://${req.get('host')}/course/${course_id}?ref=${referralCode}`
    });
  } catch (error) {
    console.error('Error generating course referral code:', error);
    res.status(500).json({ error: 'Failed to generate referral code' });
  }
});

// GET /api/referrals/my-codes - Get all user's referral codes
router.get('/my-codes', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get user's general referral code
    const user = await db.select({
      referral_code: users.referral_code
    }).from(users).where(eq(users.id, userId)).limit(1);

    // Get course-specific referral codes
    const courseReferralCodes = await db.select({
      id: course_referral_codes.id,
      course_id: course_referral_codes.course_id,
      referral_code: course_referral_codes.referral_code,
      course_title: courses.title,
      course_price: courses.price,
      created_at: course_referral_codes.created_at
    })
    .from(course_referral_codes)
    .leftJoin(courses, eq(course_referral_codes.course_id, courses.id))
    .where(eq(course_referral_codes.user_id, userId))
    .orderBy(desc(course_referral_codes.created_at));

    res.json({
      general_referral_code: user[0]?.referral_code,
      course_referral_codes: courseReferralCodes
    });
  } catch (error) {
    console.error('Error fetching referral codes:', error);
    res.status(500).json({ error: 'Failed to fetch referral codes' });
  }
});

// POST /api/referrals/validate-code - Validate a referral code
router.post('/validate-code', async (req, res) => {
  try {
    const { referral_code } = req.body;

    if (!referral_code) {
      return res.status(400).json({ error: 'Referral code is required' });
    }

    // Check if it's a general referral code
    const userReferral = await db.select({
      id: users.id,
      name: users.name,
      referral_code: users.referral_code
    }).from(users).where(eq(users.referral_code, referral_code)).limit(1);

    if (userReferral.length > 0) {
      return res.json({
        valid: true,
        type: 'general',
        referrer: {
          id: userReferral[0].id,
          name: userReferral[0].name
        }
      });
    }

    // Check if it's a course-specific referral code
    const courseReferral = await db.select({
      user_id: course_referral_codes.user_id,
      course_id: course_referral_codes.course_id,
      referral_code: course_referral_codes.referral_code,
      user_name: users.name,
      course_title: courses.title,
      course_price: courses.price
    })
    .from(course_referral_codes)
    .leftJoin(users, eq(course_referral_codes.user_id, users.id))
    .leftJoin(courses, eq(course_referral_codes.course_id, courses.id))
    .where(eq(course_referral_codes.referral_code, referral_code))
    .limit(1);

    if (courseReferral.length > 0) {
      return res.json({
        valid: true,
        type: 'course',
        referrer: {
          id: courseReferral[0].user_id,
          name: courseReferral[0].user_name
        },
        course: {
          id: courseReferral[0].course_id,
          title: courseReferral[0].course_title,
          price: courseReferral[0].course_price
        }
      });
    }

    res.json({ valid: false, message: 'Invalid referral code' });
  } catch (error) {
    console.error('Error validating referral code:', error);
    res.status(500).json({ error: 'Failed to validate referral code' });
  }
});

// GET /api/referrals/leaderboard - Get top referrers (optional feature)
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const leaderboard = await db.execute(
      sql`
        SELECT 
          u.name,
          u.referral_code,
          COUNT(r.id)::INTEGER as total_referrals,
          COALESCE(SUM(r.commission_amount), 0) as total_earnings
        FROM users u
        LEFT JOIN referrals r ON u.id = r.user_id AND r.status = 'completed'
        WHERE u.referral_code IS NOT NULL
        GROUP BY u.id, u.name, u.referral_code
        HAVING COUNT(r.id) > 0
        ORDER BY total_earnings DESC, total_referrals DESC
        LIMIT ${limit}
      `
    );

    res.json({ leaderboard: leaderboard.rows });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch referral leaderboard' });
  }
});

export default router;