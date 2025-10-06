
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Course, getCourseById } from '@/services/courseManagementService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Edit, 
  ExternalLink,
  Loader2,
} from 'lucide-react';
import CourseForm from './CourseForm';
import ModuleManagement from './ModuleManagement';

interface CourseDetailViewProps {
  courseId: string;
  onBack: () => void;
}

const CourseDetailView: React.FC<CourseDetailViewProps> = ({ courseId, onBack }) => {
  const [editMode, setEditMode] = useState(false);
  
  // Fetch course details
  const { data: course, isLoading, error, refetch } = useQuery({
    queryKey: ['course-detail', courseId],
    queryFn: () => getCourseById(courseId),
  });
  
  const handleEditSuccess = () => {
    setEditMode(false);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (error || !course) {
    return (
      <div className="text-center py-12 text-red-500">
        Error loading course details. Please try again.
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Button>
        <Button 
          size="sm" 
          onClick={() => setEditMode(true)}
          className="gap-1"
        >
          <Edit className="h-4 w-4" />
          Edit Course
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{course.title}</CardTitle>
            <Badge variant="outline" className={course.is_active ? "bg-green-100" : "bg-gray-100"}>
              {course.is_active ? "Published" : "Hidden"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
            <p className="text-gray-700">{course.description || 'No description available'}</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Price</h4>
              <p className="text-gray-900 font-semibold">₹{course.price}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Referral Reward</h4>
              <p className="text-gray-900 font-semibold">₹{course.referral_reward}</p>
            </div>
          </div>
          
          {course.pdf_url && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">PDF Content</h4>
              <a 
                href={course.pdf_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-500 hover:underline flex items-center gap-1"
              >
                View PDF <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="pt-4">
        <ModuleManagement course={course} />
      </div>
      
      <CourseForm
        course={course}
        onSuccess={handleEditSuccess}
        onCancel={() => setEditMode(false)}
        isOpen={editMode}
        onOpenChange={setEditMode}
      />
    </div>
  );
};

export default CourseDetailView;
