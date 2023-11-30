// DataHelper.h
#ifndef DATAHELPER_H
#define DATAHELPER_H

#include "FS.h"
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <Arduino_JSON.h>
#include <time.h>

void initLittleFS(const char * path);
void writeFile(fs::FS &fs, const char * path, const char * message);
void appendFile(fs::FS &fs, const char * path, const char * message);
void readFile(fs::FS &fs, const char * path);
void deleteFile(fs::FS &fs, const char * path);

//void checkAndResetJsonFile(const char* filename);
//void addLogEntry(const char* filename, const char* time, float temp0, float temp1, int fan);
//String getLogFileContents(const char* filename);
//String getFileSystemInfo();

#endif /* DATAHELPER_H */
