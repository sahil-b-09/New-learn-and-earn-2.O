
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Course, getAllCourses, deleteCourse, publishCourse, unpublishCourse } from "@/services/courseManagementService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash, Edit, EyeOff, Eye, Loader2, Plus, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import CourseForm from "./CourseForm";
import CourseDetailView from "./CourseDetailView";

interface CourseListViewProps {
  onCreateCourse?: () => void;
  onEditCourse?: (course: Course) => void;
}

const CourseListView: React.FC<CourseListViewProps> = ({ onCreateCourse, onEditCourse }) => {
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const queryClient = useQueryClient();
  
  // Fetch all courses
  const { data: courses = [], isLoading, error } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: getAllCourses,
  });
  
  // Filter courses based on search term
  const filteredCourses = searchTerm
    ? courses.filter(course => 
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : courses;
  
  // Delete course mutation
  const deleteMutation = useMutation({
    mutationFn: (courseId: string) => deleteCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Course deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete course: ${error.message}`);
    },
  });
  
  // Publish course mutation
  const publishMutation = useMutation({
    mutationFn: (courseId: string) => publishCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Course published successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to publish course: ${error.message}`);
    },
  });
  
  // Unpublish course mutation
  const unpublishMutation = useMutation({
    mutationFn: (courseId: string) => unpublishCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Course unpublished successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to unpublish course: ${error.message}`);
    },
  });
  
  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    
    try {
      await deleteMutation.mutateAsync(courseToDelete.id);
      setCourseToDelete(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };
  
  const handlePublishCourse = async (courseId: string) => {
    try {
      await publishMutation.mutateAsync(courseId);
    } catch (error) {
      console.error('Error publishing course:', error);
    }
  };
  
  const handleUnpublishCourse = async (courseId: string) => {
    try {
      await unpublishMutation.mutateAsync(courseId);
    } catch (error) {
      console.error('Error unpublishing course:', error);
    }
  };

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
  };
  
  // If a course is selected, show the detail view
  if (selectedCourseId) {
    return (
      <CourseDetailView 
        courseId={selectedCourseId} 
        onBack={() => setSelectedCourseId(null)} 
      />
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-6 text-red-500">
        Error loading courses. Please try again.
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-64">
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          size="sm" 
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          <span>New Course</span>
        </Button>
      </div>
      
      {filteredCourses.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
          {searchTerm ? 
            'No courses match your search.' : 
            'No courses available. Create your first course to get started.'}
        </div>
      ) : (
        <Table>
          <TableCaption>A list of all courses in the platform</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Price (₹)</TableHead>
              <TableHead>Referral (₹)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCourses.map((course) => (
              <TableRow 
                key={course.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedCourseId(course.id)}
              >
                <TableCell className="font-medium">{course.title}</TableCell>
                <TableCell>{course.price}</TableCell>
                <TableCell>{course.referral_reward}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={course.is_active ? "bg-green-100" : "bg-gray-100"}>
                    {course.is_active ? "Published" : "Hidden"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    {!course.is_active ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePublishCourse(course.id)}
                        title="Publish Course"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUnpublishCourse(course.id)}
                        title="Unpublish Course"
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedCourseId(course.id)}
                      title="Edit Course"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      title="Delete Course"
                      onClick={() => {
                        setCourseToDelete(course);
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the course
              "{courseToDelete?.title}" and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteCourse}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Create Course Dialog */}
      <CourseForm 
        isOpen={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
        onCancel={() => setCreateDialogOpen(false)}
      />
    </div>
  );
};

export default CourseListView;
