
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { realtimeService } from '@/services/realtimeService';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, RefreshCw } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger
} from '@/components/ui/tabs';
import { 
  getAllSupportTickets, 
  respondToSupportTicket,
  SupportTicket
} from '@/services/supportService';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface FeedbackItem extends SupportTicket {
  user?: {
    email: string;
    name: string;
  };
}

const statusVariants = {
  open: 'bg-red-100 text-red-800 border-red-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
};

const SupportDashboard: React.FC = () => {
  const [tickets, setTickets] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<FeedbackItem | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [responseStatus, setResponseStatus] = useState<'in_progress' | 'resolved' | 'closed'>('resolved');
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const channelRef = useRef<any>(null);
  
  const loadTickets = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      console.log('Loading support tickets...');
      const allTickets = await getAllSupportTickets();
      console.log('Loaded tickets:', allTickets);
      setTickets(allTickets as FeedbackItem[]);
      
      if (allTickets.length === 0) {
        console.log('No tickets found - this might indicate an issue with the query or permissions');
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    loadTickets();
  }, []);

  // Real-time subscription with debounced refresh and smart fallback polling
  useEffect(() => {
    console.log('Setting up real-time subscription for support tickets...');
    let refreshTimeout: NodeJS.Timeout;
    let pollingInterval: NodeJS.Timeout;
    let fallbackTimer: NodeJS.Timeout;
    let eventsSeen = false;
    
    // Debounced refresh function to avoid over-fetching
    const debouncedRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        loadTickets(true);
      }, 1000); // Debounce for 1 second
    };
    
    // Smart fallback polling that only runs when needed
    const startFallbackPolling = () => {
      if (!eventsSeen && !pollingInterval) {
        console.log('Starting fallback polling - no real-time events detected');
        pollingInterval = setInterval(() => {
          if (!eventsSeen) {
            console.log('Fallback polling - real-time appears disconnected');
            loadTickets(true);
          } else {
            // Stop polling if events resume
            console.log('Real-time events detected, stopping fallback polling');
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = undefined as any;
            }
          }
        }, 60000);
      }
    };
    
    // Set up real-time subscription using the service
    const subscription = realtimeService.subscribeToSupportTickets((payload) => {
      console.log('Support ticket real-time update:', payload);
      
      // Mark that we've seen real-time events
      if (!eventsSeen) {
        eventsSeen = true;
        console.log('First real-time event detected, canceling fallback timer');
        if (fallbackTimer) clearTimeout(fallbackTimer);
        
        // Stop any existing polling since real-time is working
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = undefined as any;
          console.log('Stopped fallback polling - real-time is active');
        }
      }
      
      // Use debounced refresh to prevent over-fetching
      debouncedRefresh();
      
      // Show toast notifications only for new tickets (not admin updates)
      if (payload.eventType === 'INSERT') {
        toast.success('New support ticket received!', {
          description: payload.new?.subject || 'A new ticket has been submitted'
        });
      } else if (payload.eventType === 'UPDATE' && payload.old?.status !== payload.new?.status) {
        // Only show for status changes to reduce noise
        toast.info('Support ticket status updated', {
          description: `Status changed to: ${payload.new?.status || 'updated'}`
        });
      }
    });
    
    setIsRealTimeConnected(true);
    channelRef.current = subscription.channel;
    
    // Only start fallback timer if no events seen after 15 seconds
    fallbackTimer = setTimeout(() => {
      if (!eventsSeen) {
        startFallbackPolling();
      }
    }, 15000);
    
    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      if (pollingInterval) clearInterval(pollingInterval);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      
      subscription.unsubscribe();
      setIsRealTimeConnected(false);
      console.log('Cleaned up support tickets real-time subscription');
    };
  }, []);
  
  const handleRespond = (ticket: FeedbackItem) => {
    setSelectedTicket(ticket);
    setResponseText(ticket.admin_response || '');
    setResponseStatus(ticket.status === 'open' ? 'in_progress' : 'resolved');
    setResponseDialogOpen(true);
  };
  
  const handleSubmitResponse = async () => {
    if (!selectedTicket || !responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const result = await respondToSupportTicket(
        selectedTicket.id, 
        responseText, 
        responseStatus
      );
      
      if (result.success) {
        toast.success('Response submitted successfully');
        setResponseDialogOpen(false);
        loadTickets(); // Reload tickets to get the updated list
      } else {
        toast.error(result.error || 'Failed to submit response');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Filter tickets by status - treat 'open' as pending
  const pendingTickets = tickets.filter(t => ['open', 'pending'].includes(t.status));
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress');
  const resolvedTickets = tickets.filter(t => ['resolved', 'closed'].includes(t.status));

  const getStatusBadge = (status: string) => {
    const statusKey = status === 'open' ? 'pending' : status;
    const variant = statusVariants[statusKey as keyof typeof statusVariants] || statusVariants.pending;
    
    return (
      <Badge className={variant}>
        {status === 'in_progress' ? 'In Progress' : 
         status === 'open' ? 'New' :
         status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  const TicketTable: React.FC<{ items: FeedbackItem[] }> = ({ items }) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No tickets found in this category</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">User</TableHead>
              <TableHead className="min-w-[200px]">Subject</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="min-w-[120px]">Date</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(ticket => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <div className="font-medium">{ticket.user?.name || 'Unknown User'}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[140px]">
                    {ticket.user?.email || 'No email'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium line-clamp-2">{ticket.subject}</div>
                </TableCell>
                <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(ticket.submitted_at || ticket.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleRespond(ticket)}
                    className="text-xs"
                  >
                    {ticket.admin_response ? 'Update' : 'Respond'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Support Dashboard</CardTitle>
            <CardDescription>Manage user support tickets and feedback</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadTickets(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading tickets...</span>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Total tickets: {tickets.length} | 
              Pending: {pendingTickets.length} | 
              In Progress: {inProgressTickets.length} | 
              Resolved: {resolvedTickets.length}
            </div>
            
            <Tabs defaultValue="pending">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="pending" className="relative">
                  Pending
                  {pendingTickets.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                      {pendingTickets.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="in-progress">
                  In Progress
                  {inProgressTickets.length > 0 && (
                    <span className="ml-1 text-blue-600">({inProgressTickets.length})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="resolved">
                  Resolved
                  {resolvedTickets.length > 0 && (
                    <span className="ml-1 text-green-600">({resolvedTickets.length})</span>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending">
                <TicketTable items={pendingTickets} />
              </TabsContent>
              
              <TabsContent value="in-progress">
                <TicketTable items={inProgressTickets} />
              </TabsContent>
              
              <TabsContent value="resolved">
                <TicketTable items={resolvedTickets} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
      
      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-gray-500">From</h4>
              <div>
                <div className="font-medium">{selectedTicket?.user?.name || 'Unknown User'}</div>
                <div className="text-sm text-gray-500">{selectedTicket?.user?.email || 'No email'}</div>
              </div>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-gray-500">User Message</h4>
              <div className="p-3 bg-gray-50 rounded-md text-sm max-h-32 overflow-y-auto">
                {selectedTicket?.message}
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-500" htmlFor="response">
                Your Response
              </label>
              <Textarea 
                id="response"
                value={responseText} 
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Type your response here..."
                rows={4}
                className="resize-none"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-500">
                Update Status
              </label>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  type="button"
                  variant={responseStatus === 'in_progress' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setResponseStatus('in_progress')}
                >
                  In Progress
                </Button>
                <Button 
                  type="button"
                  variant={responseStatus === 'resolved' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setResponseStatus('resolved')}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Resolved
                </Button>
                <Button 
                  type="button"
                  variant={responseStatus === 'closed' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setResponseStatus('closed')}
                >
                  <X className="mr-1 h-3 w-3" />
                  Closed
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setResponseDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitResponse}
              disabled={submitting || !responseText.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Response'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SupportDashboard;
