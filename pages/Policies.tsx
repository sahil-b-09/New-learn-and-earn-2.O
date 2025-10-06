
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderWithNotifications from '@/components/layout/HeaderWithNotifications';
import Footer from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

const Policies: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('privacy');
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <HeaderWithNotifications />
      <main className="max-w-[993px] mx-auto px-6 py-8 w-full flex-grow">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Policies</h1>
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <Tabs defaultValue="privacy" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 md:grid-cols-5 mb-6">
              <TabsTrigger value="privacy" className="text-xs md:text-sm">Privacy</TabsTrigger>
              <TabsTrigger value="terms" className="text-xs md:text-sm">Terms & Conditions</TabsTrigger>
              <TabsTrigger value="refund" className="text-xs md:text-sm">Refund Policy</TabsTrigger>
              <TabsTrigger value="delivery" className="text-xs md:text-sm">Delivery</TabsTrigger>
              <TabsTrigger value="contact" className="text-xs md:text-sm">Contact Us</TabsTrigger>
            </TabsList>
          
            {/* Privacy Policy */}
            <TabsContent value="privacy" className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Privacy Policy</h2>
              <div className="text-sm text-gray-700 space-y-3">
                <p>
                  We collect limited personal information from users (name, email, and phone number) for account access and communication.
                </p>
                <p>
                  All data is securely stored using Supabase and is never sold or shared with third parties.
                </p>
                <p>
                  By using our app, you agree to the collection and use of information in accordance with this policy.
                </p>
              </div>
            </TabsContent>
            
            {/* Terms & Conditions */}
            <TabsContent value="terms" className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Terms and Conditions</h2>
              <div className="text-sm text-gray-700 space-y-3">
                <p>
                  By purchasing any course through Learn and Earn, you agree to abide by our referral system and usage terms.
                </p>
                <p>
                  Users are responsible for keeping their login credentials secure.
                </p>
                <p>
                  Learn and Earn reserves the right to update features, pricing, and policies at any time.
                </p>
              </div>
            </TabsContent>
            
            {/* Refund Policy */}
            <TabsContent value="refund" className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Cancellation and Refund Policy</h2>
              <div className="text-sm text-gray-700 space-y-3">
                <p>
                  We do <strong>not</strong> offer cancellations or refunds after payment is made. All sales are final.
                </p>
                <p>
                  Please ensure that you are confident before purchasing any of our digital courses.
                </p>
              </div>
            </TabsContent>
            
            {/* Delivery */}
            <TabsContent value="delivery" className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Shipping and Delivery Policy</h2>
              <div className="text-sm text-gray-700 space-y-3">
                <p>
                  All products sold on Learn and Earn are <strong>digital PDF files</strong>.
                </p>
                <p>
                  Once payment is successful, instant access is granted via email or through the user dashboard.
                </p>
                <p>
                  No physical shipping is involved.
                </p>
              </div>
            </TabsContent>
            
            {/* Contact Us */}
            <TabsContent value="contact" className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Contact Us</h2>
              <div className="text-sm text-gray-700 space-y-3">
                <p>
                  If you have any questions or need support, please email us at:
                </p>
                <p className="font-medium">
                  📩 <a href="mailto:learnandearn776@gmail.com" className="text-[#00C853] hover:underline">learnandearn776@gmail.com</a>
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Policies;
