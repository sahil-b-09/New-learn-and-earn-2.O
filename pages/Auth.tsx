
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // Handle login
        const { error } = await signIn(email, password);
        if (error) throw error;
        
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
        
        navigate('/dashboard');
      } else {
        // Handle signup
        if (!name.trim()) {
          toast({
            title: "Error",
            description: "Please enter your name",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        if (!agreedToTerms) {
          toast({
            title: "Error",
            description: "You must agree to the Terms and Conditions to sign up",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, name);
        if (error) throw error;
        
        toast({
          title: "Signup successful",
          description: "Your account has been created. You can now log in.",
        });
        
        setIsLogin(true);
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        title: "Authentication Error",
        description: error.message || "Failed to authenticate. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Learn &amp; Earn</h1>
          <p className="text-sm text-gray-600">Learn new skills and earn through referrals</p>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required={!isLogin}
              />
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          
          {!isLogin && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
              />
              <label 
                htmlFor="terms" 
                className="text-sm text-gray-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the{' '}
                <Link to="/policies" className="text-[#00C853] hover:underline">
                  Terms and Conditions
                </Link>
              </label>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-[#00C853] hover:bg-green-600 text-white"
            disabled={isLoading || (!isLogin && !agreedToTerms)}
          >
            {isLoading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-600 hover:underline"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
