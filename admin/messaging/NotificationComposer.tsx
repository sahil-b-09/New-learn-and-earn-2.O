
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { createNotificationForAll } from '@/services/notificationService';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const NotificationComposer: React.FC = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<string>('info');
  const [actionUrl, setActionUrl] = useState('');
  const [actionText, setActionText] = useState('');
  const [includeAction, setIncludeAction] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      toast.error('Please provide both title and message');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await createNotificationForAll(
        title,
        message,
        type as any, // This will work with our type definition in the service
        includeAction ? actionUrl : undefined,
        includeAction ? actionText : undefined
      );
      
      if (result.success) {
        toast.success(`Notification sent to ${result.count} users`);
        // Reset form
        setTitle('');
        setMessage('');
        setType('info');
        setActionUrl('');
        setActionText('');
        setIncludeAction(false);
      } else {
        toast.error(result.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Notification</CardTitle>
        <CardDescription>Create and send a notification to all users</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              placeholder="Notification title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Message
            </label>
            <Textarea
              id="message"
              placeholder="Notification message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px]"
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium">
              Type
            </label>
            <Select
              value={type}
              onValueChange={(value) => setType(value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Information</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              id="includeAction"
              type="checkbox"
              checked={includeAction}
              onChange={() => setIncludeAction(!includeAction)}
              className="rounded border-gray-300"
              disabled={isSubmitting}
            />
            <label htmlFor="includeAction" className="text-sm font-medium">
              Include action button
            </label>
          </div>
          
          {includeAction && (
            <div className="space-y-4 pl-6 border-l-2 border-gray-100">
              <div className="space-y-2">
                <label htmlFor="actionUrl" className="text-sm font-medium">
                  Action URL
                </label>
                <Input
                  id="actionUrl"
                  placeholder="https://example.com"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  disabled={isSubmitting}
                  required={includeAction}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="actionText" className="text-sm font-medium">
                  Button Text
                </label>
                <Input
                  id="actionText"
                  placeholder="View Details"
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  disabled={isSubmitting}
                  required={includeAction}
                />
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full bg-[#00C853] hover:bg-[#00A846]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Notification'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default NotificationComposer;
