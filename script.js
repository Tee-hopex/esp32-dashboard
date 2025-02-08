const API_BASE_URL = "https://esp-32-project-backend.vercel.app/api/sensors"; // Backend API base URL https://esp-32-project-backend.vercel.app/api/sensors 
//localhost: https://localhost:5000/api/sensors


// const BLYNK_STATUS_URL = "https://blynk.cloud/external/api/get?token=7L6qI3gaecxIK6wMAvNytsvvLya9NyG8&V0"; // Blynk API for system status

let tempHumidityChart;
let recentActivity = []; 
let notifications = [];
let stats = {
    avgTemp: 0,
    avgHumidity: 0,
    totalReadings: 0
};

function logout() {
    localStorage.removeItem("authToken"); // Remove stored token
    window.location.href = "index.html"; // Redirect to login page
}

document.addEventListener("visibilitychange", function() {
    if (!document.hidden) {
        fetchNotifications();
    }
});


async function fetchNotifications() {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications`);
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
        const response = await fetch(`${API_BASE_URL}/clear-notifications`, { method: "DELETE" });
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

document.addEventListener("click", function (event) {
    let dropdown = document.querySelector(".notification-dropdown");
    if (!dropdown.contains(event.target) && !event.target.classList.contains("notification-icon")) {
        dropdown.classList.remove("active");
    }
});



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
    if (!BLYNK_STATUS_URL) {
        console.warn("⚠ BLYNK_STATUS_URL is not set.");
        return;
    }

    try {
        console.log("🌍 Fetching system status from Blynk API...");

        const response = await fetch(BLYNK_STATUS_URL);
        const status = await response.text();

        const systemStatus = status.trim().toLowerCase();
        console.log(`✅ System status received from Blynk: ${systemStatus}`);

        const statusElement = document.getElementById("systemStatus");

        if (systemStatus === "online") {
            statusElement.innerHTML = "🟢 Online";
            statusElement.style.color = "green";
        } else {
            statusElement.innerHTML = "🔴 Offline";
            statusElement.style.color = "red";
        }

        console.log(`🔄 Sending system status to backend: ${systemStatus}`);

        const backendResponse = await fetch(`${API_BASE_URL}/update-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: systemStatus })
        });

        const backendData = await backendResponse.json();
        console.log("✅ System status updated on backend:", backendData);

    } catch (error) {
        console.error("❌ Failed to fetch or send system status:", error);
        document.getElementById("systemStatus").innerHTML = "⚠ Error";
        document.getElementById("systemStatus").style.color = "orange";
    }
}




// Fetch sensor data from backend every 3 seconds
async function fetchSensorData() {
    try {
        // ✅ Check system status before fetching sensor data
        const statusResponse = await fetch(`${API_BASE_URL}/get-system-status`);
        if (!statusResponse.ok) {
            throw new Error(`Server responded with status ${statusResponse.status}`);
        }
        
        const { status } = await statusResponse.json();
        console.log(`🔍 System status: ${status}`);

        if (status !== "online") {
            console.warn("🚫 System is offline. Skipping sensor data fetch.");
            return; // ✅ Stop execution if system is offline
        }

        console.log("✅ System is online. Fetching sensor data...");

        // ✅ Proceed with fetching sensor data if online
        const response = await fetch(`${API_BASE_URL}/data`);
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }
        const data = await response.json();

        if (data.length > 0) {
            const latest = data[0];

            document.getElementById("tempValue").textContent = latest.temperature;
            document.getElementById("humidityValue").textContent = latest.humidity;

            updateChart(latest.temperature, latest.humidity);
            updateRecentActivity(latest.temperature, latest.humidity);
            updateStats(data);
        }
    } catch (error) {
        console.error("❌ Failed to fetch sensor data from backend:", error);
    }
}



// Update chart with new data
function updateChart(temp, humidity) {
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
    if (data.length === 0) return; // Prevent calculations if no data is available

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


// Initialize chart
function initializeChart() {
    const ctx = document.getElementById('tempHumidityChart').getContext('2d');
    tempHumidityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: '#667eea',
                    borderWidth: 2,
                    fill: false
                },
                {
                    label: 'Humidity (%)',
                    data: [],
                    borderColor: '#764ba2',
                    borderWidth: 2,
                    fill: false
                }
            ]
        },
        options: {
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            },
            responsive: true,
            maintainAspectRatio: false,
        }
    });
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
    setInterval(fetchSensorData, 10000);
    setInterval(fetchSystemStatus, 30000); // Fetch system status every 3 seconds
    fetchSensorData();
    fetchSystemStatus();
};
