import json
import os
import pandas as pd
from time import sleep
from threading import Thread
from os.path import join, exists
from traceback import print_exc
from random import random
from datetime import datetime, timezone, timedelta, date
from api.dwx_client import dwx_client
import numpy as np
import pandas_ta as ta
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from backtesting import Strategy, Backtest
from apscheduler.schedulers.blocking import BlockingScheduler
import sys
from threading import Event
from backtesting import Strategy
from backtesting import Backtest
class getdf():
    def __init__(self, MT4_directory_path, 
                 sleep_delay=1,             # 5 ms for time.sleep()
                 max_retry_command_seconds=10,  # retry to send the commend for 10 seconds if not successful. 
                 verbose=True):
        self.data_event = Event()
        self.dfstream = None

        self.dwx = dwx_client(self, MT4_directory_path, sleep_delay, 
                              max_retry_command_seconds, verbose=verbose)
        sleep(1)
        self.dwx.start()
        
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=100)  # last 100 days
        self.dwx.get_historic_data('AUDCAD', 'M5', start.timestamp(), end.timestamp())

    def on_historic_data(self, symbol, time_frame, data):
        print('historic_data:', symbol, time_frame, f'{len(data)} bars')
        print(data)
        
        data_list = []

        for date_str, values in data.items():
            date = datetime.strptime(date_str, "%Y.%m.%d %H:%M")
            data_dict = {
                'date': date,
                'open': values['open'],
                'high': values['high'],
                'low': values['low'],
                'close': values['close'],
                'tick_volume': values['tick_volume']
            }
            data_list.append(data_dict)
        
        self.dfstream = pd.DataFrame(data_list)
        print(self.dfstream)
        self.data_event.set()  # Signal that data is ready
        
    def on_message(self, message):
        if message['type'] == 'ERROR':
            print(message['type'], '|', message['error_type'], '|', message['description'])
        elif message['type'] == 'INFO':
            print(message['type'], '|', message['message'])
    
    def get_data_frame(self):
        self.data_event.wait()  # Wait until data is ready
        return self.dfstream

# Example usage
MT4_files_dir = r'C:\Users\guill\AppData\Roaming\MetaQuotes\Terminal\6C3C6A11D1C3791DD4DBF45421BF8028\MQL5\Files'
if not exists(MT4_files_dir):
    print('ERROR: metatrader_dir_path does not exist!')
    sys.exit()

processor = getdf(MT4_files_dir)

# Wait for data to be processed and retrieve the DataFrame
df = processor.get_data_frame()
print(df)


class AnalyzeData:
    def __init__(self, data_processor, ):
        # data_processor es una instancia de la clase getdf
        self.data_processor = data_processor

    def analyze(self):
        # Obtener el DataFrame desde la instancia de getdf
        df = self.data_processor.get_data_frame()
        # Aquí puedes realizar análisis o manipulaciones con el DataFrame
        print("Análisis del DataFrame:")
        print(df.describe())  # Ejemplo de análisis: mostrar estadísticas descriptivas

# Uso de las clases
MT4_files_dir = r'C:\Users\guill\AppData\Roaming\MetaQuotes\Terminal\6C3C6A11D1C3791DD4DBF45421BF8028\MQL5\Files'
if not exists(MT4_files_dir):
    print('ERROR: metatrader_dir_path does not exist!')
    sys.exit()

processor = getdf(MT4_files_dir)
analyzer = AnalyzeData(processor)  # Pasar la instancia de getdf a la nueva clase

# Esperar a que los datos estén listos y luego realizar el análisis







