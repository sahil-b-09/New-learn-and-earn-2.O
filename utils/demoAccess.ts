
import { supabase } from '@/integrations/supabase/client';

export interface GrantCourseResult {
  success: boolean;
  message: string;
  purchases?: any[];
  grantedCourses?: string[];
}

interface DatabaseResponse {
  success: boolean;
  message: string;
  user_id?: string;
}

export interface BulkAccessOperation {
  userEmail: string;
  courseIds: string[];
  result?: GrantCourseResult;
}

export interface BulkAccessResult {
  success: boolean;
  message: string;
  totalUsers: number;
  successfulGrants: number;
  failedGrants: number;
  results: BulkAccessOperation[];
}

// Enhanced function to grant access to specific courses for a user
export async function grantCourseAccessToUser(userEmail: string, courseIds: string[]): Promise<GrantCourseResult> {
  try {
    console.log(`Granting access to ${userEmail} for courses:`, courseIds);
    
    if (!courseIds || courseIds.length === 0) {
      return {
        success: false,
        message: "No courses specified for access grant"
      };
    }
    
    // First, check if user exists or create them
    let userId: string;
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();
    
    if (userError && userError.code !== 'PGRST116') {
      console.error("Error checking user:", userError);
      return {
        success: false,
        message: `Error checking user: ${userError.message}`
      };
    }
    
    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user by calling auth signup first, then upsert user data
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: userEmail,
        password: Math.random().toString(36).slice(-8), // Random temporary password
      });
      
      if (signupError && signupError.message !== 'User already registered') {
        console.error("Error during signup:", signupError);
        return {
          success: false,
          message: `Failed to create user account: ${signupError.message}`
        };
      }
      
      // Get the user ID from the signup response or from existing user lookup
      userId = signupData?.user?.id || existingUser?.id;
      
      if (!userId) {
        return {
          success: false,
          message: `Could not determine user ID for ${userEmail}`
        };
      }
      
      // Upsert user data to ensure the user exists in our users table
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: userEmail,
          name: userEmail.split('@')[0] // Default name from email
        });
      
      if (upsertError) {
        console.error("Error upserting user data:", upsertError);
        return {
          success: false,
          message: `Failed to create user data: ${upsertError.message}`
        };
      }
    }
    
    // Verify courses exist and are active
    const { data: validCourses, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .in('id', courseIds)
      .eq('is_active', true);
    
    if (courseError) {
      console.error("Error validating courses:", courseError);
      return {
        success: false,
        message: `Error validating courses: ${courseError.message}`
      };
    }
    
    if (!validCourses || validCourses.length === 0) {
      return {
        success: false,
        message: "No valid active courses found for the specified IDs"
      };
    }
    
    const validCourseIds = validCourses.map(c => c.id);
    console.log("Valid courses found:", validCourses);
    
    // Check for existing purchases to avoid duplicates
    const { data: existingPurchases, error: purchaseCheckError } = await supabase
      .from('purchases')
      .select('course_id')
      .eq('user_id', userId)
      .in('course_id', validCourseIds);
    
    if (purchaseCheckError) {
      console.error("Error checking existing purchases:", purchaseCheckError);
    }
    
    const existingCourseIds = existingPurchases?.map(p => p.course_id) || [];
    const newCourseIds = validCourseIds.filter(id => !existingCourseIds.includes(id));
    
    if (newCourseIds.length === 0) {
      return {
        success: true,
        message: `User ${userEmail} already has access to all specified courses`,
        grantedCourses: validCourseIds
      };
    }
    
    // Create purchase records for new courses
    const purchaseInserts = newCourseIds.map(courseId => {
      const course = validCourses.find(c => c.id === courseId);
      return {
        user_id: userId,
        course_id: courseId,
        amount: 0, // Free access
        payment_status: 'completed',
        purchased_at: new Date().toISOString()
      };
    });
    
    const { data: newPurchases, error: insertError } = await supabase
      .from('purchases')
      .insert(purchaseInserts)
      .select('course_id');
    
    if (insertError) {
      console.error("Error creating purchase records:", insertError);
      return {
        success: false,
        message: `Failed to grant access: ${insertError.message}`
      };
    }
    
    const grantedCourseNames = validCourses
      .filter(c => newCourseIds.includes(c.id))
      .map(c => c.title);
    
    return {
      success: true,
      message: `Successfully granted access to ${newCourseIds.length} course(s) for ${userEmail}: ${grantedCourseNames.join(', ')}`,
      purchases: newPurchases,
      grantedCourses: [...existingCourseIds, ...newCourseIds]
    };
    
  } catch (error) {
    console.error("Error granting course access:", error);
    return {
      success: false,
      message: `An error occurred while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Bulk access granting for multiple users
export async function grantBulkCourseAccess(
  userEmails: string[], 
  courseIds: string[]
): Promise<BulkAccessResult> {
  try {
    console.log(`Granting bulk access to ${userEmails.length} users for ${courseIds.length} courses`);
    
    const results: BulkAccessOperation[] = [];
    let successfulGrants = 0;
    let failedGrants = 0;
    
    // Process users in parallel for better performance
    const promises = userEmails.map(async (userEmail) => {
      const result = await grantCourseAccessToUser(userEmail, courseIds);
      
      const operation: BulkAccessOperation = {
        userEmail,
        courseIds,
        result
      };
      
      if (result.success) {
        successfulGrants++;
      } else {
        failedGrants++;
      }
      
      return operation;
    });
    
    const completedOperations = await Promise.all(promises);
    results.push(...completedOperations);
    
    return {
      success: successfulGrants > 0,
      message: `Bulk access operation completed. ${successfulGrants} successful, ${failedGrants} failed out of ${userEmails.length} users.`,
      totalUsers: userEmails.length,
      successfulGrants,
      failedGrants,
      results
    };
    
  } catch (error) {
    console.error("Error in bulk access grant:", error);
    return {
      success: false,
      message: `Bulk operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      totalUsers: userEmails.length,
      successfulGrants: 0,
      failedGrants: userEmails.length,
      results: userEmails.map(userEmail => ({
        userEmail,
        courseIds,
        result: {
          success: false,
          message: "Bulk operation failed"
        }
      }))
    };
  }
}

