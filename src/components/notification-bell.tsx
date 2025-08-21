
"use client";

import { useState, useEffect } from 'react';
import { Bell, CheckCheck, CircleAlert, Info, BellRing } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { useAuth } from '@/context/AuthContext';
import { getNotifications, markAllNotificationsAsRead } from '@/lib/goals-service';
import type { Notification, NotificationType } from '@/types';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  important: <CircleAlert className="h-5 w-5 text-destructive" />,
  reminder: <BellRing className="h-5 w-5 text-primary" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
};

export function NotificationBell() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      const unsubscribe = getNotifications(
        user.uid,
        (notifs) => {
          setNotifications(notifs);
          setUnreadCount(notifs.filter((n) => !n.isRead).length);
        },
        (error) => {
          console.error('Failed to get notifications:', error);
          toast({
            variant: 'destructive',
            title: 'Could not load notifications',
          });
        }
      );
      return () => unsubscribe();
    }
  }, [user, toast]);

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      await markAllNotificationsAsRead(user.uid);
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      toast({
        variant: 'destructive',
        title: 'Error updating notifications',
      });
    }
  };
  
  const handleNotificationClick = (notification: Notification) => {
    // Here we would ideally also mark the single notification as read
    if (notification.link) {
      router.push(notification.link);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold font-headline">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-96">
            {notifications.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-20">
                    <p>No notifications yet.</p>
                </div>
            ) : (
                <div className="divide-y">
                    {notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={cn(
                                'flex items-start gap-4 p-4 transition-colors hover:bg-muted/50',
                                notif.link && 'cursor-pointer'
                            )}
                             onClick={() => handleNotificationClick(notif)}
                        >
                            {!notif.isRead && (
                                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                            )}
                            <div className={cn("flex-shrink-0", notif.isRead && 'ml-4')}>
                                {notificationIcons[notif.type]}
                            </div>
                            <div className="flex-grow">
                                <p className="font-semibold text-sm">{notif.title}</p>
                                <p className="text-sm text-muted-foreground">{notif.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
