# Push Notifications API Documentation

**Real-time mobile notifications for order and item status updates**

This system uses **Expo Push Notifications** for efficient, battery-friendly mobile notifications.

---

## How It Works

1. **Mobile app registers** its push token with the backend when user logs in
2. **Database changes** trigger automatic notifications (via Prisma middleware)
3. **Backend determines** who should be notified based on roles and relationships
4. **Push notifications** are sent to relevant users' devices via Expo

---

## Notification Rules

### For All Users
- You receive notifications for **your own orders** (any status change, except ARCHIVED)
- You receive notifications for **your own items** (any status change)
- **NO notifications** are sent when orders are moved to **ARCHIVED** status

### Role-Specific Notifications

**Finance Team**
- Get **ALL notifications** for orders they placed themselves (except ARCHIVED)
- Get **PLACED notifications only** for other people's orders
- Useful for tracking purchases and budget oversight

**Operations Team**
- Notified when **any order is SHIPPED**
- Notified when **any order is DELIVERED**
- Notified when **any item is SHIPPED**
- Notified when **any item is DELIVERED**

**Engineers/Business**
- Only receive notifications for their own orders/items

### Subteam Filtering
- Users only receive notifications for orders within their **subteam**
- Cross-team notifications are not sent (to reduce noise)

### ARCHIVED Status
- **Nobody receives notifications** when orders are archived
- This prevents notification spam for administrative cleanup tasks

---

## API Endpoints

### 1. Register Push Token

Register a device to receive push notifications.

**Endpoint**
```
POST /api/notifications/register
```

**Request Body**
```json
{
  "userId": 123,
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "expo",
  "deviceId": "optional-device-identifier"
}
```

**Parameters**
- `userId` (required): The ID of the logged-in user
- `pushToken` (required): The Expo push token from the device
- `platform` (optional): "expo", "ios", or "android" (default: "expo")
- `deviceId` (optional): Unique device identifier for tracking

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Push token registered successfully",
  "tokenId": 456
}
```

**Error Responses**

```json
{
  "error": "userId and pushToken are required"
}
```

```json
{
  "error": "Invalid push token format. Must be a valid Expo push token."
}
```

```json
{
  "error": "User not found"
}
```

---

### 2. Unregister Push Token

Remove a device from receiving notifications (e.g., when user logs out).

**Endpoint**
```
POST /api/notifications/unregister
```

**Request Body**
```json
{
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Parameters**
- `pushToken` (required): The push token to remove

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Push token unregistered successfully"
}
```

**Error Responses**

```json
{
  "error": "pushToken is required"
}
```

```json
{
  "error": "Push token not found"
}
```

---

## Mobile Integration Guide (React Native + Expo)

### Step 1: Install Expo Notifications

```bash
npx expo install expo-notifications expo-device
```

### Step 2: Configure Notifications

Create a notification service in your React Native app:

```javascript
// services/notifications.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications are displayed
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Get Expo push token for this device
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'your-expo-project-id', // Get from app.json
    })).data;
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Register token with backend
 */
export async function registerTokenWithBackend(userId, pushToken) {
  try {
    const response = await fetch('https://your-domain.com/api/notifications/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        pushToken,
        platform: 'expo',
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('Push token registered successfully');
    } else {
      console.error('Failed to register push token:', data.error);
    }
  } catch (error) {
    console.error('Error registering push token:', error);
  }
}

/**
 * Unregister token with backend
 */
export async function unregisterTokenWithBackend(pushToken) {
  try {
    const response = await fetch('https://your-domain.com/api/notifications/unregister', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pushToken,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('Push token unregistered successfully');
    }
  } catch (error) {
    console.error('Error unregistering push token:', error);
  }
}
```

### Step 3: Register on Login

In your login/authentication flow:

```javascript
import { useEffect, useState } from 'react';
import { registerForPushNotificationsAsync, registerTokenWithBackend } from './services/notifications';

