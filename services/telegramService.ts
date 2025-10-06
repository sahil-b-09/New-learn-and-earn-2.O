
import { supabase } from '@/integrations/supabase/client';

export interface PayoutNotification {
  user_id: string;
  user_email: string;
  amount: number;
  payout_method: string;
  request_id: string;
}

// Send payout notification via Telegram bot
export async function sendPayoutNotification(payoutData: PayoutNotification): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('telegram-payout-notification', {
      body: {
        user_id: payoutData.user_id,
        user_email: payoutData.user_email,
        amount: payoutData.amount,
        payout_method: payoutData.payout_method,
        request_id: payoutData.request_id
      }
    });

    if (error) {
      console.error('Error sending Telegram notification:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Notification sent successfully' };
  } catch (error) {
    console.error('Exception sending Telegram notification:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Send test message to verify bot connection
export async function sendTestMessage(): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('telegram-test', {
      body: { message: 'Test message from Learn & Earn platform' }
    });

    if (error) {
      console.error('Error sending test message:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Test message sent successfully' };
  } catch (error) {
    console.error('Exception sending test message:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
