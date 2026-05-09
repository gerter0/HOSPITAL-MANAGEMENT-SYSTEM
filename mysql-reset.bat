@echo off
REM Stop MySQL
taskkill /F /IM mysqld.exe 2>nul
timeout /t 2

REM Start MySQL without password requirements
cd C:\xampp\mysql\bin
mysqld.exe --skip-grant-tables
