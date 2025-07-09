interface PushNotificationPayload {
  title: string;
  body: string;
  data: {
    type: string;
    deep_link: string;
    message_id: string;
  };
  sound: boolean;
  badge: number;
  categoryId: string;
}

interface NotificationOption {
  title: string;
  body: string;
}

export class PushNotificationService {
  private static readonly EDGE_FUNCTION_URL = 'https://nwfhqrmdjmjopbxulyhu.supabase.co/functions/v1/broadcast_push_notification';
  private static readonly AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53Zmhxcm1kam1qb3BieHVseWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNjc5MDMsImV4cCI6MjA2MTg0MzkwM30.NvbyIKp7BxALfO0SBpdFcbCXXhPcOJ_4YJY8HPyVlzs';

  private static readonly NOTIFICATION_POOL: NotificationOption[] = [
    {
      title: "Let's Go! 🔥",
      body: "Your new bounty is live. One small action today, big change tomorrow."
    },
    {
      title: "Mission Accepted 🧭",
      body: "You've picked your quest. Take the first step — it matters."
    },
    {
      title: "In Motion 💫",
      body: "You just sparked momentum. Stick with it — small moves count."
    },
    {
      title: "Today's Adventure Awaits 🌿",
      body: "Your bounty is active. A moment for you, today."
    },
    {
      title: "Keep the Flame Alive 🔥",
      body: "Progress grows with consistency. You're closer than you think."
    },
    {
      title: "Still Time to Show Up 🕰️",
      body: "Your bounty is waiting. A small win is still a win."
    },
    {
      title: "Momentum Over Perfection 💡",
      body: "Didn't get to it yet? One small action still shifts the day."
    },
    {
      title: "Little Efforts Add Up 📈",
      body: "You're doing the work — keep showing up, even if it's messy."
    }
  ];

  private static getRandomNotification(): NotificationOption {
    const randomIndex = Math.floor(Math.random() * this.NOTIFICATION_POOL.length);
    return this.NOTIFICATION_POOL[randomIndex];
  }

  static async sendBountySubmissionNotification(): Promise<void> {
    const randomNotification = this.getRandomNotification();
    
    const payload: PushNotificationPayload = {
      title: randomNotification.title,
      body: randomNotification.body,
      data: {
        type: "bounty_submission",
        deep_link: "app://bounty/active",
        message_id: "bounty_submission_v1"
      },
      sound: true,
      badge: 1,
      categoryId: "bounty_action"
    };

    try {
      const response = await fetch(this.EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Push notification sent successfully');
    } catch (error) {
      console.error('Error sending push notification:', error);
      // Don't throw the error to avoid breaking the main flow
      // The notification failure shouldn't prevent the bounty submission
    }
  }
} 