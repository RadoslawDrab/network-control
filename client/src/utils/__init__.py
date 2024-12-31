import threading
import re
from typing import Callable, TypeVar

def run_in_parallel(*fns):
  threads: list[threading.Thread] = []
  # if __name__ == "__main__":
  for fn in fns:
    thread = threading.Thread(target=fn, daemon=True)
    thread.start()
    threads.append(thread)
  return threads

def enum(**enums):
    return type('Enum', (), enums)

def get_attributes(obj: object) -> list[str]:
  return [attribute for attribute in dir(obj) if not attribute.startswith('_') and not isinstance(getattr(obj, attribute), Callable)]

T = TypeVar('T')
def get_type[T](value: any) -> T:
  if re.match(r'true|false', value, re.I):
    return bool(value)
  if re.match(r'^\d+$', value):
    return int(value)
  if re.match(r'^\d*[.,]\d*$', value):
    return float(value)
  if re.match(r'^\[.*]', value):
    value_list = list(re.split(',', re.sub(r'[\[\]]', '', value)))
    return [get_type(item.strip()) for item in value_list]
  if value == 'None':
    return None
  
  return str(value)