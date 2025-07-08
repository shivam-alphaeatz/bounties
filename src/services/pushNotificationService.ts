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

export class PushNotificationService {
  private static readonly EDGE_FUNCTION_URL = 'https://nwfhqrmdjmjopbxulyhu.supabase.co/functions/v1/broadcast_push_notification';
  private static readonly AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53Zmhxcm1kam1qb3BieHVseWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNjc5MDMsImV4cCI6MjA2MTg0MzkwM30.NvbyIKp7BxALfO0SBpdFcbCXXhPcOJ_4YJY8HPyVlzs';

  static async sendBountySubmissionNotification(): Promise<void> {
    const payload: PushNotificationPayload = {
      title: "You're In! 🎯",
      body: "Your bounty quest has begun. Keep showing up — progress starts now.",
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