class tick_processor:
    
    def __init__(self, MT4_directory_path, sleep_delay=0.100, max_retry_command_seconds=10, verbose=True, df):
        self
        self.open_test_trades = False
        self.last_open_time = datetime.now(timezone.utc)
        self.last_modification_time = datetime.now(timezone.utc)
        
        self.dwx = dwx_client(self, MT4_directory_path, sleep_delay, max_retry_command_seconds, verbose=verbose)
        sleep(1)
        
        self.dwx.start()
        print("Account info:", self.dwx.account_info)
        
        self.dwx.subscribe_symbols(['EURUSD'])
    
    def on_historic_data(self, symbol, time_frame, data):
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=1)
        self.dwx.get_historic_data('EURUSD', 'M5', start.timestamp(), end.timestamp())
        print('historic_data:', symbol, time_frame, f'{len(data)} bars')
        print(data)
        
        data_list = []
        for date_str, values in data.items():
            date = datetime.strptime(date_str, "%Y.%m.%d %H:%M")
            data_dict = {
                'date': date,
                'open': values['Open'],
                'high': values['High'],
                'low': values['Low'],
                'close': values['Close'],
                'tick_volume': values['Tick_volume']
            }
            data_list.append(data_dict)
        
        df = pd.DataFrame(data_list)
        print(df)
        print(len(df))
        df = df[df.High != df.Low]
        df["VWAP"] = ta.vwap(df.High, df.Low, df.Close, df.Tick_volume)
        df['RSI'] = ta.rsi(df.Close, length=16)
        my_bbands = ta.bbands(df.Close, length=14, std=2.0)
        df = df.join(my_bbands)
        df.dropna(inplace=True)
        
        VWAPsignal = [0] * len(df)
        backcandles = 15

        for row in range(backcandles, len(df)):
            upt = 1
            dnt = 1
            for i in range(row-backcandles, row+1):
                if max(df.Open[i], df.Close[i]) >= df.VWAP[i]:
                    dnt = 0
                if min(df.Open[i], df.Close[i]) <= df.VWAP[i]:
                    upt = 0
            if upt == 1 and dnt == 1:
                VWAPsignal[row] = 3
            elif upt == 1:
                VWAPsignal[row] = 2
            elif dnt == 1:
                VWAPsignal[row] = 1

        df['VWAPSignal'] = VWAPsignal
        self.TotalSignal(df)

    def TotalSignal(self, df):
        def calculate_signal(l):
            if df.VWAPSignal[l] == 2 and df.Close[l] <= df['BBL_14_2.0'][l] and df.RSI[l] < 45:
                return 2
            if df.VWAPSignal[l] == 1 and df.Close[l] >= df['BBU_14_2.0'][l] and df.RSI[l] > 55:
                return 1
            return 0

        TotSignal = [0] * len(df)
        backcandles = 15
        for row in range(backcandles, len(df)):
            TotSignal[row] = calculate_signal(row)
        df['TotalSignal'] = TotSignal
        df[df.TotalSignal != 0].count()
        self.pointposbreak(df)
        
    def pointposbreak(self, df):
        def calculate_pointposbreak(x):
            if x['TotalSignal'] == 1:
                return x['High'] + 1e-4
            elif x['TotalSignal'] == 2:
                return x['Low'] - 1e-4
            else:
                return np.nan
        df['pointposbreak'] = df.apply(lambda row: calculate_pointposbreak(row), axis=1)
        df['ATR'] = ta.atr(df.High, df.Low, df.Close, length=7)
        self.fitting_job(df)
        self.on_tick(df)
    def fitting_job(self, df):
        def SIGNAL():
            return df.TotalSignal
        class MyStrat(Strategy):
            mysize = 3000
            def init(self):
                super().init()
                self.signal1 = self.I(SIGNAL)

            def next(self):
                super().next()
                slatr = 1.2 * self.data.ATR[-1]
                TPSLRatio = 1.5

                if len(self.trades) > 0:
                    if self.trades[-1].is_long and self.data.RSI[-1] >= 90:
                        self.trades[-1].close()
                    elif self.trades[-1].is_short and self.data.RSI[-1] <= 10:
                        self.trades[-1].close()
                
                if self.signal1 == 2 and len(self.trades) == 0:
                    sl1 = self.data.Close[-1] - slatr
                    tp1 = self.data.Close[-1] + slatr * TPSLRatio
                    self.buy(sl=sl1, tp=tp1, size=self.mysize)
                elif self.signal1 == 1 and len(self.trades) == 0:
                    sl1 = self.data.Close[-1] + slatr
                    tp1 = self.data.Close[-1] - slatr * TPSLRatio
                    self.sell(sl=sl1, tp=tp1, size=self.mysize)

        bt = Backtest(df, MyStrat, cash=1000, margin=1/30, commission=0.004)
        stats, heatmap = bt.optimize(slatr=[i/10 for i in range(10, 26)],
                                     TPSLRatio=[i/10 for i in range(10, 26)],
                                     maximize='Return [%]', max_tries=300,
                                     random_state=0,
                                     return_heatmap=True)

        slatrcoef = stats["_strategy"].slatr
        TPSLRatio_coef = stats["_strategy"].TPSLRatio
        print(slatrcoef, TPSLRatio_coef)
        with open("fitting_data_file.txt", "a") as file:
            file.write(f"{slatrcoef}, {TPSLRatio_coef}, expected return, {stats['Return [%]']}\n")



    def on_tick(self, symbol, bid, ask, df):

      dfstream = df
      signal = total_signal(dfstream, len(dfstream)-1, 7) # current candle looking for open price entry
    
      global slatrcoef
      global TPSLRatio_coef    
    
      now = datetime.now()
      if now.weekday() == 0 and now.hour < 7 and now.minute < 5:  # Monday before 07:05
          fitting_job()
          print(slatrcoef, TPSLRatio_coef)

      slatr = slatrcoef*dfstream.ATR.iloc[-1]
      TPSLRatio = TPSLRatio_coef
      max_spread = 16e-5
    
      candle = get_candles(1)[-1]
      candle_open_bid = float(str(candle.bid.o))
      candle_open_ask = float(str(candle.ask.o))
      spread = candle_open_ask-candle_open_bid

      SLBuy = candle_open_bid-slatr-spread
      SLSell = candle_open_ask+slatr+spread

      TPBuy = candle_open_ask+slatr*TPSLRatio+spread
      TPSell = candle_open_bid-slatr*TPSLRatio-spread
    
      client = API(access_token=access_token)
      #Sell
      if signal == 1 and count_opened_trades() == 0 and spread<max_spread:
        print("Sell Signal Found...")
        mo = MarketOrderRequest(instrument="EUR_USD", units=-lotsize, takeProfitOnFill=TakeProfitDetails(price=TPSell).data, stopLossOnFill=StopLossDetails(price=SLSell).data)
        r = orders.OrderCreate(accountID, data=mo.data)
        rv = client.request(r)
        print(rv)
        with open("trading_data_file.txt", "a") as file:
            file.write(f"{slatrcoef}, {TPSLRatio_coef}\n")

    #Buy
      elif signal == 2 and count_opened_trades() == 0 and spread<max_spread:
        print("Buy Signal Found...")
        mo = MarketOrderRequest(instrument="EUR_USD", units=lotsize, takeProfitOnFill=TakeProfitDetails(price=TPBuy).data, stopLossOnFill=StopLossDetails(price=SLBuy).data)
        r = orders.OrderCreate(accountID, data=mo.data)
        rv = client.request(r)
        print(rv)
        with open("trading_data_file.txt", "a") as file:
            file.write(f"{slatrcoef}, {TPSLRatio_coef}\n")

    def on_tick(self, symbol, bid, ask):

        now = datetime.now(timezone.utc)

        print('on_tick:', now, symbol, bid, ask)

        # to test trading. 
        # this will randomly try to open and close orders every few seconds. 
        if self.open_test_trades:
            if now > self.last_open_time + timedelta(seconds=3):

                self.last_open_time = now
                
                order_type = 'buy'
                price = ask
                if random() > 0.5:
                    order_type = 'sell'
                    price = bid

                self.dwx.open_order(symbol=symbol, order_type=order_type, 
                                    price=price, lots=0.5)

            if now > self.last_modification_time + timedelta(seconds=10):

                self.last_modification_time = now

                for ticket in self.dwx.open_orders.keys():
                    self.dwx.close_order(ticket, lots=0.1)

            if len(self.dwx.open_orders) >= 10:
                self.dwx.close_all_orders()
                # self.dwx.close_orders_by_symbol('GBPUSD')
                # self.dwx.close_orders_by_magic(0)


    def on_bar_data(self, symbol, time_frame, time, open_price, high, low, close_price, tick_volume):
        print('on_bar_data:', symbol, time_frame, datetime.now(timezone.utc), time, open_price, high, low, close_price)

    
    def on_historic_data(self, symbol, time_frame, data):
        
        # you can also access the historic data via self.dwx.historic_data. 
        print('historic_data:', symbol, time_frame, f'{len(data)} bars')


    def on_historic_trades(self):

        print(f'historic_trades: {len(self.dwx.historic_trades)}')
        

    def on_message(self, message):

        if message['type'] == 'ERROR':
            print(message['type'], '|', message['error_type'], '|', message['description'])
        elif message['type'] == 'INFO':
            print(message['type'], '|', message['message'])


    # triggers when an order is added or removed, not when only modified. 
    def on_order_event(self):
        
        print(f'on_order_event. open_orders: {len(self.dwx.open_orders)} open orders')

MT4_files_dir = r'C:\Users\guill\AppData\Roaming\MetaQuotes\Terminal\6C3C6A11D1C3791DD4DBF45421BF8028\MQL5\Files'
processor = tick_processor(MT4_files_dir)
while processor.dwx.ACTIVE:
    sleep(1)