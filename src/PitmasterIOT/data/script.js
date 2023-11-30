var gateway = `ws://${window.location.hostname}/ws`;
//var gateway = `ws://localhost:8080/ws`;// 
var websocket;

// Init web socket when the page loads
window.addEventListener('load', onload);

document.getElementById('hamburgerIcon').addEventListener('click', toggleConfig);document.getElementById('customSlider').addEventListener('input', function() {
    const values = [0, 30, 50, 70, 100];
    const selectedValue = values[this.value];
    console.log(`Selected Value: ${selectedValue}`);
    setFanSpeed(selectedValue);

    // If the selected value is above zero, start a timeout
    if (selectedValue > 0) {
      resetTimeout = setTimeout(() => {
          // Reset the slider value to zero after 15 seconds
          this.value = 0;
          setFanSpeed(values[this.value]);
          console.log(`Selected Value: ${values[this.value]}`);
      }, 15000); // 15000 milliseconds equals 15 seconds
  }
});

function onload(event) {
    initWebSocket();
}

function getReadings(){
    websocket.send("getReadings");
}

function initWebSocket() {
    console.log('Trying to open a WebSocket connection...');
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

    if(myObj.temp0 && myObj.temp1){
        const temp0 = myObj?.temp0?.toFixed(1) ?? 0;
        const temp1 = myObj?.temp1?.toFixed(1) ?? 0;

        // Parse the incoming data
        var logData = JSON.parse(event.data);

        // Save the received log data
        saveLogData(logData);

        updateChart(myObj);
        
        document.getElementById("temperature_0").innerHTML = temp0;
        document.getElementById("temperature_1").innerHTML = temp1;
    }
   
    if(myObj.thermoKey_0 != null && myObj.thermoKey_1 != null && document.getElementById("configModal").style.display == "none"){
        // "{"thermoKey_0":-151,"thermoKey_1":-144}"
        if(document.getElementById('thermo_0_adjustment').value != myObj.thermoKey_0){
            document.getElementById('thermo_0_adjustment').value = myObj.thermoKey_0;
        }
        if(document.getElementById('thermo_1_adjustment').value != myObj.thermoKey_1){
            document.getElementById('thermo_1_adjustment').value = myObj.thermoKey_1;
        }
    }
}

function saveLogData(logData) {
  // Retrieve the existing logs from localStorage, or initialize a new array if none exist
  var logs = JSON.parse(localStorage.getItem('logData')) || [];

  // Append the new log data to the array
  logs.push(logData);
  
  // Save the updated logs array back to localStorage
  localStorage.setItem('logData', JSON.stringify(logs));
  //checkLocalStorageSize();
}

function checkLocalStorageSize() {
  var logDataString = localStorage.getItem('logData'); // Get the data as a string
  if (logDataString) {
      var sizeInBytes = new Blob([logDataString]).size; // Calculate the size in bytes
      console.log('Size of log data in localStorage:', sizeInBytes, 'bytes');
      return sizeInBytes;
  } else {
      console.log('No log data found in localStorage.');
      return 0;
  }
}

function clearLogData() {

  var userConfirmed = confirm('Are you sure you want to clear the cache?');

  if (userConfirmed) {
      // The user clicked OK
      // Add your logic to clear the cache here
      // This will remove the specific log data entry from localStorage
      localStorage.removeItem('logData');
      console.log('Log data has been cleared.');
  } else {
      // The user clicked Cancel
      console.log('Cache clear canceled by user.');
  }
}

function provideLogDataInfo() {
  // Retrieve the log data from localStorage
  const logDataString = localStorage.getItem('logData');
  const logDataArray = JSON.parse(logDataString) || [];

  // Calculate the estimated space used by the logData in localStorage
  const sizeInBytes = new Blob([logDataString]).size;
  const sizeInKilobytes = sizeInBytes / 1024;
  const sizeInMegabytes = sizeInKilobytes / 1024;

  // Define the localStorage limit (5MB for Chrome)
  const localStorageLimit = 5; // in Megabytes

  // Calculate the percentage of localStorage used
  const localStorageUsedPercentage = (sizeInMegabytes / localStorageLimit) * 100;
  const localStorageRemainingPercentage = 100 - localStorageUsedPercentage;

  // Log record count
  const logCount = logDataArray.length;

  // Initialize variables for oldest and newest log records
  let oldestLog = null;
  let newestLog = null;

  if (logCount > 0) {
    // Assuming the log data is stored in chronological order
    oldestLog = logDataArray[0];
    newestLog = logDataArray[logCount - 1];
  }

  // Update the div with the log data information
  const logDataInfoDiv = document.getElementById('logDataInfo');
  logDataInfoDiv.innerHTML = `
    <h2>Log Data Information</h2>
    <p><strong>Oldest Log Record:</strong><br> ${oldestLog ? JSON.stringify(oldestLog) : 'No records'}</p>
    <p><strong>Newest Log Record:</strong><br> ${newestLog ? JSON.stringify(newestLog) : 'No records'}</p>
    <p><strong>Log Record Count:</strong> ${logCount}</p>
    <p><strong>LocalStorage Estimated Space Used:</strong> ${sizeInKilobytes.toFixed(2)} KB (${localStorageUsedPercentage.toFixed(2)}%)</p>
    <p><strong>LocalStorage Space Remaining:</strong> ${localStorageRemainingPercentage.toFixed(2)}%</p>
  `;
  console.log(logDataInfo);
}

