var gateway = `ws://${window.location.hostname}/ws`;
var websocket;

// Init web socket when the page loads
window.addEventListener('load', onload);

document.getElementById('customSlider').addEventListener('input', function() {
    const values = [0, 30, 50, 70, 100];
    const selectedValue = values[this.value];
    console.log(`Selected Value: ${selectedValue}`);
    setFanSpeed(selectedValue);
});

function onload(event) {
    initWebSocket();
}

function getReadings(){
    websocket.send("getReadings");
}

function initWebSocket() {
    console.log('Trying to open a WebSocket connection…');
    websocket = new WebSocket(gateway);
    websocket.onopen = onOpen;
    websocket.onclose = onClose;
    websocket.onmessage = onMessage;
}

// When websocket is established, call the getReadings() function
function onOpen(event) {
    console.log('Connection opened');
    getReadings();
}

function onClose(event) {
    console.log('Connection closed');
    setTimeout(initWebSocket, 2000);
}

function onMessage(event) {
    console.log(event.data);

    var myObj = JSON.parse(event.data);

    if(myObj.fan_speed){    
        const values = [0, 30, 50, 70, 100];
        const index = values.indexOf(myObj.fan_speed);
        console.log("setting slider: " + index);
        const slider = document.getElementById('customSlider');
        slider.value = index;
    }  

    if(myObj.thermo_0_adjustment && myObj.thermo_1_adjustment){
        const thermo0ConfigVal = myObj.thermo_0_adjustment;
        const thermo1ConfigVal = myObj.thermo_1_adjustment;
        console.log("configuration values: ");
        console.log(thermo0ConfigVal);
        console.log(thermo1ConfigVal);
    }

    if(myObj.temperature_0 && myObj.temperature_1){
        const temp0 = myObj?.temperature_0?.toFixed(1) ?? 0;
        const temp1 = myObj?.temperature_1?.toFixed(1) ?? 0;

        updateChartData(parseFloat(temp0), parseFloat(temp1));

        document.getElementById("temperature_0").innerHTML = temp0;
        document.getElementById("temperature_1").innerHTML = temp1;
    }
   
    if(myObj.thermoKey_0 != null && myObj.thermoKey_1 != null){
        // "{"thermoKey_0":-151,"thermoKey_1":-144}"
        if(document.getElementById('thermo_0_adjustment').value != myObj.thermoKey_0){
            document.getElementById('thermo_0_adjustment').value = myObj.thermoKey_0;
        }
        if(document.getElementById('thermo_1_adjustment').value != myObj.thermoKey_1){
            document.getElementById('thermo_1_adjustment').value = myObj.thermoKey_1;
        }
    }
}

function openModal() {
    document.getElementById('configModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('configModal').style.display = 'none';
}

function SaveConfiguration() {
    // get values and create an event to send to backend...
    var thermo0 = document.getElementById('thermo_0_adjustment').value ?? 0;;
    var thermo1 = document.getElementById('thermo_1_adjustment').value ?? 0;;

    console.log(thermo0);
    console.log(thermo1);

    let configObj = { "thermo_0_adjustment":  thermo0, "thermo_1_adjustment":  thermo1 };

    websocket.send(JSON.stringify({ event: "updateConfiguration", configuration: configObj })); 
    alert("Configuration Saved!");
    closeModal();
}

function setFanSpeed(speed) {
    // Send a message to the server to set the fan speed
    websocket.send(JSON.stringify({ event: "setFanSpeed", speed: speed }));
}

let hours = []; 
let temperature1 = [];
let temperature2 = [];

let lastRecordedMinute = -1;  // To track the last minute we recorded
let initialEntry = true;  // Flag to check if it's the first data entry

// Function to get the current time in "HH:mm" format
function getCurrentTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
}

// Initialize the chart
let ctx = document.getElementById('temperatureChart').getContext('2d');
let chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: hours,
        datasets: [{
            label: 'Temperature 1',
            data: temperature1,
            borderColor: 'red',
            fill: false
        }, {
            label: 'Temperature 2',
            data: temperature2,
            borderColor: 'blue',
            fill: false
        }]
    },
    options: {
        scales: {
            x: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Time'
                }
            },
            y: {
                beginAtZero: false,
                min: 35,
                max: 400,
                title: {
                    display: true,
                    text: 'Temperature (°F)'
                }
            }
        }
    }
});

// Function to update the chart with new data
function updateChartData(newTemp1, newTemp2) {
    const currentTime = new Date();
    const currentMinute = currentTime.getMinutes();

    // If the length exceeds 120, shift old data out
    if(hours.length >= 120) {
        hours.shift();
        temperature1.shift();
        temperature2.shift();
    }

    // For the initial entry or if we're at 0, 15, 30, or 45 minutes, and it's a new label
    if (initialEntry || ([0, 5, 10, 15, 20, 25, 30, 35, 40, 45,50, 55].includes(currentMinute) && currentMinute !== lastRecordedMinute)) {
        lastRecordedMinute = currentMinute;
        hours.push(getCurrentTime());
        initialEntry = false;  // Reset the flag after the first entry
    } else {
        hours.push('');  // Push an empty label in other cases
    }

    temperature1.push(newTemp1);
    temperature2.push(newTemp2);

    chart.update();
}