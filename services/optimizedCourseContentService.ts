
import { supabase } from '@/integrations/supabase/client';
import { Module, Lesson, CourseWithProgress } from '@/types/course';

// Cache for course data
const courseCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: CourseWithProgress;
  timestamp: number;
}

// Export the type so it can be used in other files
export type { CourseWithProgress } from '@/types/course';

// Optimized function to get course with its modules and lessons
export async function getOptimizedCourseWithContent(courseId: string): Promise<CourseWithProgress | null> {
  try {
    // Check cache first
    const cacheKey = `course_${courseId}`;
    const cached = courseCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    console.log('Fetching optimized course with content for courseId:', courseId);
    
    // Single query to get course with modules and lessons
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        modules:course_modules(
          *,
          lessons:lessons(*)
        )
      `)
      .eq('id', courseId)
      .single();

    if (courseError) {
      console.error('Error fetching course:', courseError);
      return null;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get user progress for all lessons in one query
    const allLessonIds = courseData.modules?.flatMap(module => 
      module.lessons?.map(lesson => lesson.id) || []
    ) || [];

    let progressData = null;
    if (allLessonIds.length > 0) {
      const { data } = await supabase
        .from('user_progress')
        .select('lesson_id, module_id, completed')
        .eq('user_id', user.id)
        .in('lesson_id', allLessonIds);
      
      progressData = data || [];
    }

    // Calculate progress
    const totalModules = courseData.modules?.length || 0;
    const completedModules = progressData?.filter(p => p.completed && p.module_id).length || 0;
    const progress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

    const result: CourseWithProgress = {
      id: courseData.id,
      title: courseData.title,
      description: courseData.description,
      price: courseData.price,
      modules: (courseData.modules as Module[]) || [],
      totalModules,
      completedModules,
      progress
    };

    // Cache the result with proper CacheEntry structure
    courseCache.set(cacheKey, { data: result, timestamp: Date.now() });

    console.log('Successfully fetched optimized course with content:', result);
    return result;
  } catch (error) {
    console.error('Exception fetching optimized course content:', error);
    return null;
  }
}

// Optimized function to get user's purchased courses with progress
export async function getOptimizedUserCourses(): Promise<CourseWithProgress[]> {
  try {
    console.log('Fetching optimized user courses...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return [];
    }

    // Single optimized query to get purchases with course data
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select(`
        course_id,
        courses!inner(
          id,
          title,
          description,
          price,
          modules:course_modules(
            id,
            title,
            description,
            module_order,
            lessons:lessons(id, title, lesson_order)
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('payment_status', 'completed');

    if (purchasesError) {
      console.error('Error fetching purchases:', purchasesError);
      return [];
    }

    if (!purchases || purchases.length === 0) {
      console.log('No purchased courses found');
      return [];
    }

    // Get progress for all courses at once
    const allCourseIds = purchases.map(p => p.course_id);
    const { data: progressData } = await supabase
      .from('user_progress')
      .select('module_id, completed')
      .eq('user_id', user.id);

    const progressMap = new Map(
      progressData?.map(p => [p.module_id, p.completed]) || []
    );

    // Process courses with progress
    const coursesWithContent = purchases.map(purchase => {
      const course = purchase.courses;
      const totalModules = course.modules?.length || 0;
      const completedModules = course.modules?.filter(module => 
        progressMap.get(module.id)
      ).length || 0;
      const progress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        price: course.price,
        modules: course.modules as Module[] || [],
        totalModules,
        completedModules,
        progress
      };
    });

    console.log('Successfully fetched optimized user courses:', coursesWithContent.length);
    return coursesWithContent;
  } catch (error) {
    console.error('Exception fetching optimized user courses:', error);
    return [];
  }
}

// Optimized function to check if user has access to a course
export async function hasOptimizedUserAccessToCourse(courseId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('payment_status', 'completed')
      .limit(1)
      .single();

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

// Clear cache function
export function clearCourseCache() {
  courseCache.clear();
}
