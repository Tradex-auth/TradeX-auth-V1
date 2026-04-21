#!/bin/bash
echo "Installing PyInstaller..."
pip3 install pyinstaller

echo "Compiling TradeX Desktop App for Mac..."
# --windowed removes the terminal background, --onefile bundles dependencies
# Including essential hidden imports for FastAPI, VectorBT and Pandas
pyinstaller --windowed --onefile \
  --hidden-import=uvicorn \
  --hidden-import=fastapi \
  --hidden-import=vectorbt \
  --hidden-import=pandas \
  --hidden-import=numpy \
  --hidden-import=yfinance \
  --hidden-import=ta \
  desktop_app.py

echo "Build complete! Look inside the 'dist' folder for 'desktop_app.app'. Zip it and upload it to Supabase Storage!"
