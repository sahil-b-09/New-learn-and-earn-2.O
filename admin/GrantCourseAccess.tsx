
import React, { useState, useEffect } from 'react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Loader as Loader2, Users, BookOpen, Search } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  price: number;
}

interface User {
  id: string;
  email: string;
  name: string;
}

const GrantCourseAccess: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isSearchingUsers, setIsSearchingUsers] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const loadCourses = async () => {
      if (!isAdmin) {
        setIsLoadingData(false);
        return;
      }
      
      try {
        setIsLoadingData(true);
        
        // Only load courses - users are searched on demand
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('id, title, price')
          .eq('is_active', true)
          .order('title');

        if (coursesError) throw coursesError;
        if (coursesData) setCourses(coursesData);
        
      } catch (error) {
        console.error('Error loading courses:', error);
        toast.error('Failed to load courses');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadCourses();
  }, [isAdmin]);

  // Search users with debouncing (using secure server endpoint)
  useEffect(() => {
    if (!userSearchTerm.trim() || !isAdmin) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      try {
        setIsSearchingUsers(true);
        
        // Get JWT token for authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        // Call secure server endpoint
        const response = await fetch(`/api/admin/search-users?q=${encodeURIComponent(userSearchTerm)}&limit=10`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to search users');
        }

        const result = await response.json();
        setUsers(result.data || []);
        
      } catch (error) {
        console.error('Error searching users:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to search users');
        setUsers([]);
      } finally {
        setIsSearchingUsers(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [userSearchTerm, isAdmin]);

  const handleGrantAccess = async () => {
    if (!selectedUser || !selectedCourse) {
      toast.error("Please select both a user and a course");
      return;
    }

    setIsLoading(true);
    setResult(null);
    
    try {
      // Get JWT token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call secure server endpoint with JWT authentication
      const response = await fetch('/api/admin/grant-course-access', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedUser,
          course_id: selectedCourse
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grant course access');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        const selectedUserData = users.find(u => u.id === selectedUser);
        const selectedCourseData = courses.find(c => c.id === selectedCourse);
        setResult(`Successfully granted access to "${result.data.course.title}" for user "${result.data.user.name || result.data.user.email}"`);
        
        // Reset selections
        setSelectedUser('');
        setSelectedCourse('');
        setUserSearchTerm(''); // Clear search
      } else {
        toast.error('Failed to grant access');
        setResult('Error: Failed to grant course access');
      }
    } catch (error) {
      console.error("Error granting access:", error);
      toast.error(error instanceof Error ? error.message : "Failed to grant course access");
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Admin gate - don't render for non-admins
  if (!isAdmin) {
    return (
      <Card className="p-4 bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <Users className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Access Denied</p>
            <p className="text-sm">Admin privileges required to grant course access</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingData) {
    return (
      <Card className="p-4 bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading courses...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-white shadow-sm">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-lg font-medium flex items-center">
          <BookOpen className="h-5 w-5 mr-2" />
          Grant Course Access
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search and Select User
          </label>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by email or name..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="pl-10"
              />
              {isSearchingUsers && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>
            
            {userSearchTerm && (
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder={users.length === 0 ? "No users found" : "Choose a user"} />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        {user.name} ({user.email})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Course
          </label>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-2" />
                    {course.title} (₹{course.price})
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={handleGrantAccess} 
          disabled={isLoading || !selectedUser || !selectedCourse}
          className="bg-[#00C853] hover:bg-green-600 w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Granting Access...
            </>
          ) : (
            "Grant Course Access"
          )}
        </Button>
        
        {result && (
          <div className="mt-4 p-3 bg-gray-50 rounded border text-sm">
            {result}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GrantCourseAccess;
