
export interface Lesson {
  id: string;
  title: string;
  content: string;
  lesson_order: number;
  module_id: string;
}

export interface Module {
  id: string;
  title: string;
  description: string | null;
  content: string;
  module_order: number;
  course_id: string;
  lessons?: Lesson[];
}

export interface UserProgress {
  id: string;
  user_id: string;
  module_id: string | null;
  lesson_id: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface CourseWithProgress {
  id: string;
  title: string;
  description: string;
  price: number;
  modules: Module[];
  totalModules: number;
  completedModules: number;
  progress: number;
}

export interface CourseStructure {
  course_id: string;
  course_title: string;
  course_description: string;
  module_id: string;
  module_title: string;
  module_description: string | null;
  module_order: number;
  lesson_id: string | null;
  lesson_title: string | null;
  lesson_order: number | null;
}

export interface LessonProgress {
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
}
