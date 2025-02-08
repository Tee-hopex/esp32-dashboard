const API_BASE_URL = "https://esp-32-project-backend.vercel.app/api"; // Backend API base URL
const BLYNK_STATUS_URL = "https://blynk.cloud/external/api/get?token=7L6qI3gaecxIK6wMAvNytsvvLya9NyG8&V0"; // Blynk API for system status

let tempHumidityChart;
let recentActivity = [];
let notifications = [];
let stats = {
    avgTemp: 0,
    avgHumidity: 0,
    totalReadings: 0
};


const socket = io("https://esp-32-project-backend.vercel.app"); 

socket.on("sensorData", (data) => {
    document.getElementById("tempValue").textContent = data.temperature + "°C";
    document.getElementById("humidityValue").textContent = data.humidity + "%";
    
    updateChart(data.temperature, data.humidity);
    updateRecentActivity(data.temperature, data.humidity);
    updateStats([data]); 
});

function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) {
        console.error("❌ Sidebar element not found!");
        return;
    }
    sidebar.classList.toggle("active");
}


document.getElementById("menuToggle").addEventListener("click", function () {
    console.log("☰ Menu button clicked!"); // Debugging log
    document.querySelector(".sidebar").classList.toggle("active");
});

document.addEventListener("DOMContentLoaded", function () {
    const toggleButton = document.getElementById("menuToggle");
    if (toggleButton) {
        toggleButton.addEventListener("click", toggleSidebar);
    } else {
        console.error("❌ Toggle button not found!");
    }
});





function logout() {
    localStorage.removeItem("authToken"); // Remove stored token
    window.location.href = "index.html"; // Redirect to login page
}

async function fetchNotifications() {
    try {
        const response = await fetch("https://esp-32-project-backend.vercel.app/api/sensors/notifications");
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }

        const notifications = await response.json();
        const notificationList = document.getElementById("notificationList");

        if (notifications.length === 0) {
            notificationList.innerHTML = "<li>No notifications</li>";
        } else {
            notificationList.innerHTML = notifications
                .map(notification => `<li>${notification.message} - ${formatTime(notification.timestamp)}</li>`)
                .join('');
        }

        document.getElementById("notificationCount").textContent = notifications.length;
    } catch (error) {
        console.error("❌ Failed to fetch notifications:", error);
    }
}

async function clearNotifications() {
    try {
        const response = await fetch("https://esp-32-project-backend.vercel.app/api/sensors/clear-notifications", { method: "DELETE" });
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }

        // Clear notifications from the frontend
        document.getElementById("notificationList").innerHTML = "<li>No new notifications</li>";
        document.getElementById("notificationCount").textContent = "0";

        console.log("✅ Notifications cleared successfully");
    } catch (error) {
        console.error("❌ Failed to clear notifications:", error);
    }
}


// Helper function to format timestamps
function formatTime(timestamp) {
    const date = new Date(timestamp);
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
}

// Run auto-fetch for notifications every 5 seconds
setInterval(fetchNotifications, 5000);
fetchNotifications();



