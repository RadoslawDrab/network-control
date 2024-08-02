import threading



def runInParallel(*fns):
  threads: list[threading.Thread] = []
  # if __name__ == "__main__":
  for fn in fns:
    thread = threading.Thread(target=fn)
    thread.start()
    threads.append(thread)
  return threads