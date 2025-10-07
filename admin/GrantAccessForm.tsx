
import { useState, useEffect } from 'react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Alert, AlertDescription } from '@/ui/alert';
import { Loader as Loader2 } from 'lucide-react';
import { Checkbox } from '@/ui/checkbox';
import { useToast } from '@/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  is_active: boolean;
}

const GrantAccessForm = () => {
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [result, setResult] = useState<{success: boolean; message: string} | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const { toast } = useToast();

  // Fetch available courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setCoursesLoading(true);
        const { data, error } = await supabase
          .from('courses')
          .select('id, title, description, price, is_active')
          .eq('is_active', true)
          .order('title');
        
        if (error) {
          console.error('Error fetching courses:', error);
          toast({
            title: "Error",
            description: "Failed to load courses. Please check database connection.",
            variant: "destructive"
          });
          setCourses([]);
        } else {
          if (!data || data.length === 0) {
            toast({
              title: "Warning",
              description: "No active courses found. Please create courses first.",
              variant: "destructive"
            });
          }
          setCourses(data || []);
        }
      } catch (error) {
        console.error('Exception fetching courses:', error);
        toast({
          title: "Error",
          description: "Failed to load courses",
          variant: "destructive"
        });
      } finally {
        setCoursesLoading(false);
      }
    };
    
    fetchCourses();
  }, [toast]);
  
  // Handle course selection
  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };
  
  // Handle select all toggle
  const handleSelectAllToggle = () => {
    if (selectAll) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(courses.map(course => course.id));
    }
    setSelectAll(!selectAll);
  };
  
  // Update select all state when individual courses are toggled
  useEffect(() => {
    setSelectAll(selectedCourses.length === courses.length && courses.length > 0);
  }, [selectedCourses, courses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedCourses.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one course",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      console.log("Submitting grant access for:", userEmail, "Courses:", selectedCourses);
      
      // Get auth session for API requests
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      // First, find user by email
      const userResponse = await fetch(`/api/admin/search-users?q=${encodeURIComponent(userEmail)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!userResponse.ok) {
        let errorMessage = 'Failed to find user';
        try {
          const errorData = await userResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = userResponse.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const userData = await userResponse.json();
      if (!userData.data || userData.data.length === 0) {
        throw new Error('User not found. Please check the email address.');
      }
      
      const user = userData.data.find((u: any) => u.email === userEmail) || userData.data[0];
      let allSuccessful = true;
      let successCount = 0;
      const errors: string[] = [];
      
      // Grant access to each selected course
      for (const courseId of selectedCourses) {
        try {
          const response = await fetch('/api/admin/grant-course-access', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id,
              course_id: courseId
            })
          });
          
          if (!response.ok) {
            let errorMessage = 'Unknown error';
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorData.details || errorMessage;
            } catch {
              // If response is not JSON, use status text
              errorMessage = response.statusText || `HTTP ${response.status}`;
            }
            errors.push(`Course ${courseId}: ${errorMessage}`);
            allSuccessful = false;
          } else {
            successCount++;
          }
        } catch (error) {
          errors.push(`Course ${courseId}: Failed to grant access`);
          allSuccessful = false;
        }
      }
      
      const result = {
        success: successCount > 0,
        message: allSuccessful 
          ? `Successfully granted access to ${successCount} course(s) for ${userEmail}`
          : `Granted access to ${successCount} course(s). Errors: ${errors.join(', ')}`
      };
      
      console.log("Grant access result:", result);
      setResult(result);
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error granting access:', error);
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      toast({
        title: "Error",
        description: "Failed to grant course access",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold mb-4">Grant Course Access</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            User Email
          </label>
          <Input
            id="email"
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="w-full"
            data-testid="input-user-email"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Courses to Grant Access
          </label>
          
          {coursesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-gray-500">Loading courses...</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto border rounded-lg p-3">
              {courses.length > 0 && (
                <div className="flex items-center space-x-2 border-b pb-2">
                  <Checkbox
                    id="select-all"
                    checked={selectAll}
                    onCheckedChange={handleSelectAllToggle}
                    data-testid="checkbox-select-all"
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Select All Courses ({courses.length})
                  </label>
                </div>
              )}
              
              {courses.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No active courses found
                </p>
              ) : (
                courses.map((course) => (
                  <div key={course.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={`course-${course.id}`}
                      checked={selectedCourses.includes(course.id)}
                      onCheckedChange={() => handleCourseToggle(course.id)}
                      data-testid={`checkbox-course-${course.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <label 
                        htmlFor={`course-${course.id}`} 
                        className="text-sm font-medium cursor-pointer block"
                      >
                        {course.title}
                      </label>
                      {course.description && (
                        <p className="text-xs text-gray-600 mt-1">
                          {course.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Price: ₹{course.price}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
        <Button 
          type="submit" 
          disabled={loading || coursesLoading || selectedCourses.length === 0}
          className="bg-[#00C853] hover:bg-[#00B248] text-white w-full"
          data-testid="button-grant-access"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Grant Access to ${selectedCourses.length} Course${selectedCourses.length !== 1 ? 's' : ''}`
          )}
        </Button>
      </form>
      
      {result && (
        <Alert className={`mt-4 ${result.success ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          <AlertDescription>
            {result.message}
            
            {result.success && selectedCourses.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Courses granted access:</p>
                <ul className="list-disc list-inside mt-1">
                  {selectedCourses.map((courseId) => {
                    const course = courses.find(c => c.id === courseId);
                    return (
                      <li key={courseId}>
                        {course ? course.title : courseId}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default GrantAccessForm;
