const fs = require('fs');
const path = require('path');

// The path to the JSON file where logs will be stored
const logFilePath = path.join(__dirname, 'logs.json');

// Helper function to round to one decimal place
function roundToOneDecimal(num) {
  return Math.round(num * 10) / 10;
}

// Array of possible fan speeds
const fanSpeeds = [0, 0, 100];

// Helper function to get a random fan speed
function getRandomFanSpeed() {
  const randomIndex = Math.floor(Math.random() * fanSpeeds.length);
  return fanSpeeds[randomIndex];
}

// Current fan value
let currentFanValue = getRandomFanSpeed();

// Function to update the fan value every 2 minutes
function updateFanValue() {
  currentFanValue = getRandomFanSpeed(); // Random value from the fanSpeeds array
}

// Function to write a log entry to the JSON file
function writeLog() {
  // Create the log entry with the current time and random temperatures
  const logEntry = {
    time: new Date().toISOString(),
    temp0: roundToOneDecimal(Math.random() * (255.0 - 245.0) + 245.0),
    temp1: roundToOneDecimal(Math.random() * (255.0 - 245.0) + 245.0),
    fan: currentFanValue
  };

  // Append the log entry to the file
  fs.appendFile(logFilePath, JSON.stringify(logEntry) + "\n", (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    } else {
      console.log('Log entry added:', logEntry);
    }
  });
}

// Schedule writeLog to be called every 15 seconds
setInterval(writeLog, 15000);

// Update the fan value immediately and then every x minutes
updateFanValue();
setInterval(updateFanValue, 30000);

console.log(`Logging to file every 15 seconds. Fan value updates every 2 minutes. Check out ${logFilePath} for the output.`);