function App() {
  const [pushToken, setPushToken] = useState('');
  const user = useAuth(); // Your auth hook

  useEffect(() => {
    if (user) {
      // Register for push notifications when user logs in
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          setPushToken(token);
          registerTokenWithBackend(user.id, token);
        }
      });
    }
  }, [user]);

  return (
    // Your app components
  );
}
```

### Step 4: Unregister on Logout

```javascript
async function handleLogout() {
  if (pushToken) {
    await unregisterTokenWithBackend(pushToken);
  }

  // Your logout logic
}
```

### Step 5: Handle Incoming Notifications

```javascript
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Handle notification received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle user tapping on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;

      // Navigate based on notification type
      if (data.type === 'order_status_change') {
        navigation.navigate('OrderDetail', { orderId: data.orderId });
      } else if (data.type === 'item_status_change') {
        navigation.navigate('ItemDetail', { itemId: data.itemId });
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return (
    // Your app
  );
}
```

---

## Notification Data Structure

When a notification is sent, it includes metadata in the `data` field:

### Order Status Change Notification

```json
{
  "type": "order_status_change",
  "orderId": 123,
  "status": "SHIPPED",
  "internalOrderId": "ORD-1000"
}
```

### Item Status Change Notification

```json
{
  "type": "item_status_change",
  "itemId": 456,
  "status": "DELIVERED",
  "internalItemId": "ITEM-2000",
  "orderId": 123
}
```

---

## Testing Push Notifications

### Test on Physical Device

Push notifications **require a physical device** (not a simulator/emulator).

1. Build your app with Expo
2. Install on a physical device
3. Log in and register the push token
4. Update an order status via your web dashboard
5. Notification should appear on the device

### Test Registration Endpoint

```bash
# Test registering a push token
curl -X POST http://localhost:3000/api/notifications/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "pushToken": "ExponentPushToken[test-token-here]",
    "platform": "expo"
  }'
```

### Test Unregistration Endpoint

```bash
# Test unregistering a push token
curl -X POST http://localhost:3000/api/notifications/unregister \
  -H "Content-Type: application/json" \
  -d '{
    "pushToken": "ExponentPushToken[test-token-here]"
  }'
```

---

## Troubleshooting

### Notifications Not Received

1. **Check token registration**
   ```sql
   SELECT * FROM "PushToken" WHERE "userId" = 1;
   ```

2. **Check Expo token format**
   - Valid: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`
   - Must start with `ExponentPushToken[`

3. **Check device permissions**
   - Ensure notification permissions are granted on device

4. **Check console logs**
   - Backend logs show when notifications are sent
   - Look for "Sent X push notifications"

### Invalid Token Errors

- Token may have expired - re-register on app launch
- Token format incorrect - must be valid Expo push token

### Notifications Sent But Not Displayed

- Check notification handler configuration
- Ensure app has notification permissions
- Check device "Do Not Disturb" settings

---

## Production Considerations

### 1. Expo Application Services (EAS)

For production, you'll need to set up EAS for proper push notification credentials:

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### 2. APNs & FCM Credentials

- **iOS**: Configure APNs (Apple Push Notification service) credentials
- **Android**: Configure FCM (Firebase Cloud Messaging) credentials

Expo handles this automatically when you build with EAS.

### 3. Error Handling

The backend automatically handles:
- Invalid push tokens (logged but doesn't crash)
- Expired tokens (Expo returns receipt)
- Network errors (retries in chunks)

### 4. Rate Limiting

Consider implementing rate limiting for notification registration endpoints to prevent abuse.

### 5. Privacy

- Push tokens are user-specific and deleted when user is deleted (Cascade)
- Tokens are unique per device
- Users only receive notifications for their team/orders

---

## Summary

✅ **Automatic notifications** via database triggers
✅ **Role-based filtering** (Finance, Operations, etc.)
✅ **Battery efficient** using Expo's infrastructure
✅ **Real-time updates** for order/item status changes

For questions or issues, refer to:
- [Expo Push Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- [Expo Server SDK](https://github.com/expo/expo-server-sdk-node)
