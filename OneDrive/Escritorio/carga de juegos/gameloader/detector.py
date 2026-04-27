import ftplib
from typing import Optional
from models import ConsoleInfo, ConsoleType


def detect_console(ip: str) -> Optional[ConsoleInfo]:
    """
    Intenta identificar si la IP es PS3 (MultiMAN) o Xbox RGH.
    Devuelve ConsoleInfo o None si no es ninguna consola conocida.
    """
    # Intentar PS3: MultiMAN usa FTP anónimo, root contiene 'dev_hdd0'
    try:
        ftp = ftplib.FTP()
        ftp.connect(ip, 21, timeout=3)
        ftp.login()  # anónimo
        entries = ftp.nlst()
        ftp.quit()
        if any("dev_hdd0" in e for e in entries):
            last = ip.rsplit(".", 1)[1]
            return ConsoleInfo(ip=ip, console_type=ConsoleType.PS3, label=f"PS3-{last}")
    except Exception:
        pass

    # Intentar Xbox: usuario 'xbox', contraseña 'xbox', root contiene 'Hdd1:'
    try:
        ftp = ftplib.FTP()
        ftp.connect(ip, 21, timeout=3)
        ftp.login("xbox", "xbox")
        entries = ftp.nlst()
        ftp.quit()
        if any("Hdd1" in e for e in entries):
            last = ip.rsplit(".", 1)[1]
            return ConsoleInfo(ip=ip, console_type=ConsoleType.XBOX, label=f"Xbox-{last}")
    except Exception:
        pass

    return None
