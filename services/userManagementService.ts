
import { supabase } from "@/integrations/supabase/client";

export interface User {
  id: string;
  name: string;
  email: string;
  joined_at: string;
  is_admin: boolean;
  is_suspended: boolean;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  operation_type: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, any>;
  created_at: string;
}

// Get all users (admin only)
export async function getAllUsers(): Promise<User[]> {
  try {
    console.log('Fetching all users...');
    
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      return [];
    }

    console.log('Successfully fetched users:', data?.length || 0);
    return data as User[];
  } catch (error) {
    console.error("Exception fetching users:", error);
    return [];
  }
}

// Get a single user by ID
export async function getUserById(userId: string): Promise<User | null> {
  try {
    if (!userId) return null;

    console.log(`Fetching user ${userId}...`);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching user ${userId}:`, error);
      return null;
    }

    console.log('Successfully fetched user:', data?.id);
    return data as User;
  } catch (error) {
    console.error(`Exception fetching user ${userId}:`, error);
    return null;
  }
}

// Get current user details
export async function getCurrentUser(): Promise<User | null> {
  try {
    // First get the authenticated user ID
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return null;

    // Use the userId to get the user details
    return await getUserById(authData.user.id);
  } catch (error) {
    console.error("Exception fetching current user:", error);
    return null;
  }
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId);

    if (error) {
      console.error("Error updating user profile:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception updating user profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Grant admin privileges to a user
export async function grantAdminPrivileges(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.rpc("grant_admin_privileges", {
      admin_email: email,
    });

    if (error) {
      console.error("Error granting admin privileges:", error);
      return { success: false, message: error.message };
    }
    
    const response = data as any;
    return { 
      success: response?.success || true, 
      message: response?.message || "Admin privileges granted successfully" 
    };
  } catch (error) {
    console.error("Exception granting admin privileges:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message };
  }
}

// Revoke admin privileges from a user
export async function revokeAdminPrivileges(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.rpc("revoke_admin_privileges", {
      admin_email: email,
    });

    if (error) {
      console.error("Error revoking admin privileges:", error);
      return { success: false, message: error.message };
    }
    
    const response = data as any;
    return { 
      success: response?.success || true, 
      message: response?.message || "Admin privileges revoked successfully" 
    };
  } catch (error) {
    console.error("Exception revoking admin privileges:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message };
  }
}

// Get content management logs (admin only)
export async function getContentManagementLogs(): Promise<AdminLog[]> {
  try {
    const { data, error } = await supabase
      .from("content_management_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching admin logs:", error);
      return [];
    }

    return data as AdminLog[];
  } catch (error) {
    console.error("Exception fetching admin logs:", error);
    return [];
  }
}
