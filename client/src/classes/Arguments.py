import argparse

class Arguments():
  path: str
  def __init__(self):
    parser = argparse.ArgumentParser(prefix_chars='--')
    parser.add_argument('-p', '--path', help='Path where to search for config files', type=str, default='./', metavar='PATH')

    for arg, value in parser.parse_args()._get_kwargs():
      setattr(self, arg, value)