
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name: string;
}

interface AdminActionDialogProps {
  open: boolean;
  action: 'makeAdmin' | 'removeAdmin' | null;
  user: UserData | null;
  processing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AdminActionDialog: React.FC<AdminActionDialogProps> = ({
  open,
  action,
  user,
  processing,
  onConfirm,
  onCancel
}) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === 'makeAdmin' 
              ? 'Grant Admin Privileges' 
              : 'Remove Admin Privileges'}
          </DialogTitle>
          <DialogDescription>
            {action === 'makeAdmin'
              ? `Are you sure you want to grant admin privileges to ${user?.name || user?.email}? This will give them access to all administrative functions.`
              : `Are you sure you want to remove admin privileges from ${user?.name || user?.email}? They will no longer have access to administrative functions.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant={action === 'makeAdmin' ? "default" : "destructive"}
            onClick={onConfirm}
            disabled={processing}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : action === 'makeAdmin' ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Confirm
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Remove Admin
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
