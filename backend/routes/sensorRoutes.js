const express = require('express');
const router = express.Router();
const { fetchSensorData, getAllSensorData, getAllLogs, clearNotifications, getAllNotifications, updateSystemStatus } = require('../controllers/sensorController');

// Route to fetch real-time sensor data
router.get('/fetch', fetchSensorData);

// Route to retrieve stored sensor data from MongoDB
router.get('/data', getAllSensorData);

// Route to fetch logs
router.get('/logs', getAllLogs);

// Route to clear notifications
router.delete('/clear-notifications', clearNotifications);

// Route to fetch notifications
router.get('/notifications', getAllNotifications);

// Route to update system status from frontend
router.post('/update-status', updateSystemStatus);

module.exports = router;
