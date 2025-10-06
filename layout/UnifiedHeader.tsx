import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import OptimizedNotificationCenter from '@/components/notifications/OptimizedNotificationCenter';

// Import the logo
import logoImage from '/lovable-uploads/629a36a7-2859-4c33-9657-12a1dfea41ed.png';

const UnifiedHeader: React.FC = React.memo(() => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const userDisplayName = useMemo(() => 
    user?.user_metadata?.name || user?.email?.split('@')[0] || 'User', 
    [user?.user_metadata?.name, user?.email]
  );

  const userInitial = useMemo(() => 
    user?.email?.charAt(0).toUpperCase() || 'U', 
    [user?.email]
  );

  // Handle mobile menu toggle
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };
  
  // Handle notification click
  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  // Handle admin panel navigation
  const handleAdminPanel = () => {
    navigate('/admin');
  };

  console.log('UnifiedHeader - isAdmin:', isAdmin, 'user:', user?.email);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-[993px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center">
          <div className="h-10 w-auto mr-2 flex items-center">
            <img 
              src={logoImage} 
              alt="Learn & Earn" 
              className="h-auto w-full max-h-10 object-contain"
              style={{
                filter: "brightness(1.2) contrast(1.2)",
                maxWidth: "150px",
              }}
              loading="eager"
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/dashboard" className="text-gray-700 hover:text-[#00C853] font-medium">
            Dashboard
          </Link>
          <Link to="/my-courses" className="text-gray-700 hover:text-[#00C853] font-medium">
            My Courses
          </Link>
          <Link to="/referrals" className="text-gray-700 hover:text-[#00C853] font-medium">
            Refer & Earn
          </Link>
          <Link to="/wallet" className="text-gray-700 hover:text-[#00C853] font-medium">
            Wallet
          </Link>
          
          {/* Admin Panel Button - Show only for admin users */}
          {isAdmin && (
            <Button 
              onClick={handleAdminPanel}
              className="flex items-center space-x-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
            >
              <Shield className="h-4 w-4" />
              <span>Admin Panel</span>
            </Button>
          )}
        </nav>

        {/* Notification Bell and User Menu */}
        <div className="flex items-center space-x-2">
          {/* Notification Bell */}
          <DropdownMenu 
            open={isNotificationsOpen}
            onOpenChange={setIsNotificationsOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <OptimizedNotificationCenter 
                onClose={() => setIsNotificationsOpen(false)}
              />
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu - Desktop */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="hidden md:flex">
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#00C853] text-white">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-normal">
                  {userDisplayName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/wallet">Wallet</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/feedback">Feedback</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden ml-2">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-[#00C853] text-white">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3 flex-1">
                    <p className="font-semibold">
                      {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                    {isAdmin && (
                      <Badge className="mt-1 bg-purple-100 text-purple-800 border-purple-200 text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>
                
                <nav className="flex flex-col space-y-4">
                  <Link 
                    to="/dashboard" 
                    className="px-2 py-2 rounded-lg hover:bg-gray-100 font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/my-courses" 
                    className="px-2 py-2 rounded-lg hover:bg-gray-100 font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    My Courses
                  </Link>
                  <Link 
                    to="/referrals" 
                    className="px-2 py-2 rounded-lg hover:bg-gray-100 font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    Refer & Earn
                  </Link>
                  <Link 
                    to="/wallet" 
                    className="px-2 py-2 rounded-lg hover:bg-gray-100 font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    Wallet
                  </Link>
                  <Link 
                    to="/profile" 
                    className="px-2 py-2 rounded-lg hover:bg-gray-100 font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link 
                    to="/feedback" 
                    className="px-2 py-2 rounded-lg hover:bg-gray-100 font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    Feedback
                  </Link>
                  
                  {/* Admin Panel for Mobile - Only show for admin users */}
                  {isAdmin && (
                    <Button 
                      onClick={() => {
                        handleAdminPanel();
                        setIsOpen(false);
                      }}
                      className="px-2 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium flex items-center justify-start space-x-2"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </Button>
                  )}
                </nav>
                
                <div className="mt-auto pt-4">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
});

UnifiedHeader.displayName = 'UnifiedHeader';

export default UnifiedHeader;
