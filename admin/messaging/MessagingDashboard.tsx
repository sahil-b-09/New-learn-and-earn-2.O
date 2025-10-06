
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotificationComposer from './NotificationComposer';
import TelegramBot from './TelegramBot';
import { Bell, MessageCircle } from 'lucide-react';

const MessagingDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="notifications" className="w-full">
        <TabsList>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="telegram" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span>Telegram Bot</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="notifications" className="mt-6">
          <NotificationComposer />
        </TabsContent>
        
        <TabsContent value="telegram" className="mt-6">
          <TelegramBot />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MessagingDashboard;
