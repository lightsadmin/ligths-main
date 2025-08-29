@echo off
echo Building APK with optimized settings...
cd android
gradlew assembleDebug --max-workers=1 --no-parallel --no-daemon
echo Build complete! APK location:
echo %CD%\app\build\outputs\apk\debug\app-debug.apk
pause
