
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SupportRequestForm from './SupportRequestForm';
import UserSupportTickets from './UserSupportTickets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ContactSupportButton: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        className="flex items-center gap-2 border-[#2962FF] text-[#2962FF] hover:bg-[#2962FF]/10"
        onClick={() => setDialogOpen(true)}
      >
        <MessageSquare className="h-4 w-4" />
        Contact Support
      </Button>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Support Center</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="new" className="w-full mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">New Request</TabsTrigger>
              <TabsTrigger value="history">My Tickets</TabsTrigger>
            </TabsList>
            
            <TabsContent value="new" className="mt-4">
              <SupportRequestForm onSubmitSuccess={() => setDialogOpen(false)} />
            </TabsContent>
            
            <TabsContent value="history" className="mt-4">
              <UserSupportTickets />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactSupportButton;
