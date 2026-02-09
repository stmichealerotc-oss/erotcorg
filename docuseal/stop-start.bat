@echo off
echo Stopping DocuSeal...
docker compose down
echo.
echo Starting DocuSeal...
docker compose up -d
echo.
echo Waiting for DocuSeal to start...
timeout /t 5 /nobreak >nul
echo.
echo DocuSeal is running at http://localhost:3001
echo.
docker compose logs -f
