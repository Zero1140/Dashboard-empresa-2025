import pandas as pd
from datetime import datetime, timezone, timedelta
from time import sleep
from os.path import exists
from api.dwx_client import dwx_client
import sys
from threading import Event, Lock

# Definir un Lock global
historical_data_lock = Lock()

class getdf:
    def __init__(self, MT4_directory_path, sleep_delay=0.1, max_retry_command_seconds=10, verbose=True):
        self.data_event = Event()
        self.dfstream = None
        self.dwx = dwx_client(self, MT4_directory_path, sleep_delay, max_retry_command_seconds, verbose=verbose)
        
        self.dwx.start()
        end = datetime.now(timezone.utc) + timedelta(hours=4)
        start = end - timedelta(days=300)
        self.dwx.get_historic_data('EURUSD', 'M5', start.timestamp(), end.timestamp())

    def on_historic_data(self, symbol, time_frame, data):
        with historical_data_lock:
            data_list = [
                {
                    'Date': datetime.strptime(date_str, "%Y.%m.%d %H:%M"),
                    'Open': values['open'],
                    'High': values['high'],
                    'Low': values['low'],
                    'Close': values['close'],
                    'Tick_volume': values['tick_volume']
                }
                for date_str, values in data.items()
            ]
            self.dfstream = pd.DataFrame(data_list)
            print("getdf300 ha sido llamado")
            
            self.data_event.set()

    def on_message(self, message):
        print(message['type'], '|', message.get('error_type', ''), '|', message.get('description', message.get('message', '')))

    def get_data_frame(self):
        self.data_event.wait()
        return self.dfstream

def main():
    MT4_files_dir = r'C:\Users\guill\AppData\Roaming\MetaQuotes\Terminal\6C3C6A11D1C3791DD4DBF45421BF8028\MQL5\Files'
    if not exists(MT4_files_dir):
        print('ERROR: metatrader_dir_path does not exist!')
        sys.exit()

    with historical_data_lock:
        data_processor1 = getdf(MT4_files_dir)
        df_300_days = data_processor1.get_data_frame()
        print("Datos de 300 días:")
        print(df_300_days)

if __name__ == "__main__":
    main()