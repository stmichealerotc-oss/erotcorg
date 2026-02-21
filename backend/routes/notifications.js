const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Member = require('../models/Member');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Dynamic import for expo-server-sdk (ES module)
let Expo;
(async () => {
  const expoModule = await import('expo-server-sdk');
  Expo = expoModule.Expo;
})();

// Apply authentication to all routes
router.use(authenticateToken);

// POST /api/notifications/register-token - Register device push token
router.post('/register-token', async (req, res) => {
  try {
    const { pushToken, deviceId, platform } = req.body;
    const userId = req.user.id;

    if (!pushToken || !deviceId) {
      return res.status(400).json({ error: 'Push token and device ID are required' });
    }

    // Wait for Expo to be loaded
    if (!Expo) {
      return res.status(503).json({ error: 'Notification service is initializing, please try again' });
    }

    // Validate Expo push token format
    if (!Expo.isExpoPushToken(pushToken)) {
      return res.status(400).json({ error: 'Invalid Expo push token format' });
    }

    // Find member by user ID
    const member = await Member.findOne({ _id: userId });
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Check if token already exists for this device
    const existingTokenIndex = member.pushTokens.findIndex(
      t => t.deviceId === deviceId
    );

    if (existingTokenIndex >= 0) {
      // Update existing token
      member.pushTokens[existingTokenIndex] = {
        token: pushToken,
        deviceId,
        platform,
        lastUsed: new Date(),
        createdAt: member.pushTokens[existingTokenIndex].createdAt
      };
    } else {
      // Add new token
      member.pushTokens.push({
        token: pushToken,
        deviceId,
        platform,
        lastUsed: new Date(),
        createdAt: new Date()
      });
    }

    await member.save();

    console.log(`✅ Push token registered for member ${member.firstName} ${member.lastName}`);
    res.json({ success: true, message: 'Push token registered successfully' });

  } catch (error) {
    console.error('❌ Error registering push token:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

// POST /api/notifications/send - Send notification (admin only)
router.post('/send', authorizeRoles('super-admin', 'admin'), async (req, res) => {
  try {
    const { type, title, body, recipients, data, priority } = req.body;
    const sentBy = req.user.id;

    if (!type || !title || !body) {
      return res.status(400).json({ error: 'Type, title, and body are required' });
    }

    // Wait for Expo to be loaded
    if (!Expo) {
      return res.status(503).json({ error: 'Notification service is initializing, please try again' });
    }

    // Create Expo client
    const expo = new Expo();

    // Get recipient members
    let memberList;
    if (recipients === 'all') {
      // Send to all active members with push tokens
      memberList = await Member.find({
        status: 'active',
        'pushTokens.0': { $exists: true }
      });
    } else if (Array.isArray(recipients)) {
      // Send to specific members
      memberList = await Member.find({
        _id: { $in: recipients },
        'pushTokens.0': { $exists: true }
      });
    } else {
      return res.status(400).json({ error: 'Invalid recipients format' });
    }

    if (memberList.length === 0) {
      return res.status(400).json({ error: 'No recipients found with push tokens' });
    }

    // Create notification record
    const notification = new Notification({
      type,
      title,
      body,
      data: data || {},
      sentBy,
      priority: priority || 'normal',
      totalRecipients: memberList.length,
      recipients: []
    });

    // Prepare push messages
    const messages = [];
    
    for (const member of memberList) {
      // Check notification settings
      const settings = member.notificationSettings || {};
      let shouldSend = true;

      // Check if member has disabled this type of notification
      if (type === 'payment' && settings.paymentReminders === false) shouldSend = false;
      if (type === 'event' && settings.eventAnnouncements === false) shouldSend = false;
      if (type === 'prayer' && settings.prayerRequests === false) shouldSend = false;
      // Emergency alerts always send regardless of settings

      if (!shouldSend) {
        continue;
      }

      // Add each push token for this member
      for (const tokenData of member.pushTokens) {
        if (Expo.isExpoPushToken(tokenData.token)) {
          messages.push({
            to: tokenData.token,
            sound: 'default',
            title,
            body,
            data: data || {},
            priority: priority === 'high' ? 'high' : 'default',
            channelId: priority === 'high' ? 'emergency' : 'default'
          });

          notification.recipients.push({
            memberId: member._id,
            pushToken: tokenData.token,
            status: 'pending'
          });
        }
      }
    }

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    let successCount = 0;
    let failureCount = 0;

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        
        // Update recipient statuses based on tickets
        ticketChunk.forEach((ticket, index) => {
          const recipientIndex = notification.recipients.findIndex(
            r => r.pushToken === chunk[index].to
          );

          if (recipientIndex >= 0) {
            if (ticket.status === 'ok') {
              notification.recipients[recipientIndex].status = 'sent';
              notification.recipients[recipientIndex].sentAt = new Date();
              successCount++;
            } else {
              notification.recipients[recipientIndex].status = 'failed';
              notification.recipients[recipientIndex].errorMessage = ticket.message;
              failureCount++;
            }
          }
        });
      } catch (error) {
        console.error('❌ Error sending push notification chunk:', error);
        failureCount += chunk.length;
      }
    }

    // Update notification statistics
    notification.successCount = successCount;
    notification.failureCount = failureCount;
    notification.sentAt = new Date();

    await notification.save();

    console.log(`✅ Notification sent: ${successCount} success, ${failureCount} failed`);
    
    res.json({
      success: true,
      notificationId: notification._id,
      sent: successCount,
      failed: failureCount,
      total: messages.length
    });

  } catch (error) {
    console.error('❌ Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// POST /api/notifications/send-payment-reminders - Send payment reminders (admin only)
router.post('/send-payment-reminders', authorizeRoles('super-admin', 'admin', 'accountant'), async (req, res) => {
  try {
    const { month } = req.body; // Format: "2026-02"
    
    if (!month) {
      return res.status(400).json({ error: 'Month is required (format: YYYY-MM)' });
    }

    // Get all active members
    const members = await Member.find({ 
      status: 'active',
      'pushTokens.0': { $exists: true }
    });

    // TODO: Check which members haven't paid for this month
    // For now, send to all members
    const recipientIds = members.map(m => m._id);

    // Send notification
    const result = await sendNotification({
      type: 'payment',
      title: 'Payment Reminder',
      body: `Your ${month} tithe is due. Tap to view details.`,
      recipients: recipientIds,
      data: { screen: 'Contributions', month },
      sentBy: req.user.id
    });

    res.json({
      success: true,
      remindersSent: result.sent,
      failed: result.failed
    });

  } catch (error) {
    console.error('❌ Error sending payment reminders:', error);
    res.status(500).json({ error: 'Failed to send payment reminders' });
  }
});

// GET /api/notifications/history - Get notification history (admin only)
router.get('/history', authorizeRoles('super-admin', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    const query = {};
    if (type) query.type = type;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('sentBy', 'username email')
      .select('-recipients'); // Don't include full recipient list

    const total = await Notification.countDocuments(query);

    res.json({
      notifications,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error('❌ Error fetching notification history:', error);
    res.status(500).json({ error: 'Failed to fetch notification history' });
  }
});

// PUT /api/notifications/settings - Update notification settings
router.put('/settings', async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;

    const member = await Member.findById(userId);
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Update notification settings
    member.notificationSettings = {
      ...member.notificationSettings,
      ...settings
    };

    await member.save();

    res.json({ 
      success: true, 
      settings: member.notificationSettings 
    });

  } catch (error) {
    console.error('❌ Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// GET /api/notifications/settings - Get notification settings
router.get('/settings', async (req, res) => {
  try {
    const userId = req.user.id;

    const member = await Member.findById(userId);
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ 
      settings: member.notificationSettings || {
        paymentReminders: true,
        eventAnnouncements: true,
        prayerRequests: true,
        emergencyAlerts: true
      }
    });

  } catch (error) {
    console.error('❌ Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

module.exports = router;
