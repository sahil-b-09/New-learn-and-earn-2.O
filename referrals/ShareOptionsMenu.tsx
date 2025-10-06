
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, Send } from 'lucide-react';

interface ShareOptionsMenuProps {
  referralCode: string;
  courseTitle: string;
  onShare: (platform: string) => void;
}

const ShareOptionsMenu: React.FC<ShareOptionsMenuProps> = ({ 
  referralCode, 
  courseTitle,
  onShare 
}) => {
  const baseMessage = `Check out "${courseTitle}" on Learn & Earn! Use my referral code ${referralCode} to get started. https://learn-and-earn.in?ref=${referralCode}`;
  
  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(baseMessage)}`;
    window.open(whatsappUrl, '_blank');
    onShare('WhatsApp');
  };
  
  const handleSMSShare = () => {
    const smsUrl = `sms:?body=${encodeURIComponent(baseMessage)}`;
    window.open(smsUrl, '_blank');
    onShare('SMS');
  };
  
  const handleTelegramShare = () => {
    const telegramUrl = `https://t.me/share/url?url=https://learn-and-earn.in?ref=${referralCode}&text=${encodeURIComponent(baseMessage)}`;
    window.open(telegramUrl, '_blank');
    onShare('Telegram');
  };

  return (
    <div className="flex flex-col space-y-2">
      <Button
        onClick={handleWhatsAppShare}
        className="flex items-center justify-start bg-green-500 hover:bg-green-600 text-white"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        Share on WhatsApp
      </Button>
      
      <Button
        onClick={handleSMSShare}
        className="flex items-center justify-start bg-blue-500 hover:bg-blue-600 text-white"
      >
        <Phone className="h-4 w-4 mr-2" />
        Share via SMS
      </Button>
      
      <Button
        onClick={handleTelegramShare}
        className="flex items-center justify-start bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Send className="h-4 w-4 mr-2" />
        Share on Telegram
      </Button>
    </div>
  );
};

export default ShareOptionsMenu;
