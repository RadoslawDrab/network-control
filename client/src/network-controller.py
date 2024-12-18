import requests
import re
import os
from win11toast import notify
from time import sleep
from math import floor

import utils.window as w
from utils import *
from utils.custom_io import getMac, setKeyboardBlock, setMouseBlock

from classes.Arguments import Arguments

interval: float = 1
includeInterfaces: list[str] = []
ip: str = ''
savedTime: int = 100000
connectionError: bool = False
tryToConnectAfter: int = 120
connectionTimeout: int = 5

iterate: bool = True
iteration: int = 0
createdInfo = False



args = Arguments()
window = w.createBlockInfo()

NoticationType = enum(urgent='urgent', alarm='alarm')

def setError(error: str, type: str = 'ERROR', time: int = 5, stopIteration: bool = False, notification: bool = False, notificationType: NoticationType = 'urgent'):
  global iterate
  print(f"{type}: {error}")
  notification and notify(type, error, duration='short', scenario=notificationType)
  iterate = not stopIteration
  stopIteration and window.remove()
  sleep(time)

def init():
  def getConfig(line: str, params: list[str]):
    for param in params:
      if line.startswith(param + '='):
        return [re.sub(param + '=', '', line), param]
  global includeInterfaces, savedTime, tryToConnectAfter, connectionTimeout
  
  interfacesFilePath = os.path.join(os.path.abspath(args.path), 'interfaces.txt')
  try:
    file = open(interfacesFilePath, 'r')
    lines = file.readlines()
    for line in lines:
      includeInterfaces += [re.sub('\\n', '', line)]

  except FileNotFoundError:
    print(f'No file \'{interfacesFilePath}\' exists')
  
  try:
    global ip, interval
    confFilePath = os.path.join(os.path.abspath(args.path), '.conf')
    file = open(confFilePath, 'r')
    lines = file.readlines()
    for line in lines:
      if line.startswith('#'): continue
      line = re.sub('\\n', '', line)
      [value, param] = getConfig(line, ['ip', 'interval', 'initialTime', 'reconnectionTime', 'connectionTimeout'])
      if param == 'ip':
        ip = value
      elif param == 'interval':
        interval = int(value)
      elif param == 'initialTime':
        savedTime = int(value)
      elif param == 'reconnectionTime':
        tryToConnectAfter = int(value)
      elif param == 'connectionTimeout':
        connectionTimeout = int(value)
  except FileNotFoundError:
    print(f'No file \'{confFilePath}\' exists')

  window.start(False, get, interval * 1000)
def get():
  if iterate:
    global isLocked, connectionError, savedTime, interval, createdInfo, iteration, ip, connectionTimeout, tryToConnectAfter
    try:
      addresses = getMac(includeInterfaces)
      if len(addresses) > 0:
        data: dict[str, any] = {}
        if connectionError: 
          newTime = max(savedTime - interval, 0)
          data.update({
            'isLocked': newTime <= 0,
            'timeInfo': iteration <= 5 or (newTime < 60 * 5 and newTime > (60 * 5) - 5),
            'remainingSeconds': newTime
          })
          iteration += interval

          if iteration > tryToConnectAfter:
            connectionError = False
            iteration = 0
        else:
          response = requests.get(f'{ip}/api/status/{addresses[0]}', timeout=connectionTimeout * 1000)
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
      savedTime -= connectionTimeout
      setError('Couldn\'t connect to server', 'REQUEST ERROR', notification=True, time=0, notificationType='alarm')
    except Exception as error:
      setError(error)

init()
