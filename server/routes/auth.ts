import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validateSchema, registerSchema, loginSchema, sanitizeInput } from '../middleware/validation';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many authentication attempts, please try again later' }
});

// User Registration
router.post('/register', authLimiter, validateSchema(registerSchema), async (req, res) => {
  try {
    const { email, password, name, phone, referral_code } = sanitizeInput(req.body);

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate referral code for new user
    const userReferralCode = `REF${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone }
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // Create user record in database
    // TEMPORARY: Omit role to avoid schema cache issue - database default will set it to 'user'
    const userData = {
      id: authUser.user.id,
      email,
      name,
      phone,
      referral_code: userReferralCode,
      referred_by: referral_code || null,
      // role: 'user', // Temporarily commented out due to PostgREST schema cache issue
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newUser, error: dbError } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (dbError) {
      // Cleanup auth user if database insert fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      console.error('Database insert error:', dbError);
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    // Create wallet for new user
    await supabaseAdmin
      .from('wallet')
      .insert({
        user_id: newUser.id,
        balance: '0.00',
        total_earned: '0.00',
        total_withdrawn: '0.00'
      });

    // Handle referral if provided
    if (referral_code) {
      const { data: referrer } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('referral_code', referral_code)
        .single();

      if (referrer) {
        // Create referral record
        await supabaseAdmin
          .from('referrals')
          .insert({
            user_id: referrer.id,
            referred_user_id: newUser.id,
            referral_code,
            status: 'pending'
          });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        referral_code: newUser.referral_code
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// User Login
router.post('/login', authLimiter, validateSchema(loginSchema), async (req, res) => {
  try {
    const { email, password } = sanitizeInput(req.body);

    // Get user from database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is suspended
    if (user.is_suspended) {
      return res.status(403).json({ error: 'Account has been suspended' });
    }

    // Verify password using Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Log user activity
    await supabaseAdmin
      .from('user_activity_logs')
      .insert({
        user_id: user.id,
        activity_type: 'login',
        details: { ip_address: req.ip, user_agent: req.get('User-Agent') }
      });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        referral_code: user.referral_code
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Get Current User Profile
router.get('/profile', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        name,
        phone,
        referral_code,
        role,
        created_at,
        last_login,
        wallet:wallet!user_id(balance, total_earned, total_withdrawn)
      `)
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update User Profile
router.put('/profile', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { name, phone } = sanitizeInput(req.body);

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: 'Failed to update profile' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        role: updatedUser.role
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Logout (invalidate token - client-side implementation)
router.post('/logout', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // Log user activity
    await supabaseAdmin
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        activity_type: 'logout',
        details: { ip_address: req.ip, user_agent: req.get('User-Agent') }
      });

    res.json({ message: 'Logout successful' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// Change Password
router.put('/change-password', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = sanitizeInput(req.body);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Verify current password
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (verifyError) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (updateError) {
      return res.status(400).json({ error: 'Failed to update password' });
    }

    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;