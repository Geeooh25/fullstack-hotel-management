const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const activityController = require('../../controllers/activityController');

router.get('/', isAuthenticated, activityController.getActivityLogs);
router.delete('/clear', isAuthenticated, activityController.clearLogs);

module.exports = router;