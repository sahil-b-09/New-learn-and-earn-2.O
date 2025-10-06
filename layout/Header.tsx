
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import the logo
import logoImage from '/lovable-uploads/629a36a7-2859-4c33-9657-12a1dfea41ed.png';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAdminClick = () => {
    navigate('/admin');
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-[1200px] mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center">
          <NavLink to="/dashboard" className="flex items-center">
            <div className="h-10 w-auto mr-2 flex items-center">
              <img 
                src={logoImage} 
                alt="Learn & Earn" 
                className="h-auto w-full max-h-10 object-contain"
                style={{
                  filter: "brightness(1.2) contrast(1.2)",
                  maxWidth: "150px",
                }}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'block';
                }}
              />
              <span 
                className="text-lg font-bold text-gray-900 hidden" 
                style={{ display: 'none' }}
              >
                Learn & Earn
              </span>
            </div>
          </NavLink>
        </div>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-6">
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => 
              isActive ? "text-blue-600 font-medium" : "text-gray-600 hover:text-gray-900"
            }
          >
            Home
          </NavLink>
          <NavLink 
            to="/my-courses" 
            className={({ isActive }) => 
              isActive ? "text-blue-600 font-medium" : "text-gray-600 hover:text-gray-900"
            }
          >
            My Courses
          </NavLink>
          <NavLink 
            to="/referrals" 
            className={({ isActive }) => 
              isActive ? "text-blue-600 font-medium" : "text-gray-600 hover:text-gray-900"
            }
          >
            Referrals
          </NavLink>
          <NavLink 
            to="/wallet" 
            className={({ isActive }) => 
              isActive ? "text-blue-600 font-medium" : "text-gray-600 hover:text-gray-900"
            }
          >
            Wallet
          </NavLink>
          <NavLink 
            to="/profile" 
            className={({ isActive }) => 
              isActive ? "text-blue-600 font-medium" : "text-gray-600 hover:text-gray-900"
            }
          >
            Profile
          </NavLink>
          
          {/* Admin Panel Button - Only show for admins */}
          {isAdmin && (
            <Button 
              onClick={handleAdminClick}
              variant="outline" 
              size="sm"
              className="border-purple-200 text-purple-700 hover:bg-purple-50 flex items-center space-x-1"
            >
              <Shield className="h-4 w-4" />
              <span>Admin Panel</span>
            </Button>
          )}
        </nav>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 right-0 left-0 bg-white z-50 border-b border-gray-200 shadow-md">
            <div className="flex flex-col p-4 space-y-3">
              <NavLink 
                to="/dashboard" 
                className={({ isActive }) => 
                  isActive ? "text-blue-600 font-medium p-2" : "text-gray-600 hover:text-gray-900 p-2"
                }
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </NavLink>
              <NavLink 
                to="/my-courses" 
                className={({ isActive }) => 
                  isActive ? "text-blue-600 font-medium p-2" : "text-gray-600 hover:text-gray-900 p-2"
                }
                onClick={() => setIsMenuOpen(false)}
              >
                My Courses
              </NavLink>
              <NavLink 
                to="/referrals" 
                className={({ isActive }) => 
                  isActive ? "text-blue-600 font-medium p-2" : "text-gray-600 hover:text-gray-900 p-2"
                }
                onClick={() => setIsMenuOpen(false)}
              >
                Referrals
              </NavLink>
              <NavLink 
                to="/wallet" 
                className={({ isActive }) => 
                  isActive ? "text-blue-600 font-medium p-2" : "text-gray-600 hover:text-gray-900 p-2"
                }
                onClick={() => setIsMenuOpen(false)}
              >
                Wallet
              </NavLink>
              <NavLink 
                to="/profile" 
                className={({ isActive }) => 
                  isActive ? "text-blue-600 font-medium p-2" : "text-gray-600 hover:text-gray-900 p-2"
                }
                onClick={() => setIsMenuOpen(false)}
              >
                Profile
              </NavLink>
              
              {/* Admin Panel Button for Mobile - Only show for admins */}
              {isAdmin && (
                <Button 
                  onClick={() => {
                    handleAdminClick();
                    setIsMenuOpen(false);
                  }}
                  variant="outline"
                  className="p-2 text-purple-700 border border-purple-200 rounded-md bg-purple-50 flex items-center justify-center space-x-1"
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin Panel</span>
                </Button>
              )}
              
              <NavLink 
                to="/feedback" 
                className={({ isActive }) => 
                  isActive ? "text-blue-600 font-medium p-2" : "text-gray-600 hover:text-gray-900 p-2"
                }
                onClick={() => setIsMenuOpen(false)}
              >
                Send Feedback
              </NavLink>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
