
import { supabase } from '@/integrations/supabase/client';
import { Module, Lesson, CourseWithProgress } from '@/types/course';

export type { CourseWithProgress } from '@/types/course';

// Optimized cache for course content
const courseCache = new Map<string, { data: CourseWithProgress; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCourseWithContent(courseId: string): Promise<CourseWithProgress | null> {
  try {
    console.log('Fetching course with content for courseId:', courseId);
    
    // Check cache first
    const cached = courseCache.get(courseId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached course data');
      return cached.data;
    }

    // Optimized single query with joins
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        modules:course_modules(
          *,
          lessons (*)
        )
      `)
      .eq('id', courseId)
      .single();

    if (courseError) {
      console.error('Error fetching course:', courseError);
      return null;
    }

    // Get user progress in a single query
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .select('module_id, lesson_id, completed')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
      .eq('completed', true);

    if (progressError) {
      console.error('Error fetching progress:', progressError);
    }

    // Calculate progress efficiently
    const modules = (courseData.modules || []) as Module[];
    const completedModuleIds = new Set(progressData?.map(p => p.module_id).filter(Boolean) || []);
    
    const totalModules = modules.length;
    const completedModules = completedModuleIds.size;
    const progress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    const result: CourseWithProgress = {
      id: courseData.id,
      title: courseData.title,
      description: courseData.description,
      price: courseData.price,
      modules,
      totalModules,
      completedModules,
      progress
    };

    // Cache the result
    courseCache.set(courseId, { data: result, timestamp: Date.now() });

    console.log('Successfully fetched course with content:', result);
    return result;
  } catch (error) {
    console.error('Exception fetching course content:', error);
    return null;
  }
}

export async function getUserCourses(): Promise<CourseWithProgress[]> {
  try {
    console.log('Fetching user courses...');
    
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      console.error('No authenticated user found');
      return [];
    }

    // Optimized query with joins
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select(`
        course_id,
        courses (
          *,
          modules:course_modules(
            *,
            lessons (*)
          )
        )
      `)
      .eq('user_id', userId)
      .eq('payment_status', 'completed');

    if (purchasesError) {
      console.error('Error fetching purchases:', purchasesError);
      return [];
    }

    if (!purchases || purchases.length === 0) {
      console.log('No purchased courses found');
      return [];
    }

    // Get user progress for all courses in one query
    const { data: progressData } = await supabase
      .from('user_progress')
      .select('module_id, lesson_id, completed')
      .eq('user_id', userId)
      .eq('completed', true);

    const completedModuleIds = new Set(progressData?.map(p => p.module_id).filter(Boolean) || []);

    // Process courses with progress calculation
    const validCourses = purchases
      .filter(purchase => purchase.courses)
      .map(purchase => {
        const course = purchase.courses;
        const modules = (course.modules || []) as Module[];
        
        const totalModules = modules.length;
        const courseCompletedModules = modules.filter(m => completedModuleIds.has(m.id)).length;
        const progress = totalModules > 0 ? Math.round((courseCompletedModules / totalModules) * 100) : 0;

        return {
          id: course.id,
          title: course.title,
          description: course.description,
          price: course.price,
          modules,
          totalModules,
          completedModules: courseCompletedModules,
          progress
        } as CourseWithProgress;
      });
    
    console.log('Successfully fetched user courses:', validCourses.length);
    return validCourses;
  } catch (error) {
    console.error('Exception fetching user courses:', error);
    return [];
  }
}

export async function hasUserAccessToCourse(courseId: string): Promise<boolean> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return false;

    const { data, error } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('payment_status', 'completed')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking course access:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Exception checking course access:', error);
    return false;
  }
}

// Clear cache when needed
export function clearCourseCache() {
  courseCache.clear();
}
