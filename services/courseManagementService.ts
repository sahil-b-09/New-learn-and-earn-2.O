import { supabase } from "@/integrations/supabase/client";
import { CourseStructure } from "@/types/course";
import { toast } from "sonner";
import { logContentManagement } from "@/services/contentManagementService";

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  referral_reward: number;
  pdf_url: string | null;
  is_active: boolean;
}

export interface Module {
  id: string;
  title: string;
  description: string | null;
  content: string;
  module_order: number;
  course_id: string;
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  lesson_order: number;
  module_id: string;
}

// Get all courses with improved error handling
export async function getAllCourses(): Promise<Course[]> {
  try {
    console.log('Fetching all courses');
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('title');

    if (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
      return [];
    }

    console.log(`Retrieved ${data?.length || 0} courses`);
    return (data || []).map(course => ({
      id: course.id,
      title: course.title,
      description: course.description || '',
      price: course.price,
      referral_reward: course.referral_reward,
      pdf_url: course.pdf_url,
      is_active: course.is_active || false
    })) as Course[];
  } catch (error) {
    console.error('Exception fetching courses:', error);
    toast.error('Failed to load courses');
    return [];
  }
}

// Get a single course by ID
export async function getCourseById(courseId: string): Promise<Course | null> {
  try {
    console.log(`Fetching course with ID: ${courseId}`);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course details');
      return null;
    }

    console.log('Retrieved course:', data);
    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      price: data.price,
      referral_reward: data.referral_reward,
      pdf_url: data.pdf_url,
      is_active: data.is_active || false
    } as Course;
  } catch (error) {
    console.error('Exception fetching course:', error);
    toast.error('Failed to load course details');
    return null;
  }
}

// Create a new course
export async function createCourse(course: Omit<Course, 'id'>): Promise<{ success: boolean; courseId?: string; error?: string }> {
  try {
    console.log('Creating new course:', course);
    const { data, error } = await supabase
      .from('courses')
      .insert([course])
      .select()
      .single();

    if (error) {
      console.error('Error creating course:', error);
      return { success: false, error: error.message };
    }

    console.log('Created course:', data);

    // Log the content management operation
    await logContentManagement({
      resource_type: 'course',
      operation_type: 'create',
      resource_id: data.id,
      details: { title: course.title }
    });

    return { success: true, courseId: data.id };
  } catch (error) {
    console.error('Exception creating course:', error);
    return { success: false, error: 'Failed to create course' };
  }
}

// Update a course
export async function updateCourse(courseId: string, updates: Partial<Course>): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Updating course ${courseId}:`, updates);
    const { error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', courseId);

    if (error) {
      console.error('Error updating course:', error);
      return { success: false, error: error.message };
    }

    console.log(`Course ${courseId} updated successfully`);

    // Log the content management operation
    await logContentManagement({
      resource_type: 'course',
      operation_type: 'update',
      resource_id: courseId,
      details: { updates }
    });

    return { success: true };
  } catch (error) {
    console.error('Exception updating course:', error);
    return { success: false, error: 'Failed to update course' };
  }
}

// Delete a course
export async function deleteCourse(courseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Starting deletion process for course: ${courseId}`);
    
    // Get module IDs first for proper deletion
    const { data: modules } = await supabase
      .from('course_modules')
      .select('id')
      .eq('course_id', courseId);

    const moduleIds = modules?.map(m => m.id) || [];

    // 1. Delete all related lessons first
    if (moduleIds.length > 0) {
      const { error: lessonsError } = await supabase
        .from('lessons')
        .delete()
        .in('module_id', moduleIds);

      if (lessonsError) {
        console.error('Error deleting lessons:', lessonsError);
      }
    }

    // 2. Delete all course modules
    const { error: modulesError } = await supabase
      .from('course_modules')
      .delete()
      .eq('course_id', courseId);

    if (modulesError) {
      console.error('Error deleting modules:', modulesError);
    }

    // 3. Delete course referral codes
    const { error: referralCodesError } = await supabase
      .from('course_referral_codes')
      .delete()
      .eq('course_id', courseId);

    if (referralCodesError) {
      console.error('Error deleting referral codes:', referralCodesError);
    }

    // 4. Delete referrals
    const { error: referralsError } = await supabase
      .from('referrals')
      .delete()
      .eq('course_id', courseId);

    if (referralsError) {
      console.error('Error deleting referrals:', referralsError);
    }

    // 5. Finally delete the course
    const { error: courseError } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (courseError) {
      console.error('Error deleting course:', courseError);
      return { success: false, error: courseError.message };
    }

    console.log(`Course ${courseId} and all related data deleted successfully`);

    // Log the content management operation
    await logContentManagement({
      resource_type: 'course',
      operation_type: 'delete',
      resource_id: courseId,
      details: { cascade_delete: true }
    });

    return { success: true };
  } catch (error) {
    console.error('Exception deleting course:', error);
    return { success: false, error: 'Failed to delete course completely' };
  }
}

