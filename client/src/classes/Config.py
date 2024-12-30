import re
from pathlib import Path
from src.utils import get_attributes, get_type

class AppConfig:
  version: str = '1.0.0'
  ip: str | None = None
  interval: int = 5
  initial_time: int = 120
  reconnection_time: int = 300
  connection_timeout: int = 3
  interfaces: list[str] = ['^Ethernet$']
  logs_path: str = './logs',
  app_path: str = './'
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
        values.append((attr, getattr(self, str(attr))))
      
      file.write('\n'.join([f'{attr}={value}' for attr, value in values if value is not None]))
  def update(self, **kwargs: any) -> None:
    with open(self.__path, 'r') as file:
      current_file_lines = file.readlines()

      with open(self.__path, 'w') as file:
        lines: list[str] = []
        for key, value in kwargs.items():
          if key not in get_attributes(self): continue

          setattr(self, key, get_type(value))

          for line in current_file_lines:
            if line.startswith('#') or not line.startswith(key):
              lines.append(line.replace('\n', ''))
              continue

            lines.append(re.sub(r'(?<==).*', str(value), line).replace('\n', ''))
        lines = [re.sub('\n','', line) for line in lines if len(line) > 0]
        file.write('\n'.join(lines))





