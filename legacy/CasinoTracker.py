"""Retired 2021 Codere scraper. Do not run. Secrets belong in environment variables, not source."""
from warnings import formatwarning
import os
import requests
from bs4 import BeautifulSoup
import smtplib
from email.mime.text import MIMEText

URLMX = 'https://sports.codere.mx/es_MX/t/45349/Liga-MX'
URLGB = 'https://sports.codere.mx/es_MX/t/19157/Premier-League'
URLFR = 'https://sports.codere.mx/es_MX/t/45646/Ligue-1'
URLBOX = 'https://sports.codere.mx/es_MX/s/BOXI/Boxeo'



URLTABLEMX = 'https://www.transfermarkt.mx/liga-mx-clausura/verletztespieler/wettbewerb/MEX1#'

headers = {
    "User-Agent" : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'}

pageMX = requests.get(URLMX, headers=headers)
pageGB = requests.get(URLGB, headers=headers)
pageFR = requests.get(URLFR, headers=headers)
pageBOX = requests.get(URLBOX, headers=headers)


TransfermarktMX = requests.get(URLTABLEMX, headers=headers)

def listToString(s): 
    
    # initialize an empty string
    str1 = " " 
    
    # return string  
    return (str1.join(s))
        
         

def AcquisitionsMX():
    soup = BeautifulSoup(pageMX.content, 'html.parser')
    teamName = soup.find_all('span', class_='seln-name')
    momiodec = soup.find_all('span', class_='price dec')
    momious = soup.find_all('span', class_='price us')
    momiofrac = soup.find_all('span', class_='price frac')
    teams = []
    mdec = []
    mus = []
    mfrac = []

    for i in teamName:
        teams.append(i.text)
        
    for i in momiodec:
        mdec.append(i.text)

    for i in momious:
        mus.append(i.text)

    for i in momiofrac:
        mfrac.append(i.text)
        
    part = len(teams)//2
    
    tx = 0
    ty = 2
    mdecx = 0
    mdecy = 3
    musx = 0
    musy = 3
    mfracx = 0
    mfracy = 3

    text = ""

    for i in range(part):
        text += " ".join(teams[tx:ty]) + "\n"
        text += " local | empate | visita" + "\n"
        text += " | ".join(mdec[mdecx:mdecy]) + "\n"
        text += " | ".join(mus[musx:musy]) + "\n"
        text += " | ".join(mfrac[musx:musy]) + "\n"
        text += "\n"
        mdecx += 3
        mdecy += 3
        musx += 3
        musy += 3
        mfracx += 3
        mfracy += 3
        tx += 2
        ty += 2

    return text

def AcquisitionsBOX():

    soup = BeautifulSoup(pageBOX.content, 'html.parser')
    teamName = soup.find_all('span', class_='seln-name')
    momiodec = soup.find_all('span', class_='price dec')
    momious = soup.find_all('span', class_='price us')
    momiofrac = soup.find_all('span', class_='price frac')
    teams = []
    mdec = []
    mus = []
    mfrac = []

    for i in teamName:
        teams.append(i.text)
        
    for i in momiodec:
        mdec.append(i.text)

    for i in momious:
        mus.append(i.text)

    for i in momiofrac:
        mfrac.append(i.text)
        
    part = len(teams)//2
    
    tx = 0
    ty = 2
    mdecx = 0
    mdecy = 3
    musx = 0
    musy = 3
    mfracx = 0
    mfracy = 3

    text = ""

    for i in range(part):
        text += "".join(teams[tx:ty]) + "\n"
        text += " local | empate | visita" + "\n"
        text += " | ".join(mdec[mdecx:mdecy])+ "\n"
        text += " | ".join(mus[musx:musy]) + "\n"
        text += " | ".join(mfrac[musx:musy]) + "\n"
        text += "\n"
        mdecx += 3
        mdecy += 3
        musx += 3
        musy += 3
        mfracx += 3
        mfracy += 3
        tx += 2
        ty += 2

    return text
    






print("---------------------------------------------------------------------------------")

#LIGA MX

soup = BeautifulSoup(pageMX.content, 'html.parser')
LigaMx = "LIGA MX"
space = " "
#Acquisitions()



#PREMIER LEAGUE

soup = BeautifulSoup(pageGB.content, 'html.parser')
PremierLeague = "PREMIER LEAGUE"
space1 = " "
#Acquisitions()




#LEAGUE 1 UBER EATS

League1 = "LEAGUE 1 UBEAR EATS"
space2 = " "



#BOXING

soup = BeautifulSoup(pageBOX.content, 'html.parser')
Boxing = "BOXING"
space3 = " "
#Acquisitions()




def CreateTXT():

    f = open("Tracking.txt", "a")
    f.write(LigaMx)
    f.write("\n")
    f.write(space)
    f.write("\n")
    f.write(AcquisitionsMX())
    f.write("\n")

    f.write("\n")
    f.write(Boxing)
    f.write("\n")
    f.write(space)
    f.write("\n")
    f.write(AcquisitionsBOX())
    f.write("\n")



def send_mail():
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.ehlo()
    server.starttls()
    server.ehlo()

    server.login(os.environ["GMAIL_USER"], os.environ["GMAIL_APP_PASSWORD"])
    subject = 'Casino Info'
    body = 'LIGA MX' + '\n' +  AcquisitionsMX() + "\n" +"Check: https://sports.codere.mx/es_MX/t/45349/Liga-MX" + "\n" + '---------------------------------------------------------------------------------' + '\n' + 'BOXING' + '\n' + AcquisitionsBOX() +  "\n" +"Check: https://sports.codere.mx/es_MX/s/BOXI/Boxeo" + "\n"
        
    msg = f"subject: {subject}\n\n{body}"

    server.sendmail(
        os.environ["GMAIL_USER"],
        os.environ["GMAIL_TO"],
        msg

    )

    print("sent")

    server.quit()


CreateTXT()
send_mail()
