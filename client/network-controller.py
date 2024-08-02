import requests
import pynput
import re
import psutil
import tkinter
import threading
from multiprocessing import Process
from time import sleep

iterate = True
interval = 1
includeInterfaces: list[str] = []

keyboardListener = pynput.keyboard.Listener(suppress=True)
mouseListener = pynput.mouse.Listener(suppress=True)
threads: list[threading.Thread] = []

root = tkinter.Tk()
root.title('ALERT')
root.configure(padx=100, pady=100)
root.attributes('-fullscreen', True)
root.attributes("-topmost", True)

group = tkinter.Frame(root)
tkinter.Label(group, text='Komputer zablokowany', font=('TkDefaultFont', 35, 'bold')).pack()
tkinter.Label(group, text='Skontaktuj się z bibliotekarzem dyżurnym, aby odblokować', font=('TkDefaultFont', 20), pady=30 ).pack()
group.pack(expand=True)

def getMac(include: list[str] = []):
  addresses: list[str] = []
  for interface in psutil.net_if_addrs():
    address = psutil.net_if_addrs()[interface][0].address
    if len(include) > 0:
      if not any(re.match(inclusion, interface) for inclusion in include): continue
      addresses += [address]
    else:
      addresses += [address]  
  return addresses
def setMouseBlock(block: bool):
    global mouseListener
    if block:
      if not mouseListener.running:
        mouseListener = pynput.mouse.Listener(suppress=True)
        mouseListener.start()
    else:
      if mouseListener.running:
        mouseListener.stop()
def setKeyboardBlock(block: bool):
    global keyboardListener
    if block:
      if not keyboardListener.running:
        keyboardListener = pynput.keyboard.Listener(suppress=True)
        keyboardListener.start()
    else:
      if keyboardListener.running:
        keyboardListener.stop()

def setError(error: str, type: str = 'ERROR', time: int = 5):
  global iterate
  root.withdraw()
  root.quit()
  print(f"{type}: {error}")
  iterate = False
  sleep(time)

def runInParallel(*fns):
  # proc = []
  global threads
  if __name__ == "__main__":
    for fn in fns:
      thread = threading.Thread(target=fn)
      thread.start()
      threads.append(thread)
    # for thread in thread:
    #   thread.join()
  return threads

def init():
  global includeInterfaces
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

        if isLocked != None: 
          setKeyboardBlock(isLocked)
          setMouseBlock(isLocked)

          if not isLocked:
            print(data.get('remainingSeconds'))
            root.withdraw()
          else:
            root.deiconify()
            root.focus_set()
            root.lift()
            # if not windowThread.is_alive():
            #   windowThread.start()
            # runInParallel(showWindow)
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
root.mainloop()
