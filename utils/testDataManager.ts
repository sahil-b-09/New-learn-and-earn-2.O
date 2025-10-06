import { supabase } from '@/integrations/supabase/client';

// Test data manager for comprehensive testing
export class TestDataManager {
  
  // Check current state of the database
  static async getDatabaseStatus() {
    try {
      console.log('🔍 Checking database status...');
      
      // Check courses
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, price, is_active, created_at')
        .order('created_at', { ascending: false });

      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        throw coursesError;
      }

      // Check users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role, created_at')
        .limit(10)
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      // Check current user
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Error getting current user:', authError);
      }

      const status = {
        courses: {
          count: courses?.length || 0,
          data: courses || []
        },
        users: {
          count: users?.length || 0,
          data: users || []
        },
        currentUser: currentUser || null,
        isInitialized: (courses?.length || 0) > 0,
        timestamp: new Date().toISOString()
      };

      console.log('📊 Database Status:', status);
      return status;
    } catch (error) {
      console.error('Error checking database status:', error);
      throw error;
    }
  }

  // Create test courses
  static async createTestCourses() {
    try {
      console.log('🎯 Creating test courses...');
      
      const testCourses = [
        {
          title: 'Test Course 1: AI Fundamentals',
          description: 'Introduction to Artificial Intelligence concepts and applications',
          price: 599.00,
          referral_reward: 299.00,
          pdf_url: null,
          is_active: true
        },
        {
          title: 'Test Course 2: Web Development',
          description: 'Complete guide to modern web development',
          price: 799.00,
          referral_reward: 399.00,
          pdf_url: null,
          is_active: true
        },
        {
          title: 'Test Course 3: Data Science',
          description: 'Learn data analysis and machine learning',
          price: 999.00,
          referral_reward: 499.00,
          pdf_url: null,
          is_active: true
        }
      ];

      const { data: createdCourses, error: insertError } = await supabase
        .from('courses')
        .insert(testCourses)
        .select();

      if (insertError) {
        console.error('Error creating test courses:', insertError);
        throw insertError;
      }

      console.log('✅ Created test courses:', createdCourses?.length);
      return {
        success: true,
        createdCourses: createdCourses || [],
        count: createdCourses?.length || 0
      };
    } catch (error) {
      console.error('Error creating test courses:', error);
      throw error;
    }
  }

  // Verify courses exist and match expected structure
  static async verifyCourses() {
    try {
      console.log('🔎 Verifying courses...');
      
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*');

      if (error) {
        console.error('Error fetching courses for verification:', error);
        throw error;
      }

      if (!courses || courses.length === 0) {
        console.log('❌ No courses found');
        return { success: false, message: 'No courses found' };
      }

      console.log('✅ Found courses:', courses.length);
      
      // Verify course structure
      const requiredFields = ['id', 'title', 'description', 'price', 'is_active'];
      const validCourses = courses.filter(course => 
        requiredFields.every(field => course.hasOwnProperty(field))
      );

      console.log('✅ Valid courses:', validCourses.length);
      
      return {
        success: true,
        totalCourses: courses.length,
        validCourses: validCourses.length,
        courses: courses.slice(0, 5) // Return first 5 for display
      };
    } catch (error) {
      console.error('Error verifying courses:', error);
      throw error;
    }
  }

  // Test admin status
  static async testAdminStatus() {
    try {
      console.log('👤 Testing admin status...');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log('❌ Not authenticated');
        return { isAuthenticated: false, isAdmin: false };
      }

      console.log('✅ User authenticated:', user.id);

      // Check if user is admin using RPC function
      const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin_user');
      
      if (adminError) {
        console.error('Error checking admin status:', adminError);
      }

      console.log('👑 Admin status:', isAdmin);
      
      return {
        isAuthenticated: true,
        isAdmin: isAdmin || false,
        userId: user.id,
        userEmail: user.email
      };
    } catch (error) {
      console.error('Error testing admin status:', error);
      throw error;
    }
  }

  // Run comprehensive test
  static async runComprehensiveTest() {
    try {
      console.log('🚀 Running comprehensive test...');
      
      const results = {
        timestamp: new Date().toISOString(),
        adminStatus: await this.testAdminStatus(),
        initialStatus: await this.getDatabaseStatus(),
        courseCreation: null as any,
        verification: null as any,
        finalStatus: null as any
      };

      // Only create courses if none exist
      if (results.initialStatus.courses.count === 0) {
        console.log('📝 No courses found, creating test courses...');
        results.courseCreation = await this.createTestCourses();
      } else {
        console.log('📚 Courses already exist, skipping creation');
        results.courseCreation = { success: true, message: 'Courses already exist', count: results.initialStatus.courses.count };
      }

      // Verify courses
      results.verification = await this.verifyCourses();
      
      // Get final status
      results.finalStatus = await this.getDatabaseStatus();

      console.log('📋 Comprehensive test results:', results);
      return results;
    } catch (error) {
      console.error('Error in comprehensive test:', error);
      throw error;
    }
  }

  // Clear all test data (use with caution)
  static async clearTestData() {
    try {
      console.log('🗑️ Clearing test data (courses only)...');
      
      // Only delete courses that start with "Test Course"
      const { data: deletedCourses, error } = await supabase
        .from('courses')
        .delete()
        .like('title', 'Test Course%')
        .select();

      if (error) {
        console.error('Error clearing test data:', error);
        throw error;
      }

      console.log('✅ Cleared test courses:', deletedCourses?.length || 0);
      return { success: true, deletedCount: deletedCourses?.length || 0 };
    } catch (error) {
      console.error('Error clearing test data:', error);
      throw error;
    }
  }
}

// Export individual functions for convenience
export const {
  getDatabaseStatus,
  createTestCourses,
  verifyCourses,
  testAdminStatus,
  runComprehensiveTest,
  clearTestData
} = TestDataManager;