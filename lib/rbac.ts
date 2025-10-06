import React from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'moderator' | 'user';

export interface UserWithRole {
  id: string;
  email: string;
  role: UserRole;
}

// Role hierarchy - higher roles inherit permissions from lower roles
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 1,
  moderator: 2,
  admin: 3,
};

// Check if user has required role or higher
export const hasRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

// Get current user with role from database
export const getCurrentUserWithRole = async (): Promise<UserWithRole | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userRecord, error } = await supabase
      .from('users' as any)
      .select('id, email, is_admin')
      .eq('id', user.id)
      .single();

    if (error || !userRecord) {
      console.error('Error fetching user role:', error);
      return null;
    }

    // Map is_admin boolean to role string
    const role: UserRole = (userRecord as any).is_admin ? 'admin' : 'user';

    return {
      id: (userRecord as any).id,
      email: (userRecord as any).email,
      role: role,
    };
  } catch (error) {
    console.error('Error getting current user with role:', error);
    return null;
  }
};

// Check if current user has required role
export const checkUserRole = async (requiredRole: UserRole): Promise<boolean> => {
  const user = await getCurrentUserWithRole();
  if (!user) return false;
  return hasRole(user.role, requiredRole);
};

// Role-based guard hook for components
export const useRoleGuard = (requiredRole: UserRole) => {
  const [userRole, setUserRole] = React.useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasAccess, setHasAccess] = React.useState(false);

  React.useEffect(() => {
    const checkAccess = async () => {
      setIsLoading(true);
      const user = await getCurrentUserWithRole();
      if (user) {
        setUserRole(user.role);
        setHasAccess(hasRole(user.role, requiredRole));
      } else {
        setUserRole(null);
        setHasAccess(false);
      }
      setIsLoading(false);
    };

    checkAccess();
  }, [requiredRole]);

  return { userRole, hasAccess, isLoading };
};

// Admin-only operations guard
export const requireAdmin = async (): Promise<UserWithRole> => {
  const user = await getCurrentUserWithRole();
  if (!user || !hasRole(user.role, 'admin')) {
    throw new Error('Admin access required');
  }
  return user;
};

// Moderator-or-higher operations guard  
export const requireModerator = async (): Promise<UserWithRole> => {
  const user = await getCurrentUserWithRole();
  if (!user || !hasRole(user.role, 'moderator')) {
    throw new Error('Moderator access required');
  }
  return user;
};