import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateUser, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { validateSchema, influencerDataSchema, sanitizeInput } from '../middleware/validation';
import rateLimit from 'express-rate-limit';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Rate limiting for influencer endpoints
const influencerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' }
});

// Add influencer role to user
router.post('/convert-user/:userId', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user!.id;

    // Update user role to influencer
    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update({ 
        role: 'influencer',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('User role update error:', error);
      return res.status(500).json({ error: 'Failed to convert user to influencer' });
    }

    // Create initial marketing display data
    const displayData = {
      user_id: userId,
      display_earnings: 0,
      display_referrals: 0,
      display_title: 'New Influencer',
      is_featured: false,
      show_on_landing: false,
      updated_by_admin: adminId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await supabaseAdmin
      .from('marketing_display_data')
      .insert(displayData);

    // Log the action
    await supabaseAdmin
      .from('content_management_logs')
      .insert({
        admin_id: adminId,
        resource_type: 'user',
        resource_id: userId,
        operation_type: 'role_change',
        details: { 
          old_role: 'user', 
          new_role: 'influencer' 
        }
      });

    res.json({
      message: 'User converted to influencer successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });

  } catch (error) {
    console.error('Influencer conversion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get influencer dashboard data (fake data for marketing)
router.get('/dashboard', authenticateUser, influencerLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // Check if user is an influencer
    if (req.user!.role !== 'influencer') {
      return res.status(403).json({ error: 'Access denied. Influencer role required.' });
    }

    // Get marketing display data
    const { data: displayData, error } = await supabaseAdmin
      .from('marketing_display_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Create default display data if none exists
      const defaultData = {
        user_id: userId,
        display_earnings: 1250.50,
        display_referrals: 8,
        display_title: 'Rising Star',
        is_featured: false,
        show_on_landing: false,
        updated_by_admin: userId, // Self-created initially
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newDisplayData } = await supabaseAdmin
        .from('marketing_display_data')
        .insert(defaultData)
        .select()
        .single();

      return res.json({
        display_data: newDisplayData,
        fake_transactions: generateFakeTransactions(newDisplayData?.display_earnings || 1250.50),
        fake_referrals: generateFakeReferrals(newDisplayData?.display_referrals || 8)
      });
    }

    // Generate realistic fake transaction history
    const fakeTransactions = generateFakeTransactions(parseFloat(displayData.display_earnings.toString()));
    const fakeReferrals = generateFakeReferrals(displayData.display_referrals);

    res.json({
      display_data: displayData,
      fake_transactions: fakeTransactions,
      fake_referrals: fakeReferrals,
      disclaimer: "This is demonstration data for marketing purposes only."
    });

  } catch (error) {
    console.error('Influencer dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get all influencers
router.get('/admin/list', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { data: influencers, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        email,
        created_at,
        marketing_display_data:marketing_display_data!user_id(
          display_earnings,
          display_referrals,
          display_title,
          is_featured,
          show_on_landing,
          updated_at
        )
      `)
      .eq('role', 'influencer')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Influencers fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch influencers' });
    }

    res.json({ influencers: influencers || [] });

  } catch (error) {
    console.error('Admin influencers list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Update influencer display data
router.put('/admin/:userId/display-data', authenticateUser, requireAdmin, validateSchema(influencerDataSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user!.id;
    const updateData = sanitizeInput(req.body);

    // Verify user is an influencer
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role, name')
      .eq('id', userId)
      .single();

    if (!user || user.role !== 'influencer') {
      return res.status(404).json({ error: 'Influencer not found' });
    }

    // Update marketing display data
    const { data: updatedData, error } = await supabaseAdmin
      .from('marketing_display_data')
      .update({
        ...updateData,
        updated_by_admin: adminId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Display data update error:', error);
      return res.status(500).json({ error: 'Failed to update display data' });
    }

    // Log the action
    await supabaseAdmin
      .from('content_management_logs')
      .insert({
        admin_id: adminId,
        resource_type: 'marketing_display_data',
        resource_id: updatedData.id,
        operation_type: 'update',
        details: updateData
      });

    res.json({
      message: 'Display data updated successfully',
      display_data: updatedData
    });

  } catch (error) {
    console.error('Display data update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Bulk update multiple influencers
router.post('/admin/bulk-update', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { user_ids, update_data } = sanitizeInput(req.body);
    const adminId = req.user!.id;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'Invalid user IDs provided' });
    }

    const updatePayload = {
      ...update_data,
      updated_by_admin: adminId,
      updated_at: new Date().toISOString()
    };

    // Update all specified influencers
    const { data: updatedRecords, error } = await supabaseAdmin
      .from('marketing_display_data')
      .update(updatePayload)
      .in('user_id', user_ids)
      .select();

    if (error) {
      console.error('Bulk update error:', error);
      return res.status(500).json({ error: 'Failed to bulk update influencers' });
    }

    // Log the bulk action
    await supabaseAdmin
      .from('content_management_logs')
      .insert({
        admin_id: adminId,
        resource_type: 'marketing_display_data',
        resource_id: null,
        operation_type: 'bulk_update',
        details: { 
          affected_users: user_ids,
          update_data 
        }
      });

    res.json({
      message: `Successfully updated ${updatedRecords?.length || 0} influencers`,
      updated_count: updatedRecords?.length || 0
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get preview of influencer dashboard
router.get('/admin/:userId/preview', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;

    // Get marketing display data
    const { data: displayData, error } = await supabaseAdmin
      .from('marketing_display_data')
      .select(`
        *,
        user:users!user_id(name, email)
      `)
      .eq('user_id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Influencer display data not found' });
    }

    // Generate preview data
    const fakeTransactions = generateFakeTransactions(parseFloat(displayData.display_earnings.toString()));
    const fakeReferrals = generateFakeReferrals(displayData.display_referrals);

    res.json({
      preview: {
        user: displayData.user,
        display_data: displayData,
        fake_transactions: fakeTransactions,
        fake_referrals: fakeReferrals
      }
    });

  } catch (error) {
    console.error('Preview generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to generate fake transactions
function generateFakeTransactions(totalEarnings: number) {
  const transactions = [];
  const numTransactions = Math.min(Math.max(Math.floor(totalEarnings / 100), 3), 15);
  
  for (let i = 0; i < numTransactions; i++) {
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const amount = Math.round((totalEarnings / numTransactions) * (0.7 + Math.random() * 0.6) * 100) / 100;
    
    transactions.push({
      id: `fake_${Date.now()}_${i}`,
      amount: amount,
      type: 'commission',
      description: `Referral commission - ${getCourseNames()[Math.floor(Math.random() * getCourseNames().length)]}`,
      date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed'
    });
  }
  
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Helper function to generate fake referrals
function generateFakeReferrals(totalReferrals: number) {
  const referrals = [];
  const courseNames = getCourseNames();
  
  for (let i = 0; i < totalReferrals; i++) {
    const daysAgo = Math.floor(Math.random() * 60) + 1;
    const commission = Math.round((50 + Math.random() * 200) * 100) / 100;
    
    referrals.push({
      id: `fake_ref_${Date.now()}_${i}`,
      referred_user: `User ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 999)}`,
      course_name: courseNames[Math.floor(Math.random() * courseNames.length)],
      commission: commission,
      date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed'
    });
  }
  
  return referrals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Helper function to get course names for fake data
function getCourseNames() {
  return [
    'AI Tools Mastery',
    'Digital Marketing Pro',
    'Web Development Bootcamp',
    'Python Programming',
    'Data Science Fundamentals',
    'Social Media Strategy',
    'E-commerce Excellence',
    'Content Creation Mastery',
    'SEO Optimization',
    'Graphic Design Basics'
  ];
}

export default router;