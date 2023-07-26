import json,time,glob,os,signal
from flask import Flask,Response,request

import sse,threads,OWONDecode,pydmm,utils,testdata

import asyncio
from bleak import BleakClient, BleakScanner

sysactive = True # used to shutdown the app
reading = False # used to control the reading threads
activedev = False # active devicename or False if we're not connected
blenames = []
comports = []
loop = asyncio.get_event_loop() # TODO this isn't assigned yet - doesn't SEEM to be a problem but...
lasttime = -1 

async def getbledevs():
    global blenames
    blenames = []
    devices = await BleakScanner.discover(return_adv=True)
    for d, a in devices.values():            
        if d.name and d.name != d.address.replace(":","-"): # on Linux blank names show as MAC - we don't want those
            blenames.append({"name": d.name,"mac": d.address})
    return blenames

def getcomdevs():
    global comports
    comports = []
    import serial.tools.list_ports
    ports = serial.tools.list_ports.comports()
    for port,desc,hwid in sorted(ports):
        comports.append({"port": port, "name": desc, "hwid": hwid})
    return comports

def getdevs():
    global reading
    reading = False
    while loop.is_running():
        time.sleep(.25)
    loop.run_until_complete(getbledevs())
    getcomdevs()

def sendval(dev,val):
    global lasttime
    tim = round(time.time()*1000,0) # seconds or ms - it cannot decide!!
    val = abs(round(val,3)*1000) # we care not for negative values or undue precision...
    if tim-lasttime > 250: # this gets called a LOT - esp from BLE devices - we max out at 4/s
        sse.add_message(json.dumps({"type": "data","value": val,"time": tim}))
        utils.writelogs(dev.replace("/dev/tty",""),[[tim,val]])
        lasttime = tim

def closelog():
    global activedev
    if activedev:
        # TODO we need to wrap-up the logfile IF it's worth saving (we may just have disconnected unsuccessfully)
        sse.add_message(json.dumps({"type": "disconnected","device": activedev}))
        try:
            logs = utils.readlogs(activedev)
            if len(logs) > 10:
                utils.writelogs(activedev,logs,"save")
            sse.add_message(json.dumps({"type": "filesupdated"}))
            utils.clear(activedev)
        except Exception as e:
            pass
        activedev = False

async def ableloop(devicename):
    global reading
    MODEL_NBR_UUID = "0000fff4-0000-1000-8000-00805f9b34fb"
    
    def handle(sender,data):
        sendval(devicename,float(OWONDecode.decode(sender,data)[1]))

    print("BLE Scanning for",devicename)
    devices = await BleakScanner.discover(return_adv=True)
    for d, a in devices.values():            
        if d.name == devicename:
            print("BLE Connected")
            async with BleakClient(d.address) as client:
                while reading and client.is_connected:
                    try: # this can throw an exception on disconnected - we can ignore it
                        await client.start_notify(MODEL_NBR_UUID,handle)                                
                    except:
                        pass
                reading = False
                print("BLE Disconnected")                
    print("BLE Ending")
    closelog()
    
def bleloop(devicename):
    global reading
    reading = False
    while loop.is_running():
        time.sleep(.25)
    reading = True
    asyncio.set_event_loop(loop)
    loop.run_until_complete(ableloop(devicename))

def comloop(portname):
    global reading
    reading = True
    print("COMM starting on",portname)
    while reading:
        try:
            number = pydmm.read_dmm(port=portname, baudrate=2400,timeout=3)
            sendval(portname,float(number))
        except Exception as e:
            print("COMM reading failed")
            reading = False
    print("COMM Ending")
    closelog()

## Flask Server
app = Flask(__name__,static_url_path='', static_folder='site')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/stream')
def stream():
    global sysactive
    def stream():
        messages = sse.announcer.listen()  
        while sysactive:
            msg = messages.get()  
            yield msg
    return Response(stream(), mimetype='text/event-stream')

@app.route("/loaddevs")
def loaddevs():
    global activedev
    if (not activedev or (len(blenames) + len(comports) == 0)):
        getdevs()
    return {"ble": blenames,"com": comports,"active": activedev}

@app.route("/getfiles")
def getfiles():
    flist = []
    for fl in glob.glob("./data/save*.json"):
        fl = utils.stripfile(fl)
        flist.append(fl)
    return {"files": flist}

@app.route("/loadlog", methods=['POST'])
def loadlog():
    logf = ""
    if request.json.get("portname"):
        logf = request.json.get("portname")[4:]
        return(utils.readlogs(logf))
    elif request.json.get("logfile"):
        logf = request.json.get("logfile")
        if logf == "Test":
            return(testdata.gettestdata())
        else:
            return(utils.readlogs(logf,"save"))
    return "OK"

@app.route("/start", methods=['POST'])
def startread():  
    global activedev
    closelog() # we do this to ensure there's nothing left in the logfile - e.g. from a crash
    dev = request.json.get("device")
    activedev = dev[4:]
    try:        
        if dev.startswith("ble:"):
            threads.start_thread(bleloop,dev[4:])
        else:
            threads.start_thread(comloop,dev[4:])
    except:
        pass
    return "OK"

@app.route("/stopread")
def stopread():
    global reading
    reading = False
    return "OK"

@app.route("/stopapp")
def stopapp():    
    global reading,sysactive
    reading = False
    sysactive = False
    os.kill(os.getpid(), signal.SIGINT) # brutal but effective
    return "OK"

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080)