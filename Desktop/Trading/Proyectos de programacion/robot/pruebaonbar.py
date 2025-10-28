import pandas as pd
from datetime import datetime, timezone, timedelta
from os.path import exists
from api.dwx_client import dwx_client
import sys
from time import sleep
from threading import Event, Lock
import pytz

# Definir un Lock global
historical_data_lock = Lock()

class GetDF2:
    def __init__(self, MT4_directory_path, sleep_delay=10, max_retry_command_seconds=10, verbose=True):
        self.data_event1 = Event()
        self.dfstream1 = pd.DataFrame(columns=['symbol', 'time_frame', 'time', 'open', 'high', 'low', 'close', 'tick_volume'])
        self.dwx1 = dwx_client(self, MT4_directory_path, sleep_delay, max_retry_command_seconds, verbose=verbose)
        self.dwx1.start()

        # Suscribirse a los datos de barras
        self.dwx1.subscribe_symbols_bar_data(['AUDCAD', 'M5'])

    def on_bar_data(self, symbol, time_frame, time, open_price, high, low, close_price, tick_volume):
        # Adquirir el lock antes de modificar el DataFrame
        with historical_data_lock:
            new_data = {
                'symbol': symbol,
                'time_frame': time_frame,
                'time': datetime.fromtimestamp(time, tz=timezone.utc),
                'open': open_price,
                'high': high,
                'low': low,
                'close': close_price,
                'tick_volume': tick_volume
            }
            self.dfstream1 = self.dfstream1.append(new_data, ignore_index=True)
            self.data_event1.set()  # Señalar que se han recibido datos

        print('on_bar_data:', symbol, time_frame, datetime.now(timezone.utc), time, open_price, high, low, close_price)

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

    # Crear una instancia de GetDF1 y obtener el DataFrame
    get_df1_instance = GetDF2(MT4_files_dir)
    df = get_df1_instance.get_data_frame1()
    print(df)

if __name__ == "__main__":
    main()