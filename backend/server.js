const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const sensorRoutes = require('./routes/sensorRoutes');
const authRoutes = require('./routes/authRoutes');
const { fetchSensorData } = require('./controllers/sensorController');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true
})
.then(() => {
    console.log("✅ MongoDB connected successfully");

    // Start fetching sensor data every 3 seconds (only when system is online)
    setInterval(fetchSensorData, 3000);

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})
.catch(err => {
    console.error("❌ MongoDB connection error:", err);
});

// API Routes
app.use('/api/sensors', sensorRoutes);
app.use('/api/auth', authRoutes);
