
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const Index: React.FC = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        setError(null);
        
        // Wait for auth to load with timeout
        if (isLoading) {
          // Set a maximum wait time for auth loading
          const timeoutId = setTimeout(() => {
            if (isLoading) {
              setError('Authentication loading timeout');
              setIsChecking(false);
            }
          }, 10000); // 10 second timeout

          // Clear timeout if auth loads
          if (!isLoading) {
            clearTimeout(timeoutId);
          }
          
          return;
        }

        if (!user) {
          // Not authenticated, redirect to auth page
          navigate('/auth', { replace: true });
          return;
        }

        // User is authenticated, redirect based on admin status
        if (isAdmin) {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error in authentication check:', error);
        setError('Authentication error occurred');
        navigate('/auth', { replace: true });
      } finally {
        setIsChecking(false);
      }
    };

    checkAuthentication();
  }, [user, isAdmin, isLoading, navigate]);

  if (isLoading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-t-[#00C853] border-gray-200 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">
            {isLoading ? 'Authenticating...' : 'Loading...'}
          </p>
          {error && (
            <div className="text-red-500 text-sm">
              {error}
              <br />
              <button 
                onClick={() => navigate('/auth')} 
                className="text-blue-500 underline mt-2"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default Index;
