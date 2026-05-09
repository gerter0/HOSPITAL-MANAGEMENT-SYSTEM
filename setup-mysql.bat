@echo off
REM Create database and tables in XAMPP MySQL

cd C:\xampp\mysql\bin

echo Creating hospital management database...

REM Create database without password requirement
mysql.exe -h localhost -u root -e "CREATE DATABASE IF NOT EXISTS hospital_management_system;"

echo Creating user...
mysql.exe -h localhost -u root -e "CREATE USER IF NOT EXISTS 'hospital_app'@'localhost' IDENTIFIED BY 'secure_password';"

echo Granting permissions...
mysql.exe -h localhost -u root -e "GRANT ALL PRIVILEGES ON hospital_management_system.* TO 'hospital_app'@'localhost'; FLUSH PRIVILEGES;"

echo Creating tables...
mysql.exe -h localhost -u root hospital_management_system < ..\..\..\database\schema.sql

echo.
echo Database setup complete!
echo.
pause
