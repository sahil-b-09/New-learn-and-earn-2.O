import { supabase } from '@/integrations/supabase/client';

export interface RealtimeSubscription {
  channel: any;
  unsubscribe: () => void;
}

export interface TableSubscriptionOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string;
  callback: (payload: any) => void;
}

/**
 * Real-time service for admin dashboard live updates
 * Uses Supabase's real-time features with optimized performance settings
 */
export class RealtimeService {
  private subscriptions: Map<string, any> = new Map();

  /**
   * Subscribe to real-time changes on a database table
   */
  subscribeToTable({
    table,
    event = '*',
    schema = 'public',
    filter,
    callback
  }: TableSubscriptionOptions): RealtimeSubscription {
    const channelName = `${table}-changes-${Date.now()}`;
    
    // Use the exact same pattern as HeaderWithNotifications.tsx
    const subscriptionConfig = {
      event,
      schema,
      table,
      ...(filter && { filter })
    };
    
    const channel = (supabase as any)
      .channel(channelName)
      .on('postgres_changes', subscriptionConfig, callback)
      .subscribe();

    this.subscriptions.set(channelName, channel);

    return {
      channel,
      unsubscribe: () => {
        supabase.removeChannel(channel);
        this.subscriptions.delete(channelName);
      }
    };
  }

  /**
   * Subscribe to support tickets changes for admin dashboard
   */
  subscribeToSupportTickets(callback: (payload: any) => void): RealtimeSubscription {
    return this.subscribeToTable({
      table: 'support_tickets',
      callback: (payload) => {
        console.log('Support ticket change:', payload);
        callback(payload);
      }
    });
  }

  /**
   * Subscribe to payout requests changes for admin dashboard
   */
  subscribeToPayoutRequests(callback: (payload: any) => void): RealtimeSubscription {
    return this.subscribeToTable({
      table: 'payout_requests',
      callback: (payload) => {
        console.log('Payout request change:', payload);
        callback(payload);
      }
    });
  }

  /**
   * Subscribe to user changes for admin dashboard
   */
  subscribeToUsers(callback: (payload: any) => void): RealtimeSubscription {
    return this.subscribeToTable({
      table: 'users',
      callback: (payload) => {
        console.log('User change:', payload);
        callback(payload);
      }
    });
  }

  /**
   * Subscribe to course purchases for admin dashboard
   */
  subscribeToCoursePurchases(callback: (payload: any) => void): RealtimeSubscription {
    return this.subscribeToTable({
      table: 'course_purchases',
      callback: (payload) => {
        console.log('Course purchase change:', payload);
        callback(payload);
      }
    });
  }

  /**
   * Subscribe to notifications changes
   */
  subscribeToNotifications(userId: string, callback: (payload: any) => void): RealtimeSubscription {
    return this.subscribeToTable({
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
      callback: (payload) => {
        console.log('Notification change:', payload);
        callback(payload);
      }
    });
  }

  /**
   * Subscribe to referral earnings changes
   */
  subscribeToReferralEarnings(callback: (payload: any) => void): RealtimeSubscription {
    return this.subscribeToTable({
      table: 'referral_earnings',
      callback: (payload) => {
        console.log('Referral earning change:', payload);
        callback(payload);
      }
    });
  }

  /**
   * Subscribe to wallet transactions for financial dashboard
   */
  subscribeToWalletTransactions(callback: (payload: any) => void): RealtimeSubscription {
    return this.subscribeToTable({
      table: 'wallet_transactions',
      callback: (payload) => {
        console.log('Wallet transaction change:', payload);
        callback(payload);
      }
    });
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
    console.log('All real-time subscriptions removed');
  }

  /**
   * Get count of active subscriptions for monitoring
   */
  getActiveSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();

/**
 * React hook for easy real-time subscription management
 */
export const useRealtimeSubscription = (
  subscribeFunction: (callback: (payload: any) => void) => RealtimeSubscription,
  callback: (payload: any) => void,
  dependencies: any[] = []
) => {
  const [isConnected, setIsConnected] = React.useState(false);

  React.useEffect(() => {
    setIsConnected(true);
    const subscription = subscribeFunction(callback);

    return () => {
      subscription.unsubscribe();
      setIsConnected(false);
    };
  }, dependencies);

  return { isConnected };
};

// Import React for the hook
import React from 'react';