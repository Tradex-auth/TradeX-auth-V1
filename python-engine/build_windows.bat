@echo off
echo Installing PyInstaller...
pip install pyinstaller

echo Compiling TradeX Desktop App for Windows...
pyinstaller --windowed --onefile --hidden-import=uvicorn --hidden-import=fastapi --hidden-import=vectorbt --hidden-import=pandas --hidden-import=numpy --hidden-import=yfinance --hidden-import=ta desktop_app.py

echo Build complete! Look inside the 'dist' folder for 'desktop_app.exe'. Zip it and upload it to Supabase Storage!
pause
