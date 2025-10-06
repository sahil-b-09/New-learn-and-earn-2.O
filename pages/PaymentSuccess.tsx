
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import UnifiedHeader from '@/components/layout/UnifiedHeader';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';

const PaymentSuccess: React.FC = React.memo(() => {
  const { state } = useLocation();
  const navigate = useNavigate();
  
  // Extract course information from location state
  const courseTitle = state?.courseTitle || 'your course';
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <UnifiedHeader />
      <main className="max-w-[993px] mx-auto my-0 px-6 py-8 max-sm:p-4 w-full flex-grow">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <div className="bg-green-50 h-24 w-24 rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg className="h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
          
          <p className="text-gray-600 mb-6">
            Thank you for purchasing {courseTitle}. You can now access your course from the My Courses section.
          </p>
          
          <div className="bg-yellow-50 p-4 rounded-lg mb-6 text-left">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              Share & Earn
            </h2>
            <p className="text-yellow-700 mb-4">
              Share your unique referral code with friends and earn 50% commission on every successful purchase!
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => navigate('/my-courses')}
            >
              View My Courses
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/referrals')}
            >
              Manage Referrals
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
});

PaymentSuccess.displayName = 'PaymentSuccess';

export default PaymentSuccess;
