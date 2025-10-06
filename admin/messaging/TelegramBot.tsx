
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendPayoutResponse {
  success: boolean;
  message: string;
}

const TelegramBot: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SendPayoutResponse | null>(null);
  
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId.trim() || !amount.trim() || !upiId.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Amount must be a positive number');
      return;
    }
    
    setIsLoading(true);
    setResult(null);
    
    try {
      // Call the Supabase Edge Function for payout notification
      const { data, error } = await supabase.functions.invoke('telegram-payout-notification', {
        body: {
          user_id: userId,
          user_email: `user_${userId}@example.com`, // You can fetch actual email from DB
          amount: Number(amount),
          payout_method: `UPI: ${upiId}`,
          request_id: `req_${Date.now()}`
        }
      });
      
      if (error) {
        console.error('Error sending payout notification:', error);
        setResult({
          success: false,
          message: `Error: ${error.message}`
        });
        toast.error('Failed to send payout notification');
        return;
      }
      
      console.log('Payout notification result:', data);
      setResult({
        success: true,
        message: 'Payout notification sent successfully to Telegram'
      });
      toast.success('Payout notification sent successfully');
      
      // Clear form on success
      setUserId('');
      setAmount('');
      setUpiId('');
    } catch (error) {
      console.error('Exception sending payout notification:', error);
      setResult({
        success: false,
        message: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Telegram Payout Notifications</CardTitle>
            <CardDescription>Send payout notifications to admin via Telegram</CardDescription>
          </CardHeader>
          <form onSubmit={handleSendTest}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="userId" className="text-sm font-medium">
                  User ID
                </label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter user ID"
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="amount" className="text-sm font-medium">
                  Payout Amount (₹)
                </label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="upiId" className="text-sm font-medium">
                  UPI ID
                </label>
                <Input
                  id="upiId"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="user@ybl"
                  disabled={isLoading}
                  required
                />
              </div>
              
              {result && (
                <Alert variant={result.success ? "default" : "destructive"}>
                  {result.success ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {result.success ? "Success" : "Error"}
                  </AlertTitle>
                  <AlertDescription>
                    {result.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full bg-[#00C853] hover:bg-[#00A846]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Payout Notification'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
      
      <div>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Setup Checklist</CardTitle>
            <CardDescription>Required configuration for Telegram notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-medium">Required Supabase Secrets:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center p-2 bg-gray-50 rounded">
                  <span className="font-mono">TELEGRAM_BOT_TOKEN</span>
                </div>
                <div className="flex items-center p-2 bg-gray-50 rounded">
                  <span className="font-mono">TELEGRAM_ADMIN_CHAT_ID</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">How to get these values:</h3>
              <ol className="list-decimal list-inside text-sm space-y-1">
                <li>Create a Telegram bot via @BotFather</li>
                <li>Get your Bot Token from BotFather</li>
                <li>Get your Chat ID by messaging @userinfobot</li>
                <li>Add these as secrets in Supabase Dashboard</li>
              </ol>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Workflow:</h3>
              <ol className="list-decimal list-inside text-sm space-y-1">
                <li>User requests payout</li>
                <li>System sends notification to admin via Telegram</li>
                <li>Admin processes payout manually</li>
                <li>Admin updates status in database</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TelegramBot;
