import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const VAPID_PUBLIC_KEY = 'BAvq-WuZJB-VodxTSYg1_D1lR1evnQKyAhdX7pRqHldh5xULViQ8iuW5eQJGhzIKran7MMd86EqHq44vPHiPyKg';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
    checkSubscription();
  }, [user]);

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !user) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setSubscribed(!!sub);
  };

  const subscribe = async (): Promise<boolean> => {
    if (!user || !('serviceWorker' in navigator)) return false;

    try {
      const reg = await navigator.serviceWorker.ready;

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = sub.toJSON();

      // Save to Supabase
      await supabase.from('push_subscriptions' as any).upsert({
        user_id:  user.id,
        endpoint: subJson.endpoint,
        p256dh:   (subJson.keys as any)?.p256dh,
        auth:     (subJson.keys as any)?.auth,
        type:     'salon',
      }, { onConflict: 'endpoint' });

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error('Error subscribing to push:', err);
      return false;
    }
  };

  const unsubscribe = async () => {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await supabase.from('push_subscriptions' as any).delete().eq('endpoint', sub.endpoint);
      setSubscribed(false);
    }
  };

  return { permission, subscribed, subscribe, unsubscribe };
}

// For clients (no account) — saves by email
export async function subscribeClientPush(email: string): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const subJson = sub.toJSON();
    await supabase.from('push_subscriptions' as any).upsert({
      client_email: email.toLowerCase(),
      endpoint: subJson.endpoint,
      p256dh:   (subJson.keys as any)?.p256dh,
      auth:     (subJson.keys as any)?.auth,
      type:     'client',
    }, { onConflict: 'endpoint' });

    return true;
  } catch {
    return false;
  }
}
