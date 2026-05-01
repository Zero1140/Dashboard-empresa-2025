import ftplib
import socket
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


def _probe_webman(ip: str) -> bool:
    """Returns True if webMAN MOD's HTTP server responds on port 80."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2.0)
        result = s.connect_ex((ip, 80))
        s.close()
        return result == 0
    except Exception:
        return False


def detect_console(ip: str) -> Optional[ConsoleInfo]:
    """
    Intenta identificar si la IP es PS3 (MultiMAN/webMAN) o Xbox RGH.
    Para PS3, verifica HEN vía FTP y detecta si webMAN MOD está activo.
    Devuelve ConsoleInfo o None si no es ninguna consola conocida.
    """
    # Intentar PS3: MultiMAN usa FTP anónimo, root contiene 'dev_hdd0'
    try:
        ftp = ftplib.FTP()
        ftp.connect(ip, 21, timeout=3)
        ftp.login()
        entries = ftp.nlst()
        if any("dev_hdd0" in e for e in entries):
            # Verificar HEN en la misma sesión FTP
            hen_ok = False
            try:
                ftp.cwd("/dev_hdd0/packages/")
                hen_ok = True
            except Exception:
                pass
            ftp.quit()
            last = ip.rsplit(".", 1)[1]
            webman_active = _probe_webman(ip)
            firmware_type = None
            if webman_active:
                from webman import WebManClient
                firmware_type = WebManClient(ip).get_fw_type()
                if firmware_type == "CFW":
                    hen_ok = True   # CFW siempre está desbloqueada
            return ConsoleInfo(
                ip=ip,
                console_type=ConsoleType.PS3,
                label=f"PS3-{last}",
                hen_verified=hen_ok,
                webman=webman_active,
                firmware_type=firmware_type,
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
