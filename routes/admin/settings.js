const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const settingsController = require('../../controllers/settingsController');

router.get('/', isAuthenticated, settingsController.getSettings);
router.put('/general', isAuthenticated, settingsController.updateGeneralSettings);
router.put('/notifications', isAuthenticated, settingsController.updateNotificationSettings);
router.put('/policies', isAuthenticated, settingsController.updatePolicies);
router.post('/backup', isAuthenticated, settingsController.backupDatabase);

module.exports = router;