// Get modules for a course
export async function getModulesForCourse(courseId: string): Promise<Module[]> {
  try {
    console.log(`Fetching modules for course: ${courseId}`);
    const { data, error } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('module_order');

    if (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to load course modules');
      return [];
    }

    console.log(`Retrieved ${data?.length || 0} modules for course ${courseId}`);
    return data as Module[];
  } catch (error) {
    console.error('Exception fetching modules:', error);
    toast.error('Failed to load course modules');
    return [];
  }
}

// Create a module
export async function createModule(module: Omit<Module, 'id'>): Promise<{ success: boolean; moduleId?: string; error?: string }> {
  try {
    console.log('Creating new module:', module);
    
    // If module_order is not specified, get the maximum order and add 1
    if (!module.module_order) {
      const { data: maxOrderData } = await supabase
        .from('course_modules')
        .select('module_order')
        .eq('course_id', module.course_id)
        .order('module_order', { ascending: false })
        .limit(1);
      
      const maxOrder = maxOrderData?.length ? maxOrderData[0].module_order : 0;
      module.module_order = maxOrder + 1;
    }
    
    const { data, error } = await supabase
      .from('course_modules')
      .insert([module])
      .select()
      .single();

    if (error) {
      console.error('Error creating module:', error);
      return { success: false, error: error.message };
    }

    console.log('Created module:', data);

    // Log the content management operation
    await logContentManagement({
      resource_type: 'module',
      operation_type: 'create',
      resource_id: data.id,
      details: { title: module.title, course_id: module.course_id }
    });

    toast.success('Module created successfully');
    return { success: true, moduleId: data.id };
  } catch (error) {
    console.error('Exception creating module:', error);
    return { success: false, error: 'Failed to create module' };
  }
}

// Update a module
export async function updateModule(moduleId: string, updates: Partial<Module>): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Updating module ${moduleId}:`, updates);
    const { error } = await supabase
      .from('course_modules')
      .update(updates)
      .eq('id', moduleId);

    if (error) {
      console.error('Error updating module:', error);
      return { success: false, error: error.message };
    }

    console.log(`Module ${moduleId} updated successfully`);

    // Log the content management operation
    await logContentManagement({
      resource_type: 'module',
      operation_type: 'update',
      resource_id: moduleId,
      details: { updates }
    });

    toast.success('Module updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Exception updating module:', error);
    return { success: false, error: 'Failed to update module' };
  }
}

// Delete a module
export async function deleteModule(moduleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Deleting module with ID: ${moduleId}`);
    const { error } = await supabase
      .from('course_modules')
      .delete()
      .eq('id', moduleId);

    if (error) {
      console.error('Error deleting module:', error);
      return { success: false, error: error.message };
    }

    console.log(`Module ${moduleId} deleted successfully`);

    // Log the content management operation
    await logContentManagement({
      resource_type: 'module',
      operation_type: 'delete',
      resource_id: moduleId,
      details: {}
    });

    toast.success('Module deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('Exception deleting module:', error);
    return { success: false, error: 'Failed to delete module' };
  }
}

// Get lessons for a module
export async function getLessonsForModule(moduleId: string): Promise<Lesson[]> {
  try {
    console.log(`Fetching lessons for module: ${moduleId}`);
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('lesson_order');

    if (error) {
      console.error('Error fetching lessons:', error);
      toast.error('Failed to load module lessons');
      return [];
    }

    console.log(`Retrieved ${data?.length || 0} lessons for module ${moduleId}`);
    return data as Lesson[];
  } catch (error) {
    console.error('Exception fetching lessons:', error);
    toast.error('Failed to load module lessons');
    return [];
  }
}

