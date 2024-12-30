import PyInstaller.__main__

PyInstaller.__main__.run([
  '--noconsole',
  '-n',
  'network-controller',
  '--onefile',
  'src/network-controller.py'
])
# PyInstaller.__main__.run([
#   '-n',
#   'network-controller_window',
#   '--onefile',
#   'src/network-controller.py'
# ])
PyInstaller.__main__.run([
  '--onefile',
  'src/updater.py'
])