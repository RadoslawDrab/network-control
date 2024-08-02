import psutil
import pynput
import re

keyboardListener = pynput.keyboard.Listener(suppress=True)
mouseListener = pynput.mouse.Listener(suppress=True)

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