import json,os,math
from datetime import datetime

def logname(dev,prefix="log"):
    return "./data/" + prefix + "-" + dev + ".json"

def fdesc(logs):
    stime = datetime.fromtimestamp(logs[0][0]/1000)
    etime = datetime.fromtimestamp(logs[len(logs)-1][0]/1000)
    elapsed = (etime-stime).total_seconds()
    runtime = ""
    if elapsed > 3600:
        runtime += "{:.0f}h".format(math.floor(elapsed/3600))
        elapsed = elapsed - math.floor(elapsed/3600)*3600
    if elapsed > 60:
        runtime += "{:.0f}m".format(math.floor(elapsed/60))
        elapsed = elapsed - math.floor(elapsed/60)*60
    runtime += "{:.0f}s".format(round(elapsed, 0))
    return stime.strftime("-%y-%m-%d-%H-%M-%S-") + runtime

def stripfile(fname):
    return os.path.basename(fname).replace("save-","").replace(".json","")

def readlogs(fname,prefix="log"):
    logs = []
    try:
        with open(logname(fname,prefix)) as lf:
            listo = lf.read()
            logs = logs + json.loads("[" + listo[0:len(listo)-2] + "]")
    except Exception as e:
        pass
    return logs

def writelogs(fname,logs,prefix="log"):
    if prefix == "save":
        fname += fdesc(logs)
    with open(logname(fname,prefix),"a+") as lf:
        for log in logs:
            lf.write(json.dumps(log,default=str) + ",\n")


def clear(fname):
    open(logname(fname), 'w').close() # empties the file