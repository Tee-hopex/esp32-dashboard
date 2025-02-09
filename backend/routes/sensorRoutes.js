const express = require('express');
const router = express.Router();
const { fetchSensorData, getAllSensorData, getLast10MinutesSensorData, getSystemStatus, getAllLogs, clearNotifications, getAllNotifications, getRecentSensorData, updateSystemStatus } = require('../controllers/sensorController');

// Route to fetch real-time sensor data
router.get('/fetch', fetchSensorData);

// Route to retrieve stored sensor data from MongoDB
router.get('/data', getAllSensorData);

// Route to fetch logs
router.get('/logs', getAllLogs);

// Route to get system status from frontend
router.get('/get-system-status', getSystemStatus); // ✅ Route for backend to fetch system status

// // Route to fetch recent logs
// router.get('/recent-logs', getRecentLogs);

// Route to fetch recent sensor data for recent activities on the dashboard
router.get('/recent-sensor-data', getRecentSensorData);

// Route to fetch data for the statistics on the dashboard
router.get('/sensor-data-last-10-minutes', getLast10MinutesSensorData);



// Route to clear notifications
router.delete('/clear-notifications', clearNotifications);

// Route to fetch notifications
router.get('/notifications', getAllNotifications);

// Route to update system status from frontend
router.post('/update-status', updateSystemStatus);

module.exports = router;
