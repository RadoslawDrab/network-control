import requests
import os
from win11toast import notify
from time import sleep
from math import floor
from pathlib import Path

import utils.window as w
from utils import *
from utils.custom_io import get_mac_address, set_keyboard_block, set_mouse_block

from classes.Arguments import Arguments
from classes.Config import Config
from classes.Logs import Logs

NotificationType = enum(urgent='urgent', alarm='alarm')

connection_error: bool = False
iteration: int = 0
created_info: bool = False
saved_time: int = 0

def init():
  global saved_time
  args = Arguments()
  config = Config(Path(args.path))
  logs = Logs(Path(config.logs_path), args.name, timestamp_on_create=False)
  
  iterate: bool = True
  saved_time = config.initial_time

  notify('App started', f'Version {config.version}', duration='short')

  window = w.create_block_info()
  def set_error(error: str, type: str = 'ERROR', time: int = 5, stop_iteration: bool = False, notification: bool = False, notification_type: NotificationType = 'urgent'):
    global iterate
    print(f"{type}: {error}")
    logs.new(f"{type}: {error}")
    notification and notify(type, error, duration='short', scenario=notification_type)
    iterate = not stop_iteration
    stop_iteration and window.remove()
    sleep(time)
  
  def get():
    if not iterate: return
    
    global is_locked, created_info, connection_error, saved_time, iteration
    try:
      addresses = get_mac_address(config.interfaces)
      if len(addresses) > 0:
        data: dict[str, any] = {}
        if connection_error: 
          newTime = max(saved_time - config.interval, 0)
          data.update({
            'isLocked': newTime <= 0,
            'timeInfo': iteration <= 5 or (newTime < 60 * 5 and newTime > (60 * 5) - 5),
            'remainingSeconds': newTime
          })
          iteration += config.interval

          if iteration > config.reconnection_time:
            connection_error = False
            iteration = 0
        else:
          response = requests.get(f'{config.ip}/api/status/{addresses[0]}', timeout=config.connection_timeout * 1000)
          data = response.json() 
          connection_error = False
          iteration = 0

        is_locked = data.get('isLocked')
        timeInfo = data.get('timeInfo')
        shutdown = data.get('shutdown')
        restart = data.get('restart')
        remainingSeconds = data.get('remainingSeconds')
        remainingTime = 0
        if remainingSeconds != None:
          remainingTime = floor(remainingSeconds / 60)
          saved_time = remainingSeconds

        if timeInfo and not created_info:
          w.create_time_info(remainingTime)
          created_info = True
        elif not timeInfo and created_info:
          created_info = False

        if shutdown == True:
          os.system('shutdown -t 0 -f')
        if restart == True:
          os.system('shutdown -t 0 -f -r')

        if is_locked != None: 
          set_keyboard_block(is_locked)
          set_mouse_block(is_locked)

          window.set_state(is_locked)
          if not is_locked:
            print('OFFLINE' if connection_error else 'ONLINE',  remainingSeconds)
        else:
          raise Exception(f"MAC address '{addresses[0]}' not registered")
      else:
        raise Exception('No MAC addresses matching')
      
      
    except requests.RequestException as error:
      connection_error = True
      saved_time -= config.connection_timeout
      set_error('Couldn\'t connect to server', 'REQUEST ERROR', notification=True, time=0, notification_type='alarm')
    except requests.ConnectionError as error:
      connection_error = True
      saved_time -= config.connection_timeout
      set_error(f'Connection error {error}', 'CONNECTION ERROR', notification=True, time=0, notification_type='alarm')
    except Exception as error:
      set_error(error)

  window.start(False, get, config.interval * 1000)

if __name__ == '__main__':
  init()