// Function to revoke course access from a user
export async function revokeCourseAccess(userEmail: string, courseIds: string[]): Promise<GrantCourseResult> {
  try {
    console.log(`Revoking access from ${userEmail} for courses:`, courseIds);
    
    // Get user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();
    
    if (userError) {
      return {
        success: false,
        message: `User not found: ${userEmail}`
      };
    }
    
    // Delete purchase records for specified courses
    const { error: deleteError } = await supabase
      .from('purchases')
      .delete()
      .eq('user_id', user.id)
      .in('course_id', courseIds);
    
    if (deleteError) {
      console.error("Error revoking access:", deleteError);
      return {
        success: false,
        message: `Failed to revoke access: ${deleteError.message}`
      };
    }
    
    return {
      success: true,
      message: `Successfully revoked access to ${courseIds.length} course(s) for ${userEmail}`
    };
    
  } catch (error) {
    console.error("Error revoking course access:", error);
    return {
      success: false,
      message: `An error occurred while revoking access: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Get user's course access status
export async function getUserCourseAccess(userEmail: string): Promise<{
  success: boolean;
  message: string;
  courses?: Array<{id: string; title: string; purchased_at: string}>;
}> {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();
    
    if (userError) {
      return {
        success: false,
        message: `User not found: ${userEmail}`
      };
    }
    
    const { data: purchases, error: purchaseError } = await supabase
      .from('purchases')
      .select(`
        course_id,
        purchased_at,
        courses(id, title)
      `)
      .eq('user_id', user.id)
      .eq('payment_status', 'completed');
    
    if (purchaseError) {
      return {
        success: false,
        message: `Error fetching course access: ${purchaseError.message}`
      };
    }
    
    const courses = purchases?.map(p => ({
      id: p.course_id,
      title: (p.courses as any)?.title || 'Unknown Course',
      purchased_at: p.purchased_at
    })) || [];
    
    return {
      success: true,
      message: `Found ${courses.length} accessible course(s) for ${userEmail}`,
      courses
    };
    
  } catch (error) {
    console.error("Error checking user course access:", error);
    return {
      success: false,
      message: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
