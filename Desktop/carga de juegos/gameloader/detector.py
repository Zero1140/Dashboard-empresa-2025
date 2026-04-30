import ftplib
from typing import Optional

from models import ConsoleInfo, ConsoleType


def verify_hen(ip: str) -> bool:
    """
    Verifica que HEN está activo en la PS3.
    HEN activo = la carpeta /dev_hdd0/packages/ es accesible vía FTP.
    """
    ftp = None
    try:
        ftp = ftplib.FTP()
        ftp.connect(ip, 21, timeout=5)
        ftp.login()
        ftp.cwd("/dev_hdd0/packages/")
        return True
    except Exception:
        return False
    finally:
        if ftp is not None:
            try:
                ftp.quit()
            except Exception:
                pass


def detect_console(ip: str) -> Optional[ConsoleInfo]:
    """
    Intenta identificar si la IP es PS3 (MultiMAN) o Xbox RGH.
    Para PS3, también verifica si HEN está activo en la misma sesión FTP.
    Devuelve ConsoleInfo o None si no es ninguna consola conocida.
    """
    # Intentar PS3: MultiMAN usa FTP anónimo, root contiene 'dev_hdd0'
    try:
        ftp = ftplib.FTP()
        ftp.connect(ip, 21, timeout=3)
        ftp.login()
        entries = ftp.nlst()
        if any("dev_hdd0" in e for e in entries):
            # Verificar HEN en la misma sesión: intentar cwd a packages/
            hen_ok = False
            try:
                ftp.cwd("/dev_hdd0/packages/")
                hen_ok = True
            except Exception:
                pass
            ftp.quit()
            last = ip.rsplit(".", 1)[1]
            return ConsoleInfo(
                ip=ip,
                console_type=ConsoleType.PS3,
                label=f"PS3-{last}",
                hen_verified=hen_ok,
            )
        ftp.quit()
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
