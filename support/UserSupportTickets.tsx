
import React, { useEffect, useState } from 'react';
import { getUserSupportTickets, SupportTicket } from '@/services/supportService';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

const statusVariants = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
};

const UserSupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  
  useEffect(() => {
    const loadTickets = async () => {
      setLoading(true);
      const data = await getUserSupportTickets();
      setTickets(data);
      setLoading(false);
    };
    
    loadTickets();
  }, []);
  
  const getStatusBadge = (status: string) => {
    const variant = statusVariants[status as keyof typeof statusVariants] || statusVariants.pending;
    
    return (
      <Badge className={variant}>
        {status === 'in_progress' ? 'In Progress' : 
         status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (tickets.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="h-8 w-8 mx-auto text-gray-300 mb-2" />
        <p className="text-gray-500">You haven't submitted any support tickets yet.</p>
      </div>
    );
  }
  
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map(ticket => (
            <TableRow key={ticket.id}>
              <TableCell className="font-medium">{ticket.subject}</TableCell>
              <TableCell>{getStatusBadge(ticket.status)}</TableCell>
              <TableCell className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(ticket.submitted_at), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedTicket(ticket)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Ticket Details Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Submitted {selectedTicket && formatDistanceToNow(new Date(selectedTicket.submitted_at), { addSuffix: true })}
              </span>
              {getStatusBadge(selectedTicket?.status || 'pending')}
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Your message:</h4>
              <div className="p-3 bg-gray-50 rounded-md text-sm">
                {selectedTicket?.message}
              </div>
            </div>
            
            {selectedTicket?.admin_response && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Response:</h4>
                <div className="p-3 bg-blue-50 rounded-md text-sm">
                  {selectedTicket.admin_response}
                </div>
                <span className="text-xs text-gray-500 block">
                  {selectedTicket.responded_at && 
                    `Responded ${formatDistanceToNow(new Date(selectedTicket.responded_at), { addSuffix: true })}`
                  }
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserSupportTickets;
