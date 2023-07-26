import queue
from datetime import datetime

lastsse = datetime.now()

class MessageAnnouncer:
    def __init__(self):
        self.listeners = []
    def listen(self):
        q = queue.Queue(maxsize=5)
        self.listeners.append(q)
        return q
    def announce(self, msg):
        for i in reversed(range(len(self.listeners))):
            try:
                try:
                    self.listeners[i].put_nowait(msg)
                except queue.Full:
                    del self.listeners[i]
            except: # multi-threaded index out of range errors mostly
                pass
announcer = MessageAnnouncer()

def format_sse(data: str, event=None) -> str:
    msg = f'data: {data}\n\n'
    if event is not None:
        msg = f'event: {event}\n{msg}'
    return msg

def add_message(m):
    global lastsse
    lastsse = datetime.now()
    msg = format_sse(data=m)
    announcer.announce(msg=msg)
