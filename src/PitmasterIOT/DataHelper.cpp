#include "DataHelper.h"
#include "FS.h"
#include <LittleFS.h>
#include <time.h>

time_t getNtpTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time");
    return 0;
  }
  return mktime(&timeinfo);
}

void checkAndUpdateJsonFile(const char* filename, bool truncate) {
  if (!LittleFS.begin()) {
    Serial.println("An Error has occurred while mounting LittleFS");
    return;
  }
  
  bool shouldUpdate = truncate; // Use the truncate parameter to determine if the file should be updated.
  File file;
  
  if (!truncate) {
    // If not truncating, check the age of the file.
    file = LittleFS.open(filename, "r");
    if (!file) {
      Serial.println("File does not exist, creating new file.");
      shouldUpdate = true;
    } else {
      size_t size = file.size();
      if (size > 0) {
        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, file);
        if (error) {
          Serial.println("Failed to read file, creating new file.");
          shouldUpdate = true;
        } else {
          time_t lastUpdated = doc["lastUpdated"];
          time_t currentTime = getNtpTime();
          if (currentTime - lastUpdated > 24 * 3600) {
            Serial.println("File is older than 24 hours, updating file.");
            shouldUpdate = true;
          }
        }
      } else {
        Serial.println("File is empty, creating new file.");
        shouldUpdate = true;
      }
      file.close();
    }
  }
  
  if (shouldUpdate) {
    file = LittleFS.open(filename, "w");
    if (!file) {
      Serial.println("Failed to open file for writing");
      return;
    }
    
    StaticJsonDocument<512> doc;
    doc["lastUpdated"] = getNtpTime();
    doc["data"] = "Default content"; // Replace with your actual default content
    
    if (serializeJson(doc, file) == 0) {
      Serial.println("Failed to write to file");
    } else {
      Serial.println("File updated successfully");
    }
    file.close();
  }
  
  LittleFS.end();
}

StaticJsonDocument<2048> getLogList(const char* filename) {
    StaticJsonDocument<2048> doc;
    File file = LittleFS.open(filename, "r");
    if (!file) {
        Serial.println("Creating new log list file.");
        doc.createNestedArray("logs"); // Create a new array named "logs"
    } else {
        // Deserialize the JSON document from the file
        DeserializationError error = deserializeJson(doc, file);
        if (error || !doc.containsKey("logs")) {
            Serial.println("Failed to read log list or 'logs' key not found. Creating new list.");
            doc.clear();
            doc.createNestedArray("logs");
        }
        file.close();
    }
    return doc;
}

void addLogEntry(const char* filename, const char* time, float temp0, float temp1, int fan) {
    // Get the current log list or create a new one if it doesn't exist
    StaticJsonDocument<2048> doc = getLogList(filename);
    
    // Get the logs array from the document
    JsonArray logs = doc["logs"];

    // Create a new JSON object for the log entry directly inside the logs array
    JsonObject logEntry = logs.createNestedObject();
    logEntry["time"] = time;  // Assuming 'time' is a string
    logEntry["temp0"] = temp0;
    logEntry["temp1"] = temp1;
    logEntry["fan"] = fan;
    
    // Open the file for writing
    File file = LittleFS.open(filename, "w");
    if (!file) {
        Serial.println("Failed to open file for writing");
        return;
    }
    
    // Serialize the JSON document back to the file
    if (serializeJson(doc, file) == 0) {
        Serial.println("Failed to write log to file");
    } else {
        Serial.println("Log entry added successfully");
    }
    
    file.close();
}

String getFileSystemInfo() {
    if (!LittleFS.begin()) {
        Serial.println("Failed to mount file system");
        return "{}";
    }

    // Note: The specific API call here depends on the version of the ESP32 core and filesystem library.
    // If LittleFS::info() does not exist, you may need to use an alternative method provided by the library.
    
    size_t totalBytes = LittleFS.totalBytes();
    size_t usedBytes = LittleFS.usedBytes();

    // Create a JSON document
    StaticJsonDocument<256> doc;

    // Fill the document with file system information
    doc["totalSpace"] = totalBytes;
    doc["usedSpace"] = usedBytes;
    doc["freeSpace"] = totalBytes - usedBytes;
    
    // Serialize the JSON document to a string
    String jsonPayload;
    serializeJson(doc, jsonPayload);
    
    LittleFS.end(); // Unmount the file system

    return jsonPayload;
}
