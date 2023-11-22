const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// The path to the JSON file where logs are stored
const logFilePath = path.join(__dirname, 'logs.json');

// Function to read the last log entry from the file and send it to all clients
function broadcastLatestLog() {
  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading the log file:', err);
      return;
    }

    // Split the file content by new lines and remove any empty lines
    const logEntries = data.trim().split('\n');

    if (logEntries.length === 0) {
      console.log('No log entries to send.');
      return;
    }

    // Get the last log entry (the newest log)
    const latestLog = logEntries[logEntries.length - 1];

    // Broadcast to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(latestLog);
      }
    });
  });
}

// Set up a connection event
wss.on('connection', function connection(ws) {
  console.log('A new client connected.');

  // Set up the onmessage event
  ws.on('message', function incoming(message) {
    console.log('Received message from client:', message);
  });

  // Set up the onclose event
  ws.on('close', function close() {
    console.log('Client disconnected.');
  });
});

// Schedule the broadcastLatestLog to be called every 15 seconds
setInterval(broadcastLatestLog, 15000);

console.log('WebSocket server is running on ws://localhost:8080 and broadcasting logs every 15 seconds.');
