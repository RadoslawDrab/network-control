import psutil
import pynput
import re

keyboard_listener = pynput.keyboard.Listener(suppress=True)
mouse_listener = pynput.mouse.Listener(suppress=True)

def get_mac_address(include: list[str] = []):
  addresses: list[str] = []
  for interface in psutil.net_if_addrs():
    address = psutil.net_if_addrs()[interface][0].address
    if len(include) > 0:
      if not any(re.match(inclusion, interface) for inclusion in include): continue
      addresses += [address]
    else:
      addresses += [address]  
  return addresses
def set_mouse_block(block: bool):
    global mouse_listener
    if block:
      if not mouse_listener.running:
        mouse_listener = pynput.mouse.Listener(suppress=True)
        mouse_listener.start()
    else:
      if mouse_listener.running:
        mouse_listener.stop()
def set_keyboard_block(block: bool):
    global keyboard_listener
    if block:
      if not keyboard_listener.running:
        keyboard_listener = pynput.keyboard.Listener(suppress=True)
        keyboard_listener.start()
    else:
      if keyboard_listener.running:
        keyboard_listener.stop()