import threading



def runInParallel(*fns):
  threads: list[threading.Thread] = []
  # if __name__ == "__main__":
  for fn in fns:
    thread = threading.Thread(target=fn, daemon=True)
    thread.start()
    threads.append(thread)
  return threads

def enum(**enums):
    return type('Enum', (), enums)