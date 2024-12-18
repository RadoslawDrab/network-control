from pathlib import Path
from utils import get_attributes, get_type

class AppConfig:
  ip: str | None = None
  interval: int = 5
  initial_time: int = 120
  reconnection_time: int = 300
  connection_timeout: int = 3
  interfaces: list[str] = ['^Ethernet$']
  logs_path: str = './logs'
class Config(AppConfig):
  def __init__(self, path: Path):
    self.__path = Path(path, 'settings.conf')

    self.init()
    
  def init(self):
    if not Path.exists(self.__path):
      self.set_default()

    with open(self.__path, 'r') as file:
      lines = [line.replace('\n', '') for line in file.readlines() if not line.startswith('#')]
      
      for line in lines:
        splitted = line.split('=')
        if len(splitted) != 2:
          print(f"Can't recognize line: {line}")
          continue
        setattr(self, splitted[0], get_type(splitted[1]))    
  def set_default(self) -> None:
    with open(self.__path, 'w') as file:
      values: list[tuple[str, any]] = []
      for attr in get_attributes(self):
        values.append((attr, getattr(self, attr)))
      
      file.write('\n'.join([f'{attr}={value}' for attr, value in values if value != None]))