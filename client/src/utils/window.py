import tkinter
import math
from win11toast import notify
from typing import Callable

class Window():
  target: Callable[..., any] = None 
  time: int = 1000
  def __init__(self, name: str):
    self.root = tkinter.Tk(name)
    self.hide()
  def start(self, show: bool = True, target: Callable[..., any] = target, time: int = time):
    if show:
      self.show()

    self.target = target
    self.time = time

    if target != None:
      self.worker()

    self.root.mainloop()
  def setState(self, show: bool):
    if show: 
      self.show()
    else:
      self.hide()
  def remove(self):
    self.hide()
    self.root.quit()
  def show(self):
    if not self.isRunning():
      self.root.deiconify()
      self.root.focus_set()
      self.root.lift()
  def hide(self):
    if self.isRunning():
      self.root.withdraw()
  def isRunning(self):
    return self.root.state() == 'normal'
  def worker(self):
    self.target()
    if self.time > 0:
      self.root.after(max(self.time, 100), self.worker)


def createBlockInfo():
  window = Window('block')
  window.root.title('ALERT')
  window.root.configure(padx=100, pady=100)
  window.root.attributes('-fullscreen', True)
  window.root.attributes("-topmost", True)

  group = tkinter.Frame(window.root)
  tkinter.Label(group, text='Komputer zablokowany', font=('TkDefaultFont', 35, 'bold')).pack()
  tkinter.Label(group, text='Skontaktuj się z bibliotekarzem dyżurnym, aby odblokować', font=('TkDefaultFont', 20), pady=30 ).pack()
  group.pack(expand=True)

  window.hide()
  return window

def createTimeInfo(minutes: int):
  hours = math.floor(minutes / 60)
  time = minutes
  note = 'minut'

  if minutes <= 1:
    note = 'minuta'
  elif minutes > 1 and minutes < 5:
    note = 'minuty'

  if minutes < 1:
    time = 'mniej niż 1'
  if hours > 0:
    time = hours
    if hours == 1:
      note = 'godzina'
    elif hours > 1 and hours < 5:
      note = 'godziny'
    else:
      note = 'godzin' 
  notify('INFORMACJA', f'Pozostało: {time} {note} do końca czasu', duration='long', scenario='urgent')