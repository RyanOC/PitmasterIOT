#include "DataHelper.h"
#include "FS.h"
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <Arduino_JSON.h>
#include <time.h>

#define FORMAT_LITTLEFS_IF_FAILED true

time_t getNtpTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time");
    return 0;
  }
  Serial.println("got the time!");
  Serial.println(mktime(&timeinfo));
  return mktime(&timeinfo);
}

void initLittleFS(const char * path){
    if(!LittleFS.begin(FORMAT_LITTLEFS_IF_FAILED)){
        Serial.println("LittleFS Mount Failed");
        return;
    }
    else{
        Serial.println("Little FS Mounted Successfully");
    }

    // Check if the file already exists to prevent overwritting existing data
    bool fileexists = LittleFS.exists(path);
    Serial.print(fileexists);

    if(!fileexists) {
        Serial.println("File doesn’t exist");
        Serial.println("Creating file...");
        // Create File and add header
        writeFile(LittleFS, path, "MY ESP32 DATA \r\n");
    }
    else {
        Serial.println("File already exists");
    }
}

void writeFile(fs::FS &fs, const char * path, const char * message){
    Serial.printf("Writing file: %s\r\n", path);

    File file = fs.open(path, FILE_WRITE);
    if(!file){
        Serial.println("- failed to open file for writing");
        return;
    }
    if(file.print(message)){
        Serial.println("- file written");
    } else {
        Serial.println("- write failed");
    }
    file.close();
}

void appendFile(fs::FS &fs, const char * path, const char * message){
    Serial.printf("Appending to file: %s\r\n", path);

    File file = fs.open(path, FILE_APPEND);
    if(!file){
        Serial.println("- failed to open file for appending");
        return;
    }
    if(file.print(message) && file.println()){
        Serial.println("- message appended");
    } else {
        Serial.println("- append failed");
    }
    file.close();
}

void readFile(fs::FS &fs, const char * path){
    Serial.printf("Reading file: %s\r\n", path);

    File file = fs.open(path);
    if(!file || file.isDirectory()){
        Serial.println("- failed to open file for reading");
        return;
    }

    Serial.println("- read from file:");
    while(file.available()){
        Serial.write(file.read());
    }
    file.close();
}

void deleteFile(fs::FS &fs, const char * path){
  Serial.printf("Deleting file: %s\r\n", path);
  if(fs.remove(path)){
    Serial.println("- file deleted");
  } else {
    Serial.println("- delete failed");
  }
}

// void checkAndResetJsonFile(const char* filename) {
//   // Check if the file exists
//   File file = LittleFS.open(filename, "r");
//   bool shouldReset = false;

//   if (!file) {
//     Serial.println("File does not exist, creating new file.");
//     shouldReset = true;
//   } else {
//     // Check the age of the file
//     StaticJsonDocument<512> doc;
//     DeserializationError error = deserializeJson(doc, file);
//     if (error) {
//       Serial.println("Failed to read file, creating new file.");
//       shouldReset = true;
//     } else {
//       time_t lastUpdated = doc["lastUpdated"];
//       time_t currentTime = getNtpTime();
//       if (currentTime - lastUpdated > 48 * 3600) {
//         Serial.println("File is older than 48 hours, resetting file.");
//         shouldReset = true;
//       }
//     }
//     file.close();
//   }

//   // Reset the file if necessary
//   if (shouldReset) {
//     file = LittleFS.open(filename, "w");
//     if (!file) {
//       Serial.println("Failed to open file for writing");
//       return;
//     }

//     StaticJsonDocument<512> doc;
//     doc["lastUpdated"] = getNtpTime();
//     doc["data"] = "Default content"; // Replace with your actual default content

//     if (serializeJson(doc, file) == 0) {
//       Serial.println("Failed to write to file");
//     } else {
//       Serial.println("File reset successfully");
//     }
//     file.close();
//   }
// }

// StaticJsonDocument<2048> getLogList(const char* filename) {
//     StaticJsonDocument<2048> doc;
//     File file = LittleFS.open(filename, "r");
//     if (!file) {
//         Serial.println("Creating new log list file.");
//         doc.createNestedArray("logs"); // Create a new array named "logs"
//     } else {
//         // Deserialize the JSON document from the file
//         DeserializationError error = deserializeJson(doc, file);
//         if (error || !doc.containsKey("logs")) {
//             Serial.println("Failed to read log list or 'logs' key not found. Creating new list.");
//             doc.clear();
//             doc.createNestedArray("logs");
//         }
//         file.close();
//     }
//     return doc;
// }

// void addLogEntry(const char* filename, const char* time, float temp0, float temp1, int fan) {
//     // Get the current log list or create a new one if it doesn't exist
//     StaticJsonDocument<2048> doc = getLogList(filename);
    
//     // Get the logs array from the document
//     JsonArray logs = doc["logs"];

//     // Create a new JSON object for the log entry directly inside the logs array
//     JsonObject logEntry = logs.createNestedObject();
//     logEntry["time"] = time;  // Assuming 'time' is a string
//     logEntry["temp0"] = temp0;
//     logEntry["temp1"] = temp1;
//     logEntry["fan"] = fan;
    
//     // Open the file for writing
//     File file = LittleFS.open(filename, "w");
//     if (!file) {
//         Serial.println("Failed to open file for writing");
//         return;
//     }
    
//     // Serialize the JSON document back to the file
//     if (serializeJson(doc, file) == 0) {
//         Serial.println("Failed to write log to file");
//     } else {
//         Serial.println("Log entry added successfully");
//     }
    
//     file.close();
// }

// String getFileSystemInfo() {
//     if (!LittleFS.begin()) {
//         Serial.println("Failed to mount file system");
//         return "{}";
//     }
//     // Note: The specific API call here depends on the version of the ESP32 core and filesystem library.
//     // If LittleFS::info() does not exist, you may need to use an alternative method provided by the library.
    
//     size_t totalBytes = LittleFS.totalBytes();
//     size_t usedBytes = LittleFS.usedBytes();

//     // Create a JSON document
//     StaticJsonDocument<256> doc;

//     // Fill the document with file system information
//     doc["totalSpace"] = totalBytes;
//     doc["usedSpace"] = usedBytes;
//     doc["freeSpace"] = totalBytes - usedBytes;
    
//     // Serialize the JSON document to a string
//     String jsonPayload;
//     serializeJson(doc, jsonPayload);
    
//     LittleFS.end(); // Unmount the file system

//     return jsonPayload;
// }