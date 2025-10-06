
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Flag to prevent multiple initializations
let isInitialized = false;

// Default courses - only create if database is completely empty
const defaultCourses = [
  {
    title: 'AI Tools Course',
    description: 'Best AI tools for students',
    price: 500,
    referral_reward: 250,
    pdf_url: null,
    is_active: true
  }
];

export const initializeAppData = async () => {
  // Prevent multiple calls
  if (isInitialized) {
    console.log('App data already initialized, skipping...');
    return;
  }

  try {
    console.log('Checking if app data initialization is needed...');
    
    // Check if any courses exist (don't auto-create if admin has courses)
    const { data: existingCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id')
      .limit(1);

    if (coursesError) {
      console.error('Error checking existing courses:', coursesError);
      return;
    }

    // Only initialize if NO courses exist at all
    if (existingCourses && existingCourses.length > 0) {
      console.log('Courses already exist, skipping initialization');
      isInitialized = true;
      return;
    }

    console.log('No courses found, creating default course...');
    
    // Create only essential default course
    const { error: insertError } = await supabase
      .from('courses')
      .insert(defaultCourses);

    if (insertError) {
      console.error('Error creating default courses:', insertError);
      return;
    }

    console.log('Default course created successfully');
    isInitialized = true;
    
  } catch (error) {
    console.error('Error in app data initialization:', error);
  }
};

// Manual trigger for admin initialization
export const triggerInitialization = async () => {
  try {
    console.log('Manual initialization triggered');
    
    // Reset flag to allow re-initialization
    isInitialized = false;
    
    // Run initialization
    await initializeAppData();
    
    return { success: true };
  } catch (error) {
    console.error('Error in manual initialization:', error);
    return { success: false, error };
  }
};

// Reset initialization flag (only for development)
export const resetInitialization = () => {
  if (process.env.NODE_ENV === 'development') {
    isInitialized = false;
  }
};
