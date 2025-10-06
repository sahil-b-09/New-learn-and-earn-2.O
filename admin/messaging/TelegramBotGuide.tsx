
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, Copy, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const TelegramBotGuide: React.FC = () => {
  const [copied, setCopied] = useState(false);
  
  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
            <path d="m21.73 2.27-4.08 15.96c-.34 1.31-2.26 1.5-2.91.29L12 13.17" />
            <path d="m11 13.17-6-2.51c-2.5-1.04-2.39-4.55.18-5.44L19.05 2.01c1.46-.51 2.8.74 2.69 2.26" />
          </svg>
          Telegram Bot Payout Guide
        </CardTitle>
        <CardDescription>
          Using the Telegram bot to manage and confirm payouts
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            The Telegram bot provides secure authorization for payout confirmations. Only authorized admin
            Telegram accounts can use these commands.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Setup Status</h3>
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              <span>Bot is configured and ready to use</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Available Commands</h3>
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-md border">
                <div className="flex items-center justify-between">
                  <code className="font-mono">/help</code>
                  <Button variant="ghost" size="sm" onClick={() => copyCommand('/help')}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-1">Shows available commands and instructions</p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md border">
                <div className="flex items-center justify-between">
                  <code className="font-mono">/confirm_payout [payout_id]</code>
                  <Button variant="ghost" size="sm" onClick={() => copyCommand('/confirm_payout')}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Initiates confirmation of a payout. Replace [payout_id] with the actual ID.
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md border">
                <div className="flex items-center justify-between">
                  <code className="font-mono">YES [payout_id]</code>
                  <Button variant="ghost" size="sm" onClick={() => copyCommand('YES')}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Final confirmation after the initial /confirm_payout command
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Payout Flow</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>From the Payments Dashboard, locate a pending payout you want to process</li>
              <li>Copy the payout ID from the details view</li>
              <li>Open your Telegram chat with the bot</li>
              <li>Send the command: <code className="bg-gray-100 p-1 rounded">/confirm_payout [payout_id]</code></li>
              <li>Bot will display payout details and ask for final confirmation</li>
              <li>Send <code className="bg-gray-100 p-1 rounded">YES [payout_id]</code> to complete the transaction</li>
              <li>The bot will update the payout status and user's wallet balance</li>
              <li>A notification will be sent to the user about their successful payout</li>
            </ol>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Security Measures</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Two-step confirmation process prevents accidental payouts</li>
              <li>Only authorized admin Telegram IDs can trigger commands</li>
              <li>All payout actions are logged for audit purposes</li>
              <li>Confirmation requests expire after 10 minutes</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TelegramBotGuide;
