
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PageLayoutProps {
  title: string;
  backTo?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ 
  title, 
  backTo, 
  children,
  action 
}) => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1); // Go back in history if no specific route
    }
  };
  
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          {backTo && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack} 
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        
        {action && (
          <div>{action}</div>
        )}
      </div>
      
      {children}
    </div>
  );
};

export default PageLayout;
