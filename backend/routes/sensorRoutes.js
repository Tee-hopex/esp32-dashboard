const express = require('express');
const router = express.Router();
const { fetchSensorData, getAllSensorData, getAllLogs, clearNotifications, getAllNotifications, updateSystemStatus } = require('../controllers/sensorController');
const { Parser } = require('json2csv');

const authMiddleware = require("../middleware/authMiddleware")

router.get('/export-csv', async (req, res) => {
    try {
        const data = await SensorData.find().sort({ timestamp: -1 }).limit(100);
        const fields = ['temperature', 'humidity', 'timestamp'];
        const parser = new Parser({ fields });
        const csv = parser.parse(data);

        res.attachment('sensor_data.csv');
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ error: "❌ Failed to generate CSV" });
    }
});



// Route to fetch real-time sensor data
router.get('/fetch', fetchSensorData);

// Route to retrieve stored sensor data from MongoDB
router.get('/data', authMiddleware, getAllSensorData);

// Route to fetch logs
router.get('/logs', getAllLogs);

// Route to clear notifications
router.delete('/clear-notifications', clearNotifications);

// Route to fetch notifications
router.get('/notifications', getAllNotifications);

// Route to update system status from frontend
router.post('/update-status', authMiddleware, updateSystemStatus);



module.exports = router;
