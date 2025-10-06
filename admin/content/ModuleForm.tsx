
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Module, createModule, updateModule } from '@/services/courseManagementService';
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

const moduleSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  module_order: z.coerce.number().int().positive('Order must be a positive number'),
});

type ModuleFormValues = z.infer<typeof moduleSchema>;

interface ModuleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: Module | null;
  courseId: string;
  onSuccess: () => void;
}

const ModuleForm: React.FC<ModuleFormProps> = ({ 
  open, 
  onOpenChange, 
  module, 
  courseId,
  onSuccess 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const isEditing = !!module;
  
  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: module?.title || '',
      description: module?.description || '',
      content: module?.content || '',
      module_order: module?.module_order || 1,
    },
  });
  
  // Create module mutation
  const createMutation = useMutation({
    mutationFn: (data: Omit<Module, 'id'>) => createModule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      setIsSubmitting(false);
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Error creating module:', error);
      setIsSubmitting(false);
    },
  });
  
  // Update module mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Module> }) => 
      updateModule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      setIsSubmitting(false);
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Error updating module:', error);
      setIsSubmitting(false);
    },
  });
  
  const onSubmit = async (data: ModuleFormValues) => {
    setIsSubmitting(true);
    
    try {
      if (isEditing && module) {
        await updateMutation.mutateAsync({ 
          id: module.id, 
          data: {
            title: data.title,
            description: data.description || null,
            content: data.content,
            module_order: data.module_order,
          }
        });
      } else {
        await createMutation.mutateAsync({
          title: data.title,
          description: data.description || null,
          content: data.content,
          module_order: data.module_order,
          course_id: courseId,
        });
      }
    } catch (error) {
      console.error('Error submitting module:', error);
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Module' : 'Create Module'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Introduction to the course" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of this module"
                      className="min-h-20"
                      {...field}
                    />
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
                      placeholder="Module content (introductory text)"
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The main content for this module, can include an introduction or overview.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="module_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormDescription>
                    Display order in the course (1 = first module)
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
                    {isEditing ? 'Update Module' : 'Create Module'}
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

export default ModuleForm;
