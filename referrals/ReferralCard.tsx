
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Share2, MessageCircle, Phone, Send, Copy } from 'lucide-react';

interface ReferralCardProps {
  title: string;
  isLocked: boolean;
  commissionAmount: number;
  referralCode?: string;
  successfulReferrals?: number;
  totalEarned?: number;
  onGetAccess?: () => void;
}

const ReferralCard: React.FC<ReferralCardProps> = ({
  title,
  isLocked,
  commissionAmount,
  referralCode,
  successfulReferrals = 0,
  totalEarned = 0,
  onGetAccess
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [sharePopoverOpen, setSharePopoverOpen] = useState(false);
  const { toast } = useToast();
  
  const handleCopyCode = () => {
    if (!referralCode) return;
    
    navigator.clipboard.writeText(referralCode);
    setIsCopied(true);
    
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
    
    setTimeout(() => setIsCopied(false), 2000);
  };

  const baseMessage = `🎓 Join Learn & Earn and start earning money while learning! 💰\n\nUse my referral code: ${referralCode}\nGet "${title}" and earn with every referral!\n\n👉 Sign up now: https://learn-and-earn.in?ref=${referralCode}`;
  
  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(baseMessage)}`;
    window.open(whatsappUrl, '_blank');
    setSharePopoverOpen(false);
    toast({
      title: "Shared!",
      description: "Referral link shared via WhatsApp",
    });
  };
  
  const handleSMSShare = () => {
    const smsUrl = `sms:?body=${encodeURIComponent(baseMessage)}`;
    window.open(smsUrl, '_blank');
    setSharePopoverOpen(false);
    toast({
      title: "Shared!",
      description: "Referral link shared via SMS",
    });
  };
  
  const handleTelegramShare = () => {
    const telegramUrl = `https://t.me/share/url?url=https://learn-and-earn.in?ref=${referralCode}&text=${encodeURIComponent(`🎓 Join Learn & Earn with my referral code: ${referralCode} and start earning!`)}`;
    window.open(telegramUrl, '_blank');
    setSharePopoverOpen(false);
    toast({
      title: "Shared!",
      description: "Referral link shared via Telegram",
    });
  };

  return (
    <div className={`rounded-lg border ${isLocked ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-100'} p-4 lg:p-6`}>
      <div className="flex flex-col sm:flex-row sm:justify-between mb-4 gap-2">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">Commission: ₹{commissionAmount} per referral</p>
        </div>
        {!isLocked && (
          <div className="bg-blue-50 px-3 py-1 rounded-full text-blue-600 text-sm font-semibold self-start">
            Active
          </div>
        )}
      </div>

      {isLocked ? (
        <div>
          <div className="flex items-center mb-4 text-gray-500">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 11V7C7 5.93913 7.42143 4.92172 8.17157 4.17157C8.92172 3.42143 9.93913 3 11 3H13C14.0609 3 15.0783 3.42143 15.8284 4.17157C16.5786 4.92172 17 5.93913 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Referral locked
          </div>
          <p className="text-sm text-gray-600 mb-4">Purchase this course to unlock referral earnings</p>
          <Button 
            className="w-full bg-[#00C853] hover:bg-green-700"
            onClick={onGetAccess}
          >
            Get Access
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded-md text-center">
              <div className="text-xs text-gray-500 mb-1">Successful Referrals</div>
              <div className="font-bold text-lg">{successfulReferrals}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md text-center">
              <div className="text-xs text-gray-500 mb-1">Total Earned</div>
              <div className="font-bold text-lg text-green-600">₹{totalEarned}</div>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Your Referral Code</label>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-50 border border-gray-200 py-2 px-3 rounded-l-md text-center font-medium text-sm">
                {referralCode}
              </div>
              <button 
                className="bg-blue-50 border border-blue-100 border-l-0 py-2 px-3 rounded-r-md hover:bg-blue-100 transition-colors"
                onClick={handleCopyCode}
              >
                {isCopied ? (
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.6667 5L7.50004 14.1667L3.33337 10" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <Copy className="h-4 w-4 text-blue-600" />
                )}
              </button>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Share with Friends</label>
            <Popover open={sharePopoverOpen} onOpenChange={setSharePopoverOpen}>
              <PopoverTrigger asChild>
                <Button className="w-full bg-[#00C853] hover:bg-[#00B248]">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Course
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="center">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 mb-3 text-center">Share via</h4>
                  
                  <Button
                    onClick={handleWhatsAppShare}
                    className="w-full flex items-center justify-start bg-green-500 hover:bg-green-600 text-white"
                  >
                    <MessageCircle className="h-4 w-4 mr-3" />
                    Share on WhatsApp
                  </Button>
                  
                  <Button
                    onClick={handleSMSShare}
                    className="w-full flex items-center justify-start bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Phone className="h-4 w-4 mr-3" />
                    Share via SMS
                  </Button>
                  
                  <Button
                    onClick={handleTelegramShare}
                    className="w-full flex items-center justify-start bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Send className="h-4 w-4 mr-3" />
                    Share on Telegram
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralCard;
