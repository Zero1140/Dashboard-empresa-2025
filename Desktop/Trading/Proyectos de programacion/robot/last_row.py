import pandas as pd
from datetime import datetime, timedelta
from os.path import exists
from api.dwx_client import dwx_client
import sys
from time import sleep
from threading import Event, Lock
import pytz

# Definir un Lock global
historical_data_lock = Lock()

class GetDF1:
    def __init__(self, MT4_directory_path, sleep_delay=10, max_retry_command_seconds=10, verbose=True):
        self.data_event1 = Event()
        self.dfstream1 = None
        self.dwx1 = dwx_client(self, MT4_directory_path, sleep_delay, max_retry_command_seconds, verbose=verbose)
        self.dwx1.start()
        
        end1 = datetime.now(pytz.timezone('Etc/GMT-4')) + timedelta(hours=3)
        start1 = end1 - timedelta(minutes=5)
        self.dwx1.get_historic_data('EURUSD', 'M5', start1.timestamp(), end1.timestamp())

    def on_historic_data(self, symbol, time_frame, data1):
        with historical_data_lock:
            data_list1 = [
                {
                    'Date': datetime.strptime(date_str, "%Y.%m.%d %H:%M"),
                    'Open': values['open'],
                    'High': values['high'],
                    'Low': values['low'],
                    'Close': values['close'],
                    'Tick_volume': values['tick_volume']
                }
                for date_str, values in data1.items()
            ]
            self.dfstream1 = pd.DataFrame(data_list1)
            print("getdf1 ha sido llamado")
            
            self.data_event1.set()

    def on_message(self, message):
        print(message['type'], '|', message.get('error_type', ''), '|', message.get('description', message.get('message', '')))

    def get_data_frame1(self):
        self.data_event1.wait()
        return self.dfstream1

def main():
    MT4_files_dir = r'C:\Users\guill\AppData\Roaming\MetaQuotes\Terminal\6C3C6A11D1C3791DD4DBF45421BF8028\MQL5\Files'
    if not exists(MT4_files_dir):
        print('ERROR: metatrader_dir_path does not exist!')
        sys.exit()

    with historical_data_lock:
        last_row_processor = GetDF1(MT4_files_dir)
        df1 = last_row_processor.get_data_frame1()
        print("Datos de 10 minutos:")
        print(df1)

if __name__ == "__main__":
    main()