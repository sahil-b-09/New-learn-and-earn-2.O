
import React from 'react';
import HeaderWithNotifications from '@/components/layout/HeaderWithNotifications';
import Footer from '@/components/layout/Footer';
import FeedbackForm from '@/components/feedback/FeedbackForm';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Feedback: React.FC = () => {
  const navigate = useNavigate();
  
  const handleSuccess = () => {
    // Show success message and redirect after a delay
    setTimeout(() => navigate('/dashboard'), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <HeaderWithNotifications />
      <main className="max-w-[993px] mx-auto my-0 px-6 py-8 max-sm:p-4 w-full flex-grow">
        <div className="mb-6 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#00C853]" />
          <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left column - Feedback form */}
          <div className="w-full md:w-2/3">
            <FeedbackForm onSuccess={handleSuccess} />
          </div>
          
          {/* Right column - Information */}
          <div className="w-full md:w-1/3">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">Why Your Feedback Matters</h3>
              <p className="text-blue-700 mb-4">
                As a growing platform, we value your insights and suggestions. Your feedback helps us:
              </p>
              <ul className="list-disc list-inside text-blue-600 space-y-2 text-sm">
                <li>Improve course content and quality</li>
                <li>Enhance user experience</li>
                <li>Fix issues you might encounter</li>
                <li>Add features you care about</li>
              </ul>
            </div>
            
            <div className="mt-6 bg-green-50 p-6 rounded-lg border border-green-100">
              <h3 className="text-lg font-semibold text-green-800 mb-3">Earn While You Learn</h3>
              <p className="text-green-700">
                Remember, you can earn 50% commission on every referral. Share your unique referral link with friends and earn while they learn!
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Feedback;