function toggleConfig() {
  var modal = document.getElementById('configModal');
  var modalContent = modal.querySelector('.modal-content');

  if (modal.style.display === "none" || modal.style.display === "") {
      modal.style.display = "block";
      modalContent.classList.add('slide-in'); 
      modalContent.classList.remove('slide-out');
  } else {
      modalContent.classList.add('slide-out'); 
      modalContent.classList.remove('slide-in'); 
      const logDataInfoDiv = document.getElementById('logDataInfo');
      logDataInfoDiv.innerHTML = '';
      setTimeout(function() {
        modal.style.display = "none";
    }, 500); // This should match the duration of the slide-out animation
  }
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
    toggleConfig();
}

function setFanSpeed(speed) {
    // Send a message to the server to set the fan speed
    websocket.send(JSON.stringify({ event: "setFanSpeed", speed: speed }));
}

const chart = new ApexCharts(document.querySelector("#chart"), {
  series: [
    {
      name: 'temp0',
      data: []
    },
    {
      name: 'temp1',
      data: []
    },
    {
      name: 'fan',
      data: []
    }
  ],
  chart: {
    height: 350,
    foreColor: '#f0f0f0', 
    type: 'area',
    toolbar: {
      show: true, // Set to false if you want to completely hide the toolbar
      style: {
        color: '#f0f0f0' // Light color for the title
      },
      tools: {
        download: false, // Hide the download tool
        selection: false, // Hide the selection tool
        zoom: true, // Hide the zoom tool
        zoomin: true, // Hide the zoom in tool
        zoomout: true, // Hide the zoom out tool
        pan: false, // Hide the pan tool
        reset: true, // Hide the reset tool
        // You can set customIcons here if you want to add your own icons
      },
      autoSelected: 'zoom' // Default tool selection
    },
  },
  stroke: {
    curve: 'straight', // smooth, straight, stepline
    width: 1 
  },
  colors: ['#008FFB', '#00E396', '#CED4DC'], // Colors for the lines: blue, orange, and green respectively
  dataLabels: {
    enabled: false // Disables the data labels for all series
  },
  fill: {
    type: 'solid', // Ensures the fill is solid
    colors: ['#008FFB', '#00E396', '#CED4DC'], // Same colors as the lines
    opacity: 0.3 // Full opacity for solid color
  },
  title: {
    text: '',
    align: 'left',
    style: {
      color: '#f0f0f0' // Light color for the title
    }
  },
  xaxis: {
    type: 'datetime',
    labels: {
      style: {
        colors: '#f0f0f0' // Light color for the x-axis labels
      },
      formatter: function (value, timestamp) {
        // Create a date object from the timestamp
        const date = new Date(timestamp);
  
        // Format the date and time in a 12-hour format
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours || 12; // the hour '0' should be '12'
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  
        // Return the formatted time string
        return `${hours}:${minutesStr} ${ampm}`;
      }
    }
  },
  yaxis: {
    min: 40,
    max: 340,
    tickAmount: 12,
    labels: {
      formatter: function (val) {
        return val.toFixed(0);
      }
    },
    style: {
      colors: '#f0f0f0' // Light color for the y-axis labels
    },
    labels: {
      formatter: function (value) {
        return value.toFixed(0);
      }
    }
  },
  tooltip: {
    enabled: true,
    theme: 'dark',
    x: {
      format: 'HH:mm:ss'
    },
    y: {
      formatter: function (value, { series, seriesIndex, dataPointIndex, w }) {
        // Check if the series name is 'fan'
        if (w.config.series[seriesIndex].name === 'Fan Speed') {
          // If it is, just return the value without '°F'
          return value.toFixed(0);
        } else {
          // Otherwise, return the value with '°F'
          return value.toFixed(1) + ' °F';
        }
      }
    }
  },
  legend: {
    position: 'bottom',
    horizontalAlign: 'center',
    offsetY: 10,
    markers: {
      width: 12,
      height: 12,
      offsetY: 0 // You can also adjust the marker's position if needed
    },
    itemMargin: {
      vertical: 5 // Adds space between legend items
    },
    // other legend configurations...
  },
  margin: {
    bottom: 30 // Adjust this value to provide more space at the bottom of the chart
  },
});

