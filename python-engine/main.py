from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
import vectorbt as vbt
import numpy as np
import traceback
import ta

app = FastAPI(title="TradeX VectorBT Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BacktestRequest(BaseModel):
    code: str
    symbol: str
    start_date: str
    end_date: str

@app.post("/run-backtest")
def run_backtest(req: BacktestRequest):
    try:
        # 1. Fetch data
        print(f"Fetching {req.symbol} from {req.start_date} to {req.end_date}")
        data = yf.download(req.symbol, start=req.start_date, end=req.end_date)
        if data.empty:
            raise Exception("No data found for the given symbol and date range. Please ensure it's a valid Yahoo Finance symbol (e.g., BTC-USD).")
        
        # Flatten multi-index if necessary (yfinance sometimes returns multi-index columns)
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = [c[0] for c in data.columns]
            
        close = data['Close']

        # 2. Execute user code safely
        local_env = {
            'vbt': vbt,
            'np': np,
            'pd': pd,
            'ta': ta,
            'close': close
        }

        exec(req.code, {}, local_env)
        
        if 'entries' not in local_env or 'exits' not in local_env:
            raise Exception("Your code MUST define 'entries' and 'exits' variables.")
        
        entries = local_env['entries']
        exits = local_env['exits']

        # 3. Process with VectorBT
        pf = vbt.Portfolio.from_signals(close, entries, exits, init_cash=100000, fees=0.001)
        
        # 4. Extract metrics cleanly
        win_rate = pf.win_rate()
        tot_ret = pf.total_return()
        drwdwn = pf.max_drawdown()
        trades = pf.trades.count()

        metrics = {
            "winRate": round(float(win_rate) * 100, 2) if pd.notna(win_rate) else 0.0,
            "totalReturn": round(float(tot_ret) * 100, 2) if pd.notna(tot_ret) else 0.0,
            "maxDrawdown": round(float(drwdwn) * 100, 2) * -1 if pd.notna(drwdwn) else 0.0, # Make positive %
            "tradesCount": int(trades) if pd.notna(trades) else 0
        }
        print(f"Success: {metrics}")
        return metrics

    except Exception as e:
        print("Error during execution:", e)
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
