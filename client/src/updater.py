import os
import re
import time
from pathlib import Path

from tqdm import tqdm
import requests

from classes.Arguments import Arguments
from classes.Config import Config
from classes.Logs import Logs

URL = 'https://wbp.lodz.pl/pliki/network-controller/client/{path}'

def init() -> None:
    args = Arguments()
    config = Config(Path(args.path))
    logs = Logs(Path(config.logs_path), args.name, timestamp_on_create=False)

    download_latest = args.version == 'latest' or not re.match(r'\d+\.\d+\.\d+', args.version)

    # Gets remote version
    version = requests.get(URL.format(path='version')).text if download_latest else args.version

    # Checks if version in config is the same as remote
    is_latest = not any([v > config.version.split('.')[i] for i, v in enumerate(version.split('.'))])


    if is_latest and download_latest:
        print("There's no newer version")
        return
    else:
        if config.version == version:
            return
        logs.create_timestamp('UPDATER')
        logs.new(f'App update: {config.version} -> {version}', True)
    start_time = time.time()

    app_name = f'{args.name}.exe'
    app_path = Path.joinpath(Path(config.app_path), app_name)

    print(app_path)

    response = requests.get(URL.format(path=f'{version}/{app_name}'), stream=True)

    if not response.ok:
        logs.new(f'FTP ERROR: [{response.status_code}] {response.reason}: {response.url}', True)
        return

    try:
        # Removes app
        os.remove(app_path)
    except FileNotFoundError:
        logs.new('ERROR: File not found', True)
    except Exception as error:
        logs.new(error.__repr__())
    total_size: int = int(response.headers.get('content-length', 0))
    block_size: int = 1024

    # Downloads file and shows progress bar
    with open(app_path, 'wb', buffering=block_size) as f, tqdm(desc='Downloading new version', total=total_size, unit='B', unit_scale=True, leave=False) as pb:
        for chunk in response.iter_content(chunk_size=block_size):
            f.write(chunk)
            pb.update(len(chunk))

    # Updates config version numer
    config.update(version=version)

    logs.new(f'App updated in {time.time() - start_time:.3f}s', True)


if __name__ == "__main__":
    init()
