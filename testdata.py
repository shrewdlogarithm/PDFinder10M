import utils,random
from datetime import datetime,timedelta

def gettestdata():
    logs = []
    ftime = datetime.now()
    # ftime = ftime.replace(hour=8,minute=0)
    ftime = ftime - timedelta(hours=random.random()*10+2)

    startc = random.random()*2000+1000 # starts between 1a and 4a
    endc = random.random()*300+50 # anything from 50 to 350ma

    # initial shutdown 1/100 chance to drop by 1/20th of the total every second
    while startc > endc:
        if random.random()*100>99:
            startc -= startc/(random.random()*5+5)
        logs.append([ftime.timestamp()*1000,round(startc,0)])
        ftime += timedelta(seconds=5) 

    lastup = 0
    # are we asleep - current over 250ma has 1/100000 chance of losing 50% of it's value - current under has 1/1000000 chance of gaining 250-1000ma
    while ftime < datetime.now():
        if lastup == 0 and startc <= 250 and random.random()>.999:
            lastup = random.random()*150+100
            startc += lastup
        elif lastup != 0 and random.random()>.99:
            startc -= lastup
            lastup = 0            
        logs.append([ftime.timestamp()*1000,round(startc,0)])
        ftime += timedelta(seconds=5) 
    print(len(logs))
    return(logs)

def makelogfile():
    utils.writelogs("TEST",gettestdata(),"save")