// Show Page Function (Switch between Dashboard & Profile)
function showPage(pageId) {
    let pages = document.querySelectorAll('.content-page');
    pages.forEach(page => page.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
}

// Fetch system status from Blynk API
async function fetchSystemStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/sensors/system-status`);
        const status = await response.json();

        const statusElement = document.getElementById("systemStatus");

        if (status.systemOnline) {
            statusElement.innerHTML = "🟢 Online";
            statusElement.style.color = "green";
        } else {
            statusElement.innerHTML = "🔴 Offline";
            statusElement.style.color = "red";
        }
    } catch (error) {
        console.error("❌ Failed to fetch system status:", error);
        document.getElementById("systemStatus").innerHTML = "⚠ Error";
        document.getElementById("systemStatus").style.color = "orange";
    }
}


async function fetchLogs() {
    try {
        const response = await fetch(`${API_BASE_URL}/sensors/logs`);
        if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

        const logs = await response.json();
        const logList = document.getElementById("logList");

        logList.innerHTML = logs.map(log => `<li>${log.timestamp}: ${log.alert}</li>`).join("");

    } catch (error) {
        console.error("❌ Failed to fetch logs:", error);
    }
}

// 🔥 Call `fetchLogs` whenever new sensor data arrives
socket.on("sensorData", () => {
    fetchLogs();
});




// Fetch sensor data from backend every 3 seconds
async function fetchSensorData() {
    try {
        const response = await fetch(`${API_BASE_URL}/sensors/data`);
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }
        const data = await response.json();
        console.log("📊 Sensor Data Received:", data);

        if (data.length > 0) {
            const latest = data[0]; // Get the most recent data

            document.getElementById("tempValue").textContent = latest.temperature + "°C";
            document.getElementById("humidityValue").textContent = latest.humidity + "%";

            updateChart(latest.temperature, latest.humidity);
            updateRecentActivity(latest.temperature, latest.humidity);
            updateStats(data);
        }
    } catch (error) {
        console.error("❌ Failed to fetch sensor data:", error);
    }
}


// Fetch new sensor data every 5 seconds
setInterval(fetchSensorData, 5000);
fetchSensorData();



// Update chart with new data
function updateChart(temp, humidity) {
    console.log("Updating chart with data:", temp, humidity); // Debugging log

    if (!tempHumidityChart) {
        console.error("❌ Chart not initialized!");
        return;
    }

    const now = new Date();
    const timeLabel = now.getHours() + ":" + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
    
    tempHumidityChart.data.labels.push(timeLabel);
    if (tempHumidityChart.data.labels.length > 10) {
        tempHumidityChart.data.labels.shift();
    }
    
    tempHumidityChart.data.datasets[0].data.push(temp);
    tempHumidityChart.data.datasets[1].data.push(humidity);
    
    if (tempHumidityChart.data.datasets[0].data.length > 10) {
        tempHumidityChart.data.datasets[0].data.shift();
        tempHumidityChart.data.datasets[1].data.shift();
    }

    tempHumidityChart.update();
}


// Update recent activity list
let tempSum = 0;
let humiditySum = 0;
let readingCount = 0;
let lastUpdateTime = new Date();

function updateRecentActivity(temp, humidity) {
    tempSum += parseFloat(temp);
    humiditySum += parseFloat(humidity);
    readingCount++;

    const now = new Date();
    const timeDiff = (now - lastUpdateTime) / (1000 * 60); // Convert to minutes

    if (timeDiff >= 1) { // Update every 5 minutes
        const avgTemp = (tempSum / readingCount).toFixed(1);
        const avgHumidity = (humiditySum / readingCount).toFixed(1);

        // Convert timestamp to 12-hour format with AM/PM
        let hours = now.getHours();
        let minutes = now.getMinutes();
        let ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12; // Convert 24-hour to 12-hour format
        minutes = minutes < 10 ? "0" + minutes : minutes; // Add leading zero

        const formattedTime = `${hours}:${minutes} ${ampm}`;

        // Store the update
        recentActivity.push({
            time: formattedTime,
            avgTemp,
            avgHumidity
        });

        // Limit to the last 5 activities
        if (recentActivity.length > 20) {
            recentActivity.shift();
        }

        // Update UI
        const activityList = document.getElementById('recentActivityList');
        activityList.innerHTML = recentActivity
            .map(entry => `<li>${entry.time} - Avg Temp: ${entry.avgTemp}°C, Avg Humidity: ${entry.avgHumidity}%</li>`)
            .join('');

        // Reset values for next 5-minute interval
        tempSum = 0;
        humiditySum = 0;
        readingCount = 0;
        lastUpdateTime = new Date();
    }
}


// Update notification system
// function checkNotifications(temp, humidity) {
//     notifications = [];

//     if (temp > 35) {
//         notifications.push(`⚠ Temperature Alert: ${temp}°C (Temperature has exceeded 35°C)`);
//     }
//     if (humidity > 60) {
//         notifications.push(`⚠ Humidity Alert: ${humidity}% (out of range!)`);
//     }

//     const notificationList = document.getElementById('notificationList');
//     notificationList.innerHTML = notifications
//         .map(notification => `<li>${notification}</li>`)
//         .join('');

//     document.getElementById('notificationCount').textContent = notifications.length;
// }

// Update statistics
let firstReadingTime = null; // Track the first reading time
let lastReadingTime = null; // Track the last recorded time

function updateStats(data) {
    if (data.length === 0) {
        console.warn("⚠ No sensor data available!");
        return;
    }

    console.log("📊 Sensor Data Received for Statistics:", data);
  

    const total = data.length;
    const avgTemp = data.reduce((sum, entry) => sum + entry.temperature, 0) / total;
    const avgHumidity = data.reduce((sum, entry) => sum + entry.humidity, 0) / total;

    // Track the first and last recorded times
    firstReadingTime = firstReadingTime || new Date(data[data.length - 1].timestamp);
    lastReadingTime = new Date(data[0].timestamp);

    // Convert timestamps to 12-hour format with AM/PM
    function formatTime(date) {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        minutes = minutes < 10 ? "0" + minutes : minutes;
        return `${hours}:${minutes} ${ampm}`;
    }

    const timeRange = `${formatTime(firstReadingTime)} - ${formatTime(lastReadingTime)}`;

    // Update UI
    document.getElementById('avgTemp').textContent = avgTemp.toFixed(1);
    document.getElementById('avgHumidity').textContent = avgHumidity.toFixed(1);
    document.getElementById('totalReadings').textContent = total;
    document.getElementById('statTimeRange').textContent = timeRange;
}


// Initialize chart with gradient fill
function initializeChart() {
    const ctx = document.getElementById('tempHumidityChart');
    
    if (!ctx) {
        console.error("❌ Chart canvas element not found!");
        return;
    }

    const chartContext = ctx.getContext('2d');

    // Create gradient effect
    const gradient = chartContext.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(66, 135, 245, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');

    tempHumidityChart = new Chart(chartContext, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: '#f44336', // Red line for temperature
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Humidity (%)',
                    data: [],
                    borderColor: '#3f51b5', // Blue line for humidity
                    backgroundColor: 'rgba(63, 81, 181, 0.3)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: '#666' }
                },
                y: {
                    ticks: { color: '#666' },
                    beginAtZero: true
                }
            }
        }
    });

    console.log("✅ Chart initialized successfully!");
}


    // **Force an immediate update after rendering**
    setTimeout(() => {
        tempHumidityChart.update();
    }, 500);
}


// Toggle notifications dropdown
function toggleNotifications() {
    document.querySelector('.notification-dropdown').classList.toggle('active');
}



// PROFILE PAGE FUNCTIONALITY

function enableEdit() {
    document.querySelectorAll('.editable').forEach(input => {
        input.removeAttribute('disabled');
        input.style.border = "1px solid #ccc";
        input.style.background = "#fff";
    });
    document.getElementById('saveProfileBtn').style.display = 'inline-block';
}

function saveProfile() {
    document.querySelectorAll('.editable').forEach(input => {
        input.setAttribute('disabled', true);
        input.style.border = "none";
        input.style.background = "transparent";
    });
    document.getElementById('saveProfileBtn').style.display = 'none';
    alert("✅ Profile updated successfully!");
}

// Run auto-fetch every 3 seconds
window.onload = function() {
    initializeChart();
    setInterval(fetchSensorData, 3000);
    setInterval(fetchSystemStatus, 3000); // Fetch system status every 3 seconds
    fetchSensorData();
    fetchSystemStatus();
};
