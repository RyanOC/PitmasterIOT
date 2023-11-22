// DataHelper.h
#ifndef DATAHELPER_H
#define DATAHELPER_H

#include <ArduinoJson.h>
#include "FS.h"
#include <LittleFS.h>
#include <WiFi.h>
#include <time.h>

// This is where you specify the default argument
void checkAndUpdateJsonFile(const char* filename, bool truncate = false);
void addLogEntry(const char* filename, const char* time, float temp0, float temp1, int fan);
String getLogFileContents(const char* filename);
String getFileSystemInfo();

#endif /* DATAHELPER_H */
