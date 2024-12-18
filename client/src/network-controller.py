import requests
import re
import os
from win11toast import notify
from time import sleep
from math import floor
from pathlib import Path

import utils.window as w
from utils import *
from utils.custom_io import getMac, setKeyboardBlock, setMouseBlock

from classes.Arguments import Arguments
from classes.Config import Config
from classes.Logs import Logs

NoticationType = enum(urgent='urgent', alarm='alarm')

connectionError: bool = False
iteration: int = 0
createdInfo: bool = False
savedTime: int = 0

def init():
  global savedTime
  args = Arguments()
  config = Config(Path(args.path))
  logs = Logs(Path(config.logs_path), 'network-controller')
  
  iterate: bool = True
  savedTime = config.initial_time
  

  window = w.createBlockInfo()
  def set_error(error: str, type: str = 'ERROR', time: int = 5, stop_iteration: bool = False, notification: bool = False, notification_type: NoticationType = 'urgent'):
    global iterate
    print(f"{type}: {error}")
    logs.new(f"{type}: {error}")
    notification and notify(type, error, duration='short', scenario=notification_type)
    iterate = not stop_iteration
    stop_iteration and window.remove()
    sleep(time)
  
  def get():
    if not iterate: return
    
    global isLocked, createdInfo, connectionError, savedTime, iteration
    try:
      addresses = getMac(config.interfaces)
      if len(addresses) > 0:
        data: dict[str, any] = {}
        if connectionError: 
          newTime = max(savedTime - config.interval, 0)
          data.update({
            'isLocked': newTime <= 0,
            'timeInfo': iteration <= 5 or (newTime < 60 * 5 and newTime > (60 * 5) - 5),
            'remainingSeconds': newTime
          })
          iteration += config.interval

          if iteration > config.reconnection_time:
            connectionError = False
            iteration = 0
        else:
          response = requests.get(f'{config.ip}/api/status/{addresses[0]}', timeout=config.connection_timeout * 1000)
          data = response.json() 
          connectionError = False
          iteration = 0

        isLocked = data.get('isLocked')
        timeInfo = data.get('timeInfo')
        shutdown = data.get('shutdown')
        restart = data.get('restart')
        remainingSeconds = data.get('remainingSeconds')
        remainingTime = 0
        if remainingSeconds != None:
          remainingTime = floor(remainingSeconds / 60)
          savedTime = remainingSeconds

        if timeInfo and not createdInfo:
          w.createTimeInfo(remainingTime)
          createdInfo = True
        elif not timeInfo and createdInfo:
          createdInfo = False

        if shutdown == True:
          os.system('shutdown -t 0 -f')
        if restart == True:
          os.system('shutdown -t 0 -f -r')

        if isLocked != None: 
          setKeyboardBlock(isLocked)
          setMouseBlock(isLocked)

          window.setState(isLocked)
          if not isLocked:
            print('OFFLINE' if connectionError else 'ONLINE',  remainingSeconds)
        else:
          raise Exception(f"MAC address '{addresses[0]}' not registered")
      else:
        raise Exception('No MAC addresses matching')
      
      
    except requests.RequestException as error:
      connectionError = True
      savedTime -= config.connection_timeout
      set_error('Couldn\'t connect to server', 'REQUEST ERROR', notification=True, time=0, notification_type='alarm')
    except requests.ConnectionError as error:
      connectionError = True
      savedTime -= config.connection_timeout
      set_error(f'Connection error {error}', 'CONNECTION ERROR', notification=True, time=0, notification_type='alarm')
    except Exception as error:
      set_error(error, notification=True, time=0, notification_type='alarm')

  window.start(False, get, config.interval * 1000)

if __name__ == '__main__':
  init()
