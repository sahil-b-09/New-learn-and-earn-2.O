
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { createSupportTicket } from '@/services/supportService';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface SupportRequestFormProps {
  onSubmitSuccess?: () => void;
}

const SupportRequestForm: React.FC<SupportRequestFormProps> = ({ onSubmitSuccess }) => {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to submit a support ticket');
      return;
    }
    
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in both subject and message fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await createSupportTicket(subject, message);
      
      if (result.success) {
        toast.success('Support ticket submitted successfully');
        setSubject('');
        setMessage('');
        if (onSubmitSuccess) {
          onSubmitSuccess();
        }
      } else {
        toast.error(result.error || 'Failed to submit support ticket');
      }
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
          Subject
        </label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief description of your issue"
          disabled={isSubmitting}
          required
        />
      </div>
      
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          Message
        </label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Please provide details about your issue or question"
          disabled={isSubmitting}
          rows={5}
          required
        />
      </div>
      
      <Button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full bg-[#2962FF] hover:bg-blue-600"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Ticket'
        )}
      </Button>
    </form>
  );
};

export default SupportRequestForm;
