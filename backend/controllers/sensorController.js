const { io } = require('../index'); // Import WebSocket instance
const axios = require('axios');
const SensorData = require('../models/SensorData');
const Log = require('../models/Log'); // Import Log model
const Notification = require('../models/Notification'); // Import Notification model

const BLYNK_API_URL = process.env.BLYNK_API_URL;
const BLYNK_TOKEN = "7L6qI3gaecxIK6wMAvNytsvvLya9NyG8"; // Your Blynk API token
const TEMP_THRESHOLD = { min: 5, max: 50 }; // Adjusted for DHT11 sensor
const HUMIDITY_THRESHOLD = { min: 20, max: 90 }; // Adjusted for DHT11 sensor

let systemOnline = false; // Default status is offline

exports.fetchSensorData = async () => {
    try {
        if (!systemOnline) {
            console.log("🚫 System is offline. Skipping data fetch.");
            return;
        }

        console.log("✅ Fetching sensor data...");

        const tempUrl = `${BLYNK_API_URL}/get?token=${BLYNK_TOKEN}&V3`;
        const humUrl = `${BLYNK_API_URL}/get?token=${BLYNK_TOKEN}&V1`;

        let temperature, humidity;

        try {
            const tempResponse = await axios.get(tempUrl);
            temperature = parseFloat(tempResponse.data);

            const humResponse = await axios.get(humUrl);
            humidity = parseFloat(humResponse.data);

            if (isNaN(temperature) || isNaN(humidity)) {
                throw new Error(`❌ Invalid sensor data received. Temp: ${temperature}, Humidity: ${humidity}`);
            }

        } catch (error) {
            console.error(`❌ Failed to fetch sensor data: ${error.message}`);
            await Log.create({ alert: "Failed to fetch sensor data", timestamp: new Date() }); // ✅ Log the error
            return;
        }

        console.log(`🌡 Temp: ${temperature}°C, 💧 Humidity: ${humidity}%`);

        // ✅ Save sensor readings to MongoDB
        const newEntry = new SensorData({ temperature, humidity });
        await newEntry.save();

        console.log("✅ Sensor data stored successfully");

        let alert = "";

        // ✅ Check for out-of-range alerts
        if (temperature < TEMP_THRESHOLD.min || temperature > TEMP_THRESHOLD.max) {
            alert = `⚠ Temperature Alert: ${temperature}°C (out of range!)`;
        }
        if (humidity < HUMIDITY_THRESHOLD.min || humidity > HUMIDITY_THRESHOLD.max) {
            alert += `\n⚠ Humidity Alert: ${humidity}% (out of range!)`;
        }

        if (alert) {
            await Log.create({ temperature, humidity, alert, timestamp: new Date() });
            await Notification.create({ message: alert });

            console.log("🚨 Alert triggered:", alert);
        }

        // ✅ Emit data to frontend (for WebSockets)
        io.emit("sensorData", { temperature, humidity });

    } catch (error) {
        console.error("❌ Error in fetchSensorData:", error.message);
        await Log.create({ alert: "General Error in Sensor Fetching", timestamp: new Date() }); // ✅ Log the general error
    }
};



// Function to update system status from frontend (script.js)
exports.updateSystemStatus = async (req, res) => {
    const { status } = req.body;
    systemOnline = status === "online"; // Convert status to boolean
    console.log(`🔄 System status updated: ${systemOnline ? "🟢 Online" : "🔴 Offline"}`);
    res.json({ message: "System status updated", systemOnline });
};

// Function to fetch sensor data only if system is online
exports.fetchSensorData = async () => {
    try {
        if (!systemOnline) {
            console.log("🚫 System is offline. Skipping data fetch.");
            return;
        }

        console.log("✅ System is online. Fetching sensor data...");

        const tempUrl = `${BLYNK_API_URL}/get?token=${BLYNK_TOKEN}&V3`;
        const humUrl = `${BLYNK_API_URL}/get?token=${BLYNK_TOKEN}&V1`;

        let temperature, humidity;

        try {
            const tempResponse = await axios.get(tempUrl);
            temperature = parseFloat(tempResponse.data);
            
            const humResponse = await axios.get(humUrl);
            humidity = parseFloat(humResponse.data);

            if (isNaN(temperature) || isNaN(humidity)) {
                console.error(`❌ Error: Invalid sensor data received. Temp: ${temperature}, Humidity: ${humidity}`);
                return;
            }

            console.log(`✅ Fetched Data -> Temp: ${temperature}°C, Humidity: ${humidity}%`);

        } catch (error) {
            console.error(`❌ Failed to fetch sensor data: ${error.response ? error.response.status : error.message}`);
            console.error(`🔍 Blynk API Response: ${error.response ? JSON.stringify(error.response.data) : "No Response"}`);
            return;
        }

        console.log(`🌡 Temperature: ${temperature}°C, 💧 Humidity: ${humidity}%`);

        // Save sensor readings to MongoDB
        const newEntry = new SensorData({ temperature, humidity });
        await newEntry.save();
        console.log("✅ Sensor data stored:", { temperature, humidity });


        // let alert = "";

        // // Check for out-of-range alerts
        // if (temperature < TEMP_THRESHOLD.min || temperature > TEMP_THRESHOLD.max) {
        //     alert = `⚠ Temperature Alert: ${temperature}°C (out of range!)\n`;
        // }
        // if (humidity < HUMIDITY_THRESHOLD.min || humidity > HUMIDITY_THRESHOLD.max) {
        //     alert += `\n⚠ Humidity Alert: ${humidity}% (out of range!)`;
        // }

        // if (alert) {
        //     await Log.create({ temperature, humidity, alert });
        //     await Notification.create({ message: alert });

        //     console.log("🚨 Alert triggered:", alert);
        // }

    } catch (error) {
        console.error("❌ Failed to fetch sensor data:", error.message);
    }
};

exports.clearNotifications = async (req, res) => {
    try {
        await Notification.deleteMany({});
        res.status(200).json({ message: "✅ All notifications cleared" });
    } catch (error) {
        res.status(500).json({ error: "❌ Failed to clear notifications", details: error.message });
    }
};


const clearOldNotifications = async () => {
    try {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        await Notification.deleteMany({ timestamp: { $lt: twentyFourHoursAgo } });

        console.log("🗑️ Deleted notifications older than 24 hours.");
    } catch (error) {
        console.error("❌ Failed to delete old notifications:", error.message);
    }
};

// Run this cleanup function every hour
setInterval(clearOldNotifications, 60 * 60 * 1000);



// Get all stored sensor data
exports.getAllSensorData = async (req, res) => {
    try {
        const data = await SensorData.find().sort({ timestamp: -1 }).limit(20);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "❌ Failed to fetch stored data", details: error.message });
    }
};


// Get all logs
exports.getAllLogs = async (req, res) => {
    try {
        const logs = await Log.find().sort({ timestamp: -1 }).limit(50);
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ error: "❌ Failed to fetch logs", details: error.message });
    }
};

// Get all notifications
exports.getAllNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ timestamp: -1 }).limit(5);
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ error: "❌ Failed to fetch notifications", details: error.message });
    }
};

