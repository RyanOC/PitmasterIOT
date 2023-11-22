


## Initialize a Node.js Project: Create a new directory for your project, navigate into it in your command line or terminal, and run the following command to create a package.json file:
- npm init -y

# Install Express: While in your project directory, install Express by running:
- npm install express

# running full test:
1. start the db.js to start test logging to log.json
2. start server.js to mock the esp32 server which will read from and deliver newest logs to all connected websocket clients.
3. start client.js to view the mock webpage from the esp32. 