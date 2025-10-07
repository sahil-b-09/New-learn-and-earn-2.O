import React from 'react';
import { Alert, AlertDescription } from '@/ui/alert';
import { Button } from '@/ui/button';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { UserRole, useRoleGuard } from '@/lib/rbac';

interface AccessGuardProps {
  requiredRole: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

// Component to guard content based on user role
export const AccessGuard: React.FC<AccessGuardProps> = ({
  requiredRole,
  children,
  fallback,
  showFallback = true
}) => {
  const { hasAccess, isLoading, userRole } = useRoleGuard(requiredRole);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showFallback) {
      return null;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <ShieldX className="h-16 w-16 text-muted-foreground mb-4" />
        <Alert className="max-w-md">
          <AlertDescription className="text-center">
            <div className="space-y-2">
              <p className="font-medium">Access Restricted</p>
              <p className="text-sm text-muted-foreground">
                This content requires {requiredRole} access level.
                {userRole && (
                  <span className="block mt-1">
                    Your current role: <span className="font-medium capitalize">{userRole}</span>
                  </span>
                )}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.history.back()}
                className="mt-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};

// Role badge component
export const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  const getBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'moderator':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'user':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(role)}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
};