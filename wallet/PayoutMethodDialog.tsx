
import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import PayoutMethodsList from './PayoutMethodsList';

interface PayoutMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMethodAdded?: () => void;
}

const PayoutMethodDialog: React.FC<PayoutMethodDialogProps> = ({ 
  open, 
  onOpenChange,
  onMethodAdded 
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payout Method</DialogTitle>
          <DialogDescription>
            You need to add a payout method before you can withdraw funds.
          </DialogDescription>
        </DialogHeader>
        <PayoutMethodsList onMethodAdded={onMethodAdded} />
      </DialogContent>
    </Dialog>
  );
};

export default PayoutMethodDialog;
