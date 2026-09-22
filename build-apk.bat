@echo off
set JAVA_HOME=C:\Users\EP5622\javatools\jdk-21.0.4+7
set ANDROID_HOME=C:\Users\EP5622\android-sdk
set PATH=%JAVA_HOME%\bin;%PATH%
cd /d C:\Users\EP5622\Documents\Default Project\ArchiveTunaApp\android
call gradlew.bat assembleDebug > "C:\Users\EP5622\Documents\Default Project\ArchiveTunaApp\apk-build.log" 2>&1
