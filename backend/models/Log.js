const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    temperature: Number,
    humidity: Number,
    alert: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', LogSchema);
