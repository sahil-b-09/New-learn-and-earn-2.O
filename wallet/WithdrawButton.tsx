
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface WithdrawButtonProps {
  balance: number;
  isProcessing: boolean;
  onClick: () => Promise<void>;
}

const WithdrawButton: React.FC<WithdrawButtonProps> = ({ 
  balance, 
  isProcessing, 
  onClick 
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={isProcessing}
      className="w-full bg-[#00C853] hover:bg-[#00B248] text-white mt-4"
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        `Withdraw ₹${balance} Now`
      )}
    </Button>
  );
};

export default WithdrawButton;
