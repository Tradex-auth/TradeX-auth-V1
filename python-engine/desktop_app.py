import sys
import threading
import tkinter as tk
from tkinter import scrolledtext
import uvicorn
import main

class StdoutRedirector:
    def __init__(self, text_widget):
        self.text_widget = text_widget

    def write(self, string):
        self.text_widget.configure(state='normal')
        self.text_widget.insert(tk.END, string)
        self.text_widget.see(tk.END)
        self.text_widget.configure(state='disabled')

    def flush(self):
        pass

class TradeXEngineUI:
    def __init__(self, root):
        self.root = root
        self.root.title("TradeX Desktop Engine")
        self.root.geometry("500x350")
        self.root.configure(bg="#050505")
        self.root.resizable(False, False)
        
        # Header Area
        self.header_frame = tk.Frame(self.root, bg="#050505")
        self.header_frame.pack(fill=tk.X, pady=15)
        
        self.status_label = tk.Label(self.header_frame, text="🟢 TRADEX ENGINE: ONLINE", font=("Helvetica", 14, "bold"), bg="#050505", fg="#10b981")
        self.status_label.pack()
        
        self.sub_label = tk.Label(self.header_frame, text="Local API listening securely on memory port 8000...", font=("Helvetica", 11), bg="#050505", fg="#737373")
        self.sub_label.pack(pady=2)
        
        # Log Area
        self.log_area = scrolledtext.ScrolledText(self.root, wrap=tk.WORD, bg="#0a0a0a", fg="#10b981", font=("Menlo", 10), borderwidth=1, relief="solid")
        self.log_area.pack(padx=20, pady=5, fill=tk.BOTH, expand=True)
        
        # Inject standard output so uvicorn logs show up in the window
        sys.stdout = StdoutRedirector(self.log_area)
        sys.stderr = StdoutRedirector(self.log_area)
        
        print("System Boot: VectorBT Compiler Initialized.")
        
        # Start server background thread
        self.server_thread = threading.Thread(target=self.run_server, daemon=True)
        self.server_thread.start()

    def run_server(self):
        try:
            # Running uvicorn natively blocks the thread but keeps everything alive
            uvicorn.run("main:app", host="127.0.0.1", port=8000, log_level="info", reload=False)
        except Exception as e:
            print(f"CRASH: {str(e)}")

# Ensure process completely ends when window is closed
if __name__ == '__main__':
    root = tk.Tk()
    app = TradeXEngineUI(root)
    root.protocol("WM_DELETE_WINDOW", lambda: sys.exit(0))
    root.mainloop()
