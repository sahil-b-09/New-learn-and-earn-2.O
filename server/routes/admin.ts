import { Router } from 'express';
import { authenticateUser, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Apply authentication middleware to all admin routes
router.use(authenticateUser);
router.use(requireAdmin);

// Marketing Display Data Routes (Admin Only)
router.get('/marketing-display-data', async (req: AuthenticatedRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('marketing_display_data')
      .select(`
        *,
        users!marketing_display_data_user_id_fkey (name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error('Error fetching marketing display data:', error);
    res.status(500).json({ error: 'Failed to fetch marketing display data' });
  }
});

router.post('/marketing-display-data', async (req: AuthenticatedRequest, res) => {
  try {
    const { user_id, display_earnings, display_referrals, display_title, is_featured, show_on_landing } = req.body;
    
    const payload = {
      user_id,
      display_earnings: parseFloat(display_earnings),
      display_referrals: parseInt(display_referrals),
      display_title,
      is_featured: Boolean(is_featured),
      show_on_landing: Boolean(show_on_landing),
      updated_by_admin: req.user!.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('marketing_display_data')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error('Error creating marketing display data:', error);
    res.status(500).json({ error: 'Failed to create marketing display data' });
  }
});

router.put('/marketing-display-data/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { user_id, display_earnings, display_referrals, display_title, is_featured, show_on_landing } = req.body;
    
    const payload = {
      user_id,
      display_earnings: parseFloat(display_earnings),
      display_referrals: parseInt(display_referrals),
      display_title,
      is_featured: Boolean(is_featured),
      show_on_landing: Boolean(show_on_landing),
      updated_by_admin: req.user!.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('marketing_display_data')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error('Error updating marketing display data:', error);
    res.status(500).json({ error: 'Failed to update marketing display data' });
  }
});

router.delete('/marketing-display-data/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('marketing_display_data')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting marketing display data:', error);
    res.status(500).json({ error: 'Failed to delete marketing display data' });
  }
});

// Users list for admin (for dropdowns etc.)
router.get('/users', async (req: AuthenticatedRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, is_admin')
      .order('name');

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Test Data Initialization Routes
router.post('/initialize-test-data', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('Manual initialization triggered by admin:', req.user?.id);
    
    // Default courses to create if none exist
    const defaultCourses = [
      {
        title: 'AI Tools Course',
        description: 'Best AI tools for students',
        price: '500.00',
        referral_reward: '250.00',
        pdf_url: null,
        is_active: true
      },
      {
        title: 'Web Development Basics',
        description: 'Learn HTML, CSS, and JavaScript fundamentals',
        price: '750.00',
        referral_reward: '375.00',
        pdf_url: null,
        is_active: true
      },
      {
        title: 'Digital Marketing Course',
        description: 'Master social media and online marketing strategies',
        price: '600.00',
        referral_reward: '300.00',
        pdf_url: null,
        is_active: true
      }
    ];

    // Check existing courses
    const { data: existingCourses, error: coursesError } = await supabaseAdmin
      .from('courses')
      .select('id, title')
      .limit(10);

    if (coursesError) {
      console.error('Error checking existing courses:', coursesError);
      return res.status(500).json({ error: 'Failed to check existing courses' });
    }

    let createdCourses: any[] = [];
    
    if (!existingCourses || existingCourses.length === 0) {
      console.log('No courses found, creating default courses...');
      
      // Create default courses
      const { data: newCourses, error: insertError } = await supabaseAdmin
        .from('courses')
        .insert(defaultCourses)
        .select();

      if (insertError) {
        console.error('Error creating default courses:', insertError);
        return res.status(500).json({ error: 'Failed to create default courses' });
      }

      createdCourses = newCourses || [];
      console.log('Created courses:', createdCourses.length);
    } else {
      console.log('Courses already exist:', existingCourses.length);
    }

    // Return success response
    res.json({ 
      success: true,
      message: 'Test data initialization completed',
      existingCourses: existingCourses?.length || 0,
      createdCourses: createdCourses.length,
      courses: existingCourses || []
    });

  } catch (error) {
    console.error('Error in test data initialization:', error);
    res.status(500).json({ error: 'Failed to initialize test data' });
  }
});

// Get initialization status
router.get('/initialization-status', async (req: AuthenticatedRequest, res) => {
  try {
    // Check courses
    const { data: courses, error: coursesError } = await supabaseAdmin
      .from('courses')
      .select('id, title, price, is_active');

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      return res.status(500).json({ error: 'Failed to fetch courses' });
    }

    // Check users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, is_admin')
      .limit(10);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    res.json({
      courses: {
        count: courses?.length || 0,
        data: courses || []
      },
      users: {
        count: users?.length || 0,
        data: users || []
      },
      isInitialized: (courses?.length || 0) > 0
    });

  } catch (error) {
    console.error('Error checking initialization status:', error);
    res.status(500).json({ error: 'Failed to check initialization status' });
  }
});

// Create comprehensive test data
router.post('/create-test-data', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('Creating comprehensive test data...');
    
    // Create additional test courses
    const testCourses = [
      {
        title: 'Python Programming',
        description: 'Learn Python from scratch to advanced level',
        price: '800.00',
        referral_reward: '400.00',
        pdf_url: null,
        is_active: true
      },
      {
        title: 'Data Science Fundamentals',
        description: 'Introduction to data analysis and machine learning',
        price: '1200.00',
        referral_reward: '600.00',
        pdf_url: null,
        is_active: true
      }
    ];

    const { data: newCourses, error: coursesError } = await supabaseAdmin
      .from('courses')
      .insert(testCourses)
      .select();

    if (coursesError) {
      console.error('Error creating test courses:', coursesError);
      return res.status(500).json({ error: 'Failed to create test courses' });
    }

    res.json({
      success: true,
      message: 'Comprehensive test data created',
      createdCourses: newCourses?.length || 0,
      courses: newCourses || []
    });

  } catch (error) {
    console.error('Error creating comprehensive test data:', error);
    res.status(500).json({ error: 'Failed to create comprehensive test data' });
  }
});

// Secure Course Access Management (Server-side Identity Verification)
router.post('/grant-course-access', async (req: AuthenticatedRequest, res) => {
  try {
    const { user_id, course_id } = req.body;
    const admin_user_id = req.user!.id; // Server-verified admin ID from JWT
    
    // Validate required fields
    if (!user_id || !course_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id and course_id' 
      });
    }

    // Verify course exists and is active
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id, title, price')
      .eq('id', course_id)
      .eq('is_active', true)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found or inactive' });
    }

    // Verify target user exists
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('id', user_id)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has access (idempotent operation)
    const { data: existingPurchase } = await supabaseAdmin
      .from('purchases')
      .select('id')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .maybeSingle();

    let purchase_id: string;

    if (existingPurchase) {
      // Update existing purchase to completed status
      const { data: updatedPurchase, error: updateError } = await supabaseAdmin
        .from('purchases')
        .update({
          payment_status: 'completed',
          granted_by_admin: admin_user_id,
          purchased_at: new Date().toISOString()
        })
        .eq('id', existingPurchase.id)
        .select('id')
        .single();

      if (updateError) {
        throw new Error(`Failed to update purchase: ${updateError.message}`);
      }
      
      purchase_id = updatedPurchase.id;
    } else {
      // Create new purchase record
      const { data: newPurchase, error: purchaseError } = await supabaseAdmin
        .from('purchases')
        .insert({
          user_id,
          course_id,
          payment_status: 'completed',
          amount: 0, // Admin grants are free
          granted_by_admin: admin_user_id,
        })
        .select('id')
        .single();

      if (purchaseError) {
        throw new Error(`Failed to create purchase: ${purchaseError.message}`);
      }

      purchase_id = newPurchase.id;
    }

    // Create audit log entry
    const { error: auditError } = await supabaseAdmin
      .from('admin_audit_logs')
      .insert({
        admin_user_id,
        action_type: 'grant_course_access',
        target_table: 'purchases',
        target_id: purchase_id,
        details: {
          user_id,
          course_id,
          course_title: course.title,
          target_user_email: targetUser.email
        }
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the main operation for audit log issues
    }

    res.json({
      success: true,
      message: 'Course access granted successfully',
      purchase_id,
      data: {
        user: targetUser,
        course: course,
        granted_by: req.user!.email
      }
    });

  } catch (error) {
    console.error('Error granting course access:', error);
    res.status(500).json({ 
      error: 'Failed to grant course access', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Secure User Search for Admin (Server-side Identity Verification)
router.get('/search-users', async (req: AuthenticatedRequest, res) => {
  try {
    const { q: searchQuery = '', limit = 10, offset = 0 } = req.query;
    
    let query = supabaseAdmin
      .from('users')
      .select('id, email, name, is_admin')
      .order('name');

    // Apply search filter if provided
    if (searchQuery && typeof searchQuery === 'string') {
      query = query.or(`email.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`);
    }

    // Apply pagination
    query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data: users, error } = await query;

    if (error) {
      throw new Error(`User search failed: ${error.message}`);
    }

    res.json({ 
      data: users || [],
      total: users?.length || 0,
      search_query: searchQuery,
      limit: Number(limit),
      offset: Number(offset)
    });

  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ 
      error: 'User search failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;