// Create a lesson
export async function createLesson(lesson: Omit<Lesson, 'id'>): Promise<{ success: boolean; lessonId?: string; error?: string }> {
  try {
    console.log('Creating new lesson:', lesson);
    
    // If lesson_order is not specified, get the maximum order and add 1
    if (!lesson.lesson_order) {
      const { data: maxOrderData } = await supabase
        .from('lessons')
        .select('lesson_order')
        .eq('module_id', lesson.module_id)
        .order('lesson_order', { ascending: false })
        .limit(1);
      
      const maxOrder = maxOrderData?.length ? maxOrderData[0].lesson_order : 0;
      lesson.lesson_order = maxOrder + 1;
    }
    
    const { data, error } = await supabase
      .from('lessons')
      .insert([lesson])
      .select()
      .single();

    if (error) {
      console.error('Error creating lesson:', error);
      return { success: false, error: error.message };
    }

    console.log('Created lesson:', data);

    // Log the content management operation
    await logContentManagement({
      resource_type: 'lesson',
      operation_type: 'create',
      resource_id: data.id,
      details: { title: lesson.title, module_id: lesson.module_id }
    });

    toast.success('Lesson created successfully');
    return { success: true, lessonId: data.id };
  } catch (error) {
    console.error('Exception creating lesson:', error);
    return { success: false, error: 'Failed to create lesson' };
  }
}

// Update a lesson
export async function updateLesson(lessonId: string, updates: Partial<Lesson>): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Updating lesson ${lessonId}:`, updates);
    const { error } = await supabase
      .from('lessons')
      .update(updates)
      .eq('id', lessonId);

    if (error) {
      console.error('Error updating lesson:', error);
      return { success: false, error: error.message };
    }

    console.log(`Lesson ${lessonId} updated successfully`);

    // Log the content management operation
    await logContentManagement({
      resource_type: 'lesson',
      operation_type: 'update',
      resource_id: lessonId,
      details: { updates }
    });

    toast.success('Lesson updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Exception updating lesson:', error);
    return { success: false, error: 'Failed to update lesson' };
  }
}

// Delete a lesson
export async function deleteLesson(lessonId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Deleting lesson with ID: ${lessonId}`);
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (error) {
      console.error('Error deleting lesson:', error);
      return { success: false, error: error.message };
    }

    console.log(`Lesson ${lessonId} deleted successfully`);

    // Log the content management operation
    await logContentManagement({
      resource_type: 'lesson',
      operation_type: 'delete',
      resource_id: lessonId,
      details: {}
    });

    toast.success('Lesson deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('Exception deleting lesson:', error);
    return { success: false, error: 'Failed to delete lesson' };
  }
}

// Get the full course structure (all modules and lessons)
export async function getFullCourseStructure(courseId: string): Promise<CourseStructure[]> {
  try {
    console.log(`Fetching full course structure for course: ${courseId}`);
    
    // Since we don't have the RPC function, let's fetch manually
    const { data: modules, error: modulesError } = await supabase
      .from('course_modules')
      .select(`
        *,
        lessons(*)
      `)
      .eq('course_id', courseId)
      .order('module_order');

    if (modulesError) {
      console.error('Error fetching course structure:', modulesError);
      toast.error('Failed to load course structure');
      return [];
    }

    console.log(`Retrieved course structure for course ${courseId}`);
    
    // Transform to CourseStructure format
    const courseStructure: CourseStructure[] = [];
    modules?.forEach(module => {
      // Add module entry
      courseStructure.push({
        course_id: courseId,
        course_title: '',
        course_description: '',
        module_id: module.id,
        module_title: module.title,
        module_description: module.description,
        module_order: module.module_order,
        lesson_id: null,
        lesson_title: null,
        lesson_order: null
      });
      
      // Add lesson entries
      if (module.lessons) {
        module.lessons.forEach((lesson: any) => {
          courseStructure.push({
            course_id: courseId,
            course_title: '',
            course_description: '',
            module_id: module.id,
            module_title: module.title,
            module_description: module.description,
            module_order: module.module_order,
            lesson_id: lesson.id,
            lesson_title: lesson.title,
            lesson_order: lesson.lesson_order
          });
        });
      }
    });
    
    return courseStructure;
  } catch (error) {
    console.error('Exception fetching course structure:', error);
    toast.error('Failed to load course structure');
    return [];
  }
}

// These functions are simplified since we use is_active in the database
export async function publishCourse(courseId: string): Promise<{ success: boolean; error?: string }> {
  return updateCourse(courseId, { is_active: true });
}

export async function unpublishCourse(courseId: string): Promise<{ success: boolean; error?: string }> {
  return updateCourse(courseId, { is_active: false });
}
