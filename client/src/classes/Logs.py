from pathlib import Path
from datetime import datetime

class Logs:
  def __init__(self, path: Path, name: str | None = None):
    self.__dir = Path.absolute(path)
    self.__path = Path(self.__dir, f'{name or ''}.logs')
    
    if not Path.exists(self.__path): 
      Path.mkdir(self.__dir, exist_ok=True)
      # with open(self.__path, 'w') as file:
      #   file.write('')
    with open(self.__path, '+a') as file:
      file.write(f'\n\n----- {datetime.today()} ------\n')
  def new(self, value: str) -> None:
    with open(self.__path, '+a') as file:
      file.write(f'[{datetime.today()}] {value}\n')