import requests
import re
import window as w
from time import sleep
from utils import runInParallel
from customIO import getMac, setKeyboardBlock, setMouseBlock

iterate = True
interval = 1
includeInterfaces: list[str] = []

window = w.createBlockInfo()


def setError(error: str, type: str = 'ERROR', time: int = 5):
  global iterate
  window.remove()
  print(f"{type}: {error}")
  iterate = False
  sleep(time)

def init():
  global includeInterfaces
  createdInfo = False
  
  try:
    file = open('./interfaces.txt', 'r')
    lines = file.readlines()
    for line in lines:
      includeInterfaces += [re.sub('\\n', '', line)]

  except FileNotFoundError:
    print('No file \'interface.txt\' exists')

  while iterate:
    global isLocked
    try:
      addresses = getMac(includeInterfaces)
      if len(addresses) > 0:
        response = requests.get('http://172.30.240.83:3000/api/status/' + addresses[0])
        data: dict = response.json() 
        isLocked = data.get('isLocked')
        timeInfo = data.get('timeInfo')
        remainingSeconds = data.get('remainingSeconds')
        remainingTime = 0
        if remainingSeconds != None:
          remainingTime = round(remainingSeconds / 60)

        if timeInfo and not createdInfo:
          w.createTimeInfo(remainingTime)
          createdInfo = True
        elif not timeInfo and createdInfo:
          createdInfo = False

        if isLocked != None: 
          setKeyboardBlock(isLocked)
          setMouseBlock(isLocked)

          window.setState(isLocked)
          if not isLocked:
            print(data.get('remainingSeconds'))
        else:
          raise Exception(f"MAC address '{addresses[0]}' not registered")
      else:
        raise Exception('No MAC addresses matching')
      
      sleep(interval)
    except requests.RequestException as error:
      setError(error, 'REQUEST ERROR')
    except Exception as error:
      setError(error)


runInParallel(init)
# w.createTimeInfo(0)
# window.show()
# window.root.mainloop()
window.start(False)
