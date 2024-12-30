from pathlib import Path
from datetime import datetime

class Logs:
  def __init__(self, path: Path, name: str | None = None, timestamp_on_create: bool = True):
    self.__dir = Path.absolute(path)
    self.__path = Path(self.__dir, f'{name or ''}.logs')
    self.__added_timestamp: bool = False

    if timestamp_on_create:
      self.create_timestamp()
  def create_timestamp(self, name: str | None = None) -> None:
    if not Path.exists(self.__path):
      Path.mkdir(self.__dir, exist_ok=True)

    with open(self.__path, '+a') as file:
      date = datetime.today()
      file.write(f'\n\n----- {date} ------\n')
      if name and len(name) > 0:
        file.write(f'----- {name.strip().center(len(str(date)))} ------\n')
      self.__added_timestamp = True
  def new(self, value: str, print_log: bool = False) -> None:
    if not self.__added_timestamp:
      self.create_timestamp()
    with open(self.__path, '+a') as file:
      if print_log:
        print(value)
      file.write(f'[{datetime.today().time()}] {value}\n')