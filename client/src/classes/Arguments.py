import argparse

class Arguments:
  path: str
  name: str
  version: str = 'latest',
  def __init__(self):
    self.parser = argparse.ArgumentParser(prefix_chars='--', formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    self.parser.add_argument('-p', '--path', help='Path where to search for config files', type=str, default='./', metavar='PATH')
    self.parser.add_argument('-n', '--name', help='Application name', type=str, default='network-controller', metavar='PATH')
    self.parser.add_argument('-v', '--version', help='Get/Set app version', type=str, default='latest', metavar='VERSION')

    self.parse_args()
  def parse_args(self) -> None:
    for arg, value in self.parser.parse_args()._get_kwargs():
      setattr(self, arg, value)

