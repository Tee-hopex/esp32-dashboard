const axios = require('axios');
const SensorData = require('../models/SensorData');
const Log = require('../models/Log');
const Notification = require('../models/Notification');

const BLYNK_API_URL = process.env.BLYNK_API_URL;
const BLYNK_TOKEN = process.env.BLYNK_TOKEN;
const TEMP_THRESHOLD = { min: 5, max: 50 };
const HUMIDITY_THRESHOLD = { min: 20, max: 90 };

let systemOnline = false; // Default system status is offline

// ✅ Function to update system status from frontend (script.js)
exports.updateSystemStatus = async (req, res) => {
    console.log("🚀 Received request to update system status...");

    if (!req.body || !req.body.status) {
        console.error("❌ No status received in request body.");
        return res.status(400).json({ error: "Missing status in request body" });
    }

    const { status } = req.body;
    systemOnline = status === "online"; 

    console.log(`🔄 Updated systemOnline variable: ${systemOnline ? "🟢 Online" : "🔴 Offline"}`);

    res.json({ message: "System status updated", systemOnline });
};


exports.getSystemStatus = async (req, res) => {
    console.log("📡 Sending system status to backend...");
    res.json({ status: systemOnline ? "online" : "offline" }); // ✅ Return current system status
};



// ✅ Function to fetch sensor data only if the system is online
exports.fetchSensorData = async () => {
    console.log("🟢 fetchSensorData() function called...");
    if (!systemOnline) {
        console.log("🚫 System is offline. Skipping data fetch.");
        return;
    }

    console.log("✅ System is online. Fetching sensor data...");
    try {
        // 🔹 Fetch temperature and humidity data from Blynk API
        const tempResponse = await axios.get(`${BLYNK_API_URL}/get?token=${BLYNK_TOKEN}&V3`);
        const humResponse = await axios.get(`${BLYNK_API_URL}/get?token=${BLYNK_TOKEN}&V1`);

        const temperature = parseFloat(tempResponse.data);
        const humidity = parseFloat(humResponse.data);

        if (isNaN(temperature) || isNaN(humidity)) {
            console.error("❌ Invalid sensor data.");
            return;
        }

        console.log(`✅ Received Data -> Temp: ${temperature}°C, Humidity: ${humidity}%`);

        // 🔹 Store sensor data in MongoDB
        await SensorData.create({ temperature, humidity });
        console.log("✅ Sensor data stored.");

        // 🔹 Check for temperature and humidity threshold violations
        let alerts = [];
        if (temperature < TEMP_THRESHOLD.min || temperature > TEMP_THRESHOLD.max) {
            alerts.push(`⚠ Temperature Alert: ${temperature}°C (out of range!)`);
        }
        if (humidity < HUMIDITY_THRESHOLD.min || humidity > HUMIDITY_THRESHOLD.max) {
            alerts.push(`⚠ Humidity Alert: ${humidity}% (out of range!)`);
        }

        // 🔹 Store alerts in MongoDB if any thresholds are violated
        if (alerts.length) {
            const alertMessage = alerts.join("\n");
            await Log.create({ temperature, humidity, alert: alertMessage });
            await Notification.create({ message: alertMessage });
            console.log("🚨 Alert triggered:", alertMessage);
        }
    } catch (error) {
        console.error("❌ Failed to fetch sensor data:", error.message);
    }
};

// // ✅ Schedule fetchSensorData to run every 10 seconds
// setInterval(() => {
//     console.log("⏳ Fetching sensor data...");
//     exports.fetchSensorData();
// }, 10000);

// ✅ Function to delete old notifications older than 24 hours
const clearOldNotifications = async () => {
    try {
        await Notification.deleteMany({ timestamp: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
        console.log("🗑️ Deleted notifications older than 24 hours.");
    } catch (error) {
        console.error("❌ Failed to delete old notifications:", error.message);
    }
};

// ✅ Schedule old notifications cleanup every 1 hour
setInterval(clearOldNotifications, 60 * 60 * 1000);

// ✅ Function to manually clear all notifications
exports.clearNotifications = async (req, res) => {
    try {
        await Notification.deleteMany({});
        console.log("🗑️ Cleared all notifications.");
        res.status(200).json({ message: "✅ All notifications cleared" });
    } catch (error) {
        console.error("❌ Failed to clear notifications:", error.message);
        res.status(500).json({ error: "❌ Failed to clear notifications", details: error.message });
    }
};


// ✅ API Endpoint to fetch all stored sensor data
exports.getAllSensorData = async (req, res) => {
    try {
        const data = await SensorData.find().sort({ timestamp: -1 }).limit(20);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "❌ Failed to fetch stored data", details: error.message });
    }
};

// ✅ API Endpoint to fetch all logs
exports.getAllLogs = async (req, res) => {
    try {
        const logs = await Log.find().sort({ timestamp: -1 }).limit(50);
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ error: "❌ Failed to fetch logs", details: error.message });
    }
};

// ✅ API Endpoint to fetch recent notifications
exports.getAllNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ timestamp: -1 }).limit(5);
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ error: "❌ Failed to fetch notifications", details: error.message });
    }
};
