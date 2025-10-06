
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

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

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user?.id},is_global.eq.true`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

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
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        toast.error('Failed to delete notification');
        return;
      }

      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const markAllAsRead = async () => {
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

      if (error) {
        console.error('Error marking all as read:', error);
        toast.error('Failed to mark all as read');
        return;
      }

      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="p-4">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-t-[#00C853] border-gray-200 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="p-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifications
            {notifications.filter(n => !n.is_read).length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {notifications.filter(n => !n.is_read).length}
              </Badge>
            )}
          </h3>
          {notifications.some(n => !n.is_read) && (
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
            <p className="text-sm text-gray-500">You'll see important updates here</p>
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
                      {notification.is_global && (
                        <Badge variant="outline" className="text-xs">Global</Badge>
                      )}
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
    </div>
  );
};

export default NotificationCenter;
