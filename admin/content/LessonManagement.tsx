
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lesson, getLessonsForModule, deleteLesson } from '@/services/courseManagementService';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Edit,
  Trash,
  Plus,
  File,
  Loader2
} from 'lucide-react';
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
import LessonForm from './LessonForm';

interface LessonManagementProps {
  moduleId: string;
}

const LessonManagement: React.FC<LessonManagementProps> = ({ moduleId }) => {
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  
  const queryClient = useQueryClient();
  
  // Fetch lessons for this module
  const { data: lessons = [], isLoading, error } = useQuery({
    queryKey: ['lessons', moduleId],
    queryFn: () => getLessonsForModule(moduleId),
  });
  
  // Delete lesson mutation
  const deleteMutation = useMutation({
    mutationFn: (lessonId: string) => deleteLesson(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', moduleId] });
      toast.success('Lesson deleted successfully');
      setLessonToDelete(null);
    },
    onError: (error: any) => {
      console.error('Error deleting lesson:', error);
      toast.error(`Failed to delete lesson: ${error.message}`);
    },
  });
  
  const handleCreateLesson = () => {
    setSelectedLesson(null);
    setLessonFormOpen(true);
  };
  
  const handleEditLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setLessonFormOpen(true);
  };
  
  const handleDeleteLesson = async () => {
    if (!lessonToDelete) return;
    
    await deleteMutation.mutateAsync(lessonToDelete.id);
    setDeleteDialogOpen(false);
  };
  
  const handleLessonFormSuccess = () => {
    setLessonFormOpen(false);
    queryClient.invalidateQueries({ queryKey: ['lessons', moduleId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading module lessons. Please try again.
      </div>
    );
  }
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-500">Lessons</h4>
        <Button onClick={handleCreateLesson} size="sm" variant="outline" className="gap-1">
          <Plus className="h-3 w-3" />
          <span>Add Lesson</span>
        </Button>
      </div>
      
      {lessons.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-md">
          <File className="h-8 w-8 text-gray-300 mx-auto mb-1" />
          <p className="text-gray-400 text-sm">No lessons available for this module yet.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lessons.map((lesson) => (
              <TableRow key={lesson.id}>
                <TableCell className="font-medium">{lesson.lesson_order}</TableCell>
                <TableCell>{lesson.title}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditLesson(lesson)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => {
                        setLessonToDelete(lesson);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      
      {/* Delete Lesson Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the lesson "{lessonToDelete?.title}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteLesson}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Lesson Create/Edit Dialog */}
      <LessonForm
        open={lessonFormOpen}
        onOpenChange={setLessonFormOpen}
        lesson={selectedLesson}
        moduleId={moduleId}
        onSuccess={handleLessonFormSuccess}
      />
    </div>
  );
};

export default LessonManagement;
