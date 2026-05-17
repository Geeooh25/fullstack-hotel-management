const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/auth');
const reportController = require('../../controllers/reportController');

router.get('/', isAuthenticated, reportController.getReports);
router.get('/export', isAuthenticated, reportController.exportReport);

module.exports = router;