chart.render();

function updateChartWithBulkData() {
  // Retrieve the log data from localStorage
  const logDataString = localStorage.getItem('logData');
  const logDataArray = JSON.parse(logDataString) || [];

  // Arrays to hold the new data points for each series
  const temp0DataPoints = [];
  const temp1DataPoints = [];
  const fanDataPoints = [];

  // Loop through each log entry and create data points
  logDataArray.forEach((dataPoint) => {
    const { time, temp0, temp1, fan } = dataPoint;
    temp0DataPoints.push({ x: new Date(time), y: temp0 });
    temp1DataPoints.push({ x: new Date(time), y: temp1 });
    fanDataPoints.push({ x: new Date(time), y: Math.max(fan, 0) }); // Ensure fan speed is never less than 0
  });

  // Update the chart with the new datasets
  // This will replace any existing data in the chart
  chart.updateSeries([
    { name: 'Temp0', data: temp0DataPoints },
    { name: 'Temp1', data: temp1DataPoints },
    { name: 'Fan', data: fanDataPoints }
  ]);

  // Optionally, if your chart library requires you to redraw or re-render after updating data
  chart.redraw();
}

function updateChart(dataPoint) {
  // Destructure the data point into its components
  const { time, temp0, temp1, fan } = dataPoint;

  // Create new data points for each series
  const newTemp0DataPoint = { x: new Date(time), y: temp0 };
  const newTemp1DataPoint = { x: new Date(time), y: temp1 };
  const newFanDataPoint = { x: new Date(time), y: Math.max(fan, 0) }; // Ensure fan speed is never less than 0

  // Get existing data for all series
  const existingTemp0Data = chart.w.config.series[0].data;
  const existingTemp1Data = chart.w.config.series[1].data;
  const existingFanData = chart.w.config.series[2].data;

  // Combine with existing data for each series
  const updatedTemp0Data = existingTemp0Data.concat(newTemp0DataPoint);
  const updatedTemp1Data = existingTemp1Data.concat(newTemp1DataPoint);
  const updatedFanData = existingFanData.concat(newFanDataPoint);

  // Update the series with the new data
  chart.updateSeries([
    { name: 'Pit', data: updatedTemp0Data },
    { name: 'Food', data: updatedTemp1Data },
    { name: 'Fan', data: updatedFanData }
  ]);
}

function initChart(chart) {
  const now = new Date();
  const initialData = [];

  // Create data points for the last hour at 5-minute intervals
  // for (let i = 0; i < 12; i++) {
  //   initialData.push({
  //     x: new Date(now.getTime() - (5 * 60 * 1000 * i)),
  //     y: 0
  //   });
  // }


  const minutesToSubtract = 1;
  now.setMinutes(now.getMinutes() - minutesToSubtract);

  initialData.push({
    x: new Date(now.getTime()),
    y: 0
  });

  // Initialize the series with the data
  chart.updateSeries([
    { name: 'Pit', data: initialData },
    { name: 'Food', data: initialData },
    { name: 'Fan', data: initialData }
  ]);
}

initChart(chart);



// // Function to update the chart with new data
// function updateChart(newData) {
//   const existingData = chart.w.config.series[0].data;
//   const combinedData = existingData.concat(newData); // Combine with existing data
//   chart.updateSeries([{ data: combinedData }]);
// }



// // mock data calls below...
  
// // Function to simulate fetching data
// function fetchData(lastDataTime, tempEnd, callback) {
//   const newDataTime = lastDataTime + 15 * 1000; // Increment last data time by 15 seconds
//   const temperature = tempEnd + (Math.random() * 10 - 5); // Fluctuate around the end temperature
//   callback([{ x: newDataTime, y: parseFloat(temperature.toFixed(1)) }]);
// }
  
// // Initial data setup
// const now = new Date();
// const initialStartTime = now.getTime() - 10 * 60 * 60 * 1000; // 10 hours ago
// let lastDataTime = initialStartTime;
// const tempEnd = 250; // End temperature
  
// // Initial fetch
// fetchData(lastDataTime, tempEnd, function(initialData) {
//   updateChart(initialData);
//   lastDataTime = initialData[initialData.length - 1].x; // Update lastDataTime
// });
  
//   // Continuous data fetch every 15 seconds
// setInterval(function() {
//   fetchData(lastDataTime, tempEnd, function(newData) {
//     updateChart(newData);
//     lastDataTime = newData[newData.length - 1].x; // Update lastDataTime
//   });
// }, 15 * 1000); // Every 15 seconds