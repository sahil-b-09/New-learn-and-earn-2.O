
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface MinimumBalanceNoticeProps {
  balance: number;
  minimumAmount?: number;
}

const MinimumBalanceNotice: React.FC<MinimumBalanceNoticeProps> = ({ 
  balance, 
  minimumAmount = 250
}) => {
  return (
    <Card className="bg-yellow-50 border-yellow-200 text-yellow-800 p-4 rounded-lg mt-4 shadow-sm">
      <div className="flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
        <p className="font-medium">Minimum withdrawal amount is ₹{minimumAmount}</p>
      </div>
      <p className="text-sm mt-1 ml-7">Your current balance is ₹{balance}. Earn more to withdraw.</p>
    </Card>
  );
};

export default MinimumBalanceNotice;
