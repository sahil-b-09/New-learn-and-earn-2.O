import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Server-side Supabase client with service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'moderator' | 'user' | 'influencer';
  };
}

// Verify JWT token and get user info
export const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth failed: Missing or invalid authorization header');
      return res.status(401).json({ error: 'Missing or invalid authorization header', code: 'MISSING_AUTH_HEADER' });
    }

    const token = authHeader.substring(7);
    console.log('Auth attempt with token:', token.substring(0, 10) + '...');
    
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.log('Auth failed: Token verification failed', authError?.message || 'No user returned');
      return res.status(401).json({ error: 'Invalid or expired token', code: 'TOKEN_INVALID' });
    }

    console.log('Token verified for user:', user.id, user.email);

    // Get user role from database
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, is_admin')
      .eq('id', user.id)
      .single();

    console.log('User lookup result:', { userRecord, userError: userError?.message });

    if (userError || !userRecord) {
      // Try finding by email as fallback
      console.log('Trying fallback lookup by email:', user.email);
      const { data: userByEmail, error: emailError } = await supabaseAdmin
        .from('users')
        .select('id, email, is_admin')
        .eq('email', user.email)
        .single();

      console.log('Email lookup result:', { userByEmail, emailError: emailError?.message });

      if (emailError || !userByEmail) {
        // User doesn't exist in database - create them automatically
        console.log('User not found in database, creating new user record:', user.email);
        
        // Check if this user should be admin using the is_admin_user RPC function
        const { data: isAdminResult, error: rpcError } = await supabaseAdmin
          .rpc('is_admin_user', { user_email: user.email });
        
        console.log('Admin check result:', { isAdminResult, rpcError: rpcError?.message });
        
        const userRole = isAdminResult ? 'admin' : 'user';
        
        // Create new user record
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            id: user.id,
            email: user.email || '',
            name: (user.email || '').split('@')[0], // Use email prefix as name
            is_admin: isAdminResult || false
          })
          .select('id, email, is_admin')
          .single();

        if (createError || !newUser) {
          console.log('Auth failed: Could not create user record', createError?.message);
          return res.status(500).json({ error: 'Could not create user record', code: 'USER_CREATE_FAILED' });
        }

        console.log('Successfully created user record:', newUser);
        
        req.user = {
          id: newUser.id,
          email: newUser.email,
          role: newUser.is_admin ? 'admin' : 'user'
        };
      } else {
        // Use email lookup result
        req.user = {
          id: userByEmail.id,
          email: userByEmail.email,
          role: userByEmail.is_admin ? 'admin' : 'user'
        };
      }
    } else {
      req.user = {
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.is_admin ? 'admin' : 'user'
      };
    }

    console.log('Auth successful for user:', req.user.email, 'Role:', req.user.role);
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed', code: 'SERVER_ERROR' });
  }
};

// Require admin role
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Require moderator or admin role
export const requireModerator = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'moderator')) {
    return res.status(403).json({ error: 'Moderator access required' });
  }
  next();
};

// Require authenticated user
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};