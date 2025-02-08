require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const sensorController = require("./controllers/sensorController"); // Import the controller

// Create Express app
const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

// Routes
const sensorRoutes = require("./routes/sensorRoutes");
const authRoutes = require("./routes/authRoutes");
app.use("/api/sensors", sensorRoutes);
app.use("/api/auth", authRoutes);

// Default Route
app.get("/", (req, res) => {
    res.send("Backend API is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});


// setInterval(async () => {
//     console.log("updating someting...")
//     sensorController.updateSystemStatus();
// }, 3000); // Runs every 30 seconds


setInterval(() => {
    console.log("⏳ Fetching sensor data...");
    sensorController.fetchSensorData();
}, 10000); // Fetch every 10 seconds




// ✅ Vercel Requires This Export
module.exports = app;
