
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lesson, createLesson, updateLesson } from '@/services/courseManagementService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Save } from 'lucide-react';

const lessonSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(1, 'Content is required'),
  lesson_order: z.coerce.number().int().positive('Order must be a positive number'),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

interface LessonFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson | null;
  moduleId: string;
  onSuccess: () => void;
}

const LessonForm: React.FC<LessonFormProps> = ({ 
  open, 
  onOpenChange, 
  lesson, 
  moduleId,
  onSuccess 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const isEditing = !!lesson;
  
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: lesson?.title || '',
      content: lesson?.content || '',
      lesson_order: lesson?.lesson_order || 1,
    },
  });
  
  // Create lesson mutation
  const createMutation = useMutation({
    mutationFn: (data: Omit<Lesson, 'id'>) => createLesson(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', moduleId] });
      setIsSubmitting(false);
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Error creating lesson:', error);
      setIsSubmitting(false);
    },
  });
  
  // Update lesson mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lesson> }) => 
      updateLesson(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', moduleId] });
      setIsSubmitting(false);
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Error updating lesson:', error);
      setIsSubmitting(false);
    },
  });
  
  const onSubmit = async (data: LessonFormValues) => {
    setIsSubmitting(true);
    
    try {
      if (isEditing && lesson) {
        await updateMutation.mutateAsync({ 
          id: lesson.id, 
          data: {
            title: data.title,
            content: data.content,
            lesson_order: data.lesson_order,
          }
        });
      } else {
        await createMutation.mutateAsync({
          title: data.title,
          content: data.content,
          lesson_order: data.lesson_order,
          module_id: moduleId,
        });
      }
    } catch (error) {
      console.error('Error submitting lesson:', error);
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Lesson' : 'Create Lesson'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lesson Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Getting Started" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Lesson content"
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The main content for this lesson.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lesson_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormDescription>
                    Display order in the module (1 = first lesson)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? 'Update Lesson' : 'Create Lesson'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default LessonForm;
