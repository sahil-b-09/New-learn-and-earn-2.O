
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  is_global: boolean;
}

interface NotificationCenterProps {
  onClose?: () => void;
}

const OptimizedNotificationCenter: React.FC<NotificationCenterProps> = React.memo(({ onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const { data: notificationsData, isLoading } = useOptimizedQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},is_global.eq.true`)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to 50 notifications for performance

      if (error) throw error;
      return data || [];
    },
    dependencies: [user?.id],
    enabled: !!user,
  });

  useEffect(() => {
    if (notificationsData) {
      setNotifications(notificationsData);
    }
  }, [notificationsData]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      
      if (unreadIds.length === 0) {
        toast.info('No unread notifications');
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  }, [notifications]);

  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  }, []);

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.is_read).length, [notifications]
  );

  if (isLoading) {
    return (
      <div className="w-full p-4">
        <div className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-t-[#00C853] border-gray-200 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          Notifications
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </h3>
        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            variant="outline"
            size="sm"
            className="flex items-center"
          >
            <Check className="h-4 w-4 mr-1" />
            Mark All Read
          </Button>
        )}
      </div>
      
      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border transition-colors ${
                notification.is_read 
                  ? 'bg-gray-50 border-gray-200' 
                  : 'bg-white border-blue-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {notification.title}
                    </h4>
                    <Badge className={`${getTypeColor(notification.type)} text-xs`}>
                      {notification.type}
                    </Badge>
                    {!notification.is_read && (
                      <Badge variant="destructive" className="text-xs">New</Badge>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm mb-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {!notification.is_read && (
                    <Button
                      onClick={() => markAsRead(notification.id)}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-800 h-8 w-8 p-0"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    onClick={() => deleteNotification(notification.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

OptimizedNotificationCenter.displayName = 'OptimizedNotificationCenter';

export default OptimizedNotificationCenter;
