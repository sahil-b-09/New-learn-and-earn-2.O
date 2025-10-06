
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Module, Course, getModulesForCourse, deleteModule } from '@/services/courseManagementService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Trash, 
  Plus,
  Book,
  Loader2
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import LessonManagement from './LessonManagement';
import ModuleForm from './ModuleForm';

interface ModuleManagementProps {
  course: Course;
}

const ModuleManagement: React.FC<ModuleManagementProps> = ({ course }) => {
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  
  const queryClient = useQueryClient();
  
  // Fetch modules for this course
  const { data: modules = [], isLoading, error } = useQuery({
    queryKey: ['modules', course.id],
    queryFn: () => getModulesForCourse(course.id),
  });
  
  // Delete module mutation
  const deleteMutation = useMutation({
    mutationFn: (moduleId: string) => deleteModule(moduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules', course.id] });
      toast.success('Module deleted successfully');
      setModuleToDelete(null);
    },
    onError: (error: any) => {
      console.error('Error deleting module:', error);
      toast.error(`Failed to delete module: ${error.message}`);
    },
  });
  
  const handleCreateModule = () => {
    setSelectedModule(null);
    setModuleFormOpen(true);
  };
  
  const handleEditModule = (module: Module) => {
    setSelectedModule(module);
    setModuleFormOpen(true);
  };
  
  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;
    
    await deleteMutation.mutateAsync(moduleToDelete.id);
    setDeleteDialogOpen(false);
  };
  
  const handleModuleFormSuccess = () => {
    setModuleFormOpen(false);
    queryClient.invalidateQueries({ queryKey: ['modules', course.id] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        Error loading course modules. Please try again.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Modules</h3>
        <Button onClick={handleCreateModule} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          <span>Add Module</span>
        </Button>
      </div>
      
      {modules.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-md">
          <Book className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No modules available for this course yet.</p>
          <p className="text-gray-400 text-sm mt-1">Create your first module to get started.</p>
        </div>
      ) : (
        <Accordion 
          type="single" 
          collapsible 
          value={activeModule || undefined}
          onValueChange={setActiveModule}
          className="space-y-2"
        >
          {modules.map((module) => (
            <AccordionItem 
              key={module.id} 
              value={module.id}
              className="border rounded-md overflow-hidden"
            >
              <div className="flex justify-between items-center px-4 py-3">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex-1 text-left">
                    <span className="font-medium">{module.title}</span>
                    <span className="ml-2 text-gray-500 text-sm">
                      ({module.module_order})
                    </span>
                  </div>
                </AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditModule(module);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModuleToDelete(module);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <AccordionContent className="pb-0 pt-0">
                <div className="border-t bg-gray-50">
                  <LessonManagement moduleId={module.id} />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
      
      {/* Delete Module Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Module</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the module "{moduleToDelete?.title}" and all its lessons.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteModule}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Module Create/Edit Dialog */}
      <ModuleForm
        open={moduleFormOpen}
        onOpenChange={setModuleFormOpen}
        module={selectedModule}
        courseId={course.id}
        onSuccess={handleModuleFormSuccess}
      />
    </div>
  );
};

export default ModuleManagement;
