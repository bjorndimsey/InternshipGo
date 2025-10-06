const express = require('express');
const router = express.Router();
const messagingController = require('../controllers/messagingController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Search users for messaging
router.get('/search', messagingController.searchUsers);

// Get user conversations
router.get('/conversations', messagingController.getConversations);

// Create direct conversation
router.post('/conversations/direct', messagingController.createDirectConversation);

// Create group conversation
router.post('/conversations/group', messagingController.createGroupConversation);

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', messagingController.getMessages);

// Send message to a conversation
router.post('/conversations/:conversationId/messages', messagingController.sendMessage);

// Mark messages as read
router.post('/conversations/:conversationId/read', messagingController.markAsRead);

// Update group avatar
router.put('/conversations/:conversationId/avatar', messagingController.updateGroupAvatar);

// Add member to group
router.post('/conversations/:conversationId/members', messagingController.addMemberToGroup);

// Update group name
router.put('/conversations/:conversationId/name', messagingController.updateGroupName);

// Delete conversation
router.delete('/conversations/:conversationId', messagingController.deleteConversation);

module.exports = router;