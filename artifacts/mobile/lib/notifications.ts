import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const DAILY_REMINDER_ID = "goldspin-daily-checkin";

// Show banner even when the app is open (foreground)
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Request notification permission (shows OS dialog only once — ignored if
 * already granted or permanently denied).
 */
export async function requestNotifPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const result = await Notifications.requestPermissionsAsync();
    // expo PermissionResponse has `granted` at runtime even if types are mismatched
    return Boolean((result as Record<string, unknown>).granted);
  } catch {
    return false;
  }
}

/**
 * Schedule (or reschedule) a daily local notification at 09:00 every morning.
 * Safe to call multiple times — cancels the previous schedule first.
 */
export async function ensureDailyReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const granted = await requestNotifPermission();
    if (!granted) return;

    // Cancel old instance to avoid duplicates
    await Notifications.cancelScheduledNotificationAsync(
      DAILY_REMINDER_ID,
    ).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: "🎁 Gold Spin — Daily Bonus!",
        body: "Your streak reward is waiting. Tap to claim! আপনার পুরস্কার অপেক্ষা করছে!",
        sound: true,
        badge: 1,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
      },
    });
  } catch {
    // Notifications not supported or permission denied — silently skip
  }
}

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(
    () => {},
  );
}
