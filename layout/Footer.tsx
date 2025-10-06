import React from 'react';
import { Link } from 'react-router-dom';
import learnandearnLogo from '/lovable-uploads/629a36a7-2859-4c33-9657-12a1dfea41ed.png';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-100 py-6 mt-auto border-t border-gray-200">
      <div className="max-w-[993px] mx-auto px-6 max-sm:p-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link to="/" className="flex items-center">
              <img 
                src={learnandearnLogo} 
                alt="Learn and Earn Logo" 
                className="h-9 w-auto mr-2"
                style={{
                  filter: "brightness(1.2) contrast(1.2)",
                  maxWidth: "120px",
                }}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </Link>
          </div>
          <div className="text-center md:text-left mb-4 md:mb-0">
            <ul className="flex flex-wrap justify-center md:justify-start space-x-4">
              <li>
                <Link to="/policies" className="text-sm text-gray-600 hover:text-[#00C853]">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/policies" className="text-sm text-gray-600 hover:text-[#00C853]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/policies" className="text-sm text-gray-600 hover:text-[#00C853]">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm text-gray-600">
              Contact: <a href="mailto:learnandearn776@gmail.com" className="hover:text-[#00C853]">learnandearn776@gmail.com</a>
            </p>
          </div>
        </div>
        <div className="text-xs text-center mt-4 text-gray-500">
          © {new Date().getFullYear()} Learn and Earn. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
