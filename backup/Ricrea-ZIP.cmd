@echo off
setlocal
cd /d "%~dp0"
if exist "..\Prisma-workspace-completo.zip" (
    echo Prisma-workspace-completo.zip esiste gia. Non viene sovrascritto.
    pause
    exit /b 1
)
copy /b "Prisma-workspace-completo.zip.part001"+"Prisma-workspace-completo.zip.part002"+"Prisma-workspace-completo.zip.part003"+"Prisma-workspace-completo.zip.part004"+"Prisma-workspace-completo.zip.part005"+"Prisma-workspace-completo.zip.part006" "..\Prisma-workspace-completo.zip"
if errorlevel 1 (
    echo Non e stato possibile ricreare lo ZIP. Controlla che siano presenti tutte le parti.
    pause
    exit /b 1
)
echo.
echo ZIP creato nella cartella principale del repository.
certutil -hashfile "..\Prisma-workspace-completo.zip" SHA256
echo SHA256 previsto: beee9e7aa36b3450470a509e6897f0aa2c7d7811be402e26d113f8ee348f8019
pause
