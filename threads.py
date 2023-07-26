import threading

thr = []

def start_thread(fn,args):
    t = threading.Thread(target=fn,args=(args,))
    t.start()
    thr.append(t)

def stop_threads():
    for t in thr:
        try:
            t.join()
        except:
            pass # self closing the test thread will fail

rtimer = 0
def reset_timeout(to,ktofn):
    global rtimer
    if rtimer or to == 0:
        try:
            rtimer.cancel()
        except:
            pass
    if to != 0:
        rtimer = threading.Timer(to,ktofn,[to])
        rtimer.start()
