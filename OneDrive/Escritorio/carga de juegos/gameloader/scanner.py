import socket
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List

from PyQt6.QtCore import QThread, pyqtSignal

from detector import detect_console
from models import ConsoleInfo


def get_local_subnet() -> str:
    """Devuelve los primeros 3 octetos de la IP local. Ej: '192.168.1'"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
    finally:
        s.close()
    return local_ip.rsplit(".", 1)[0]


def scan_for_ftp(subnet: str, timeout: float = 0.3) -> List[str]:
    """Escanea subnet/24 y devuelve IPs con puerto 21 abierto."""
    def check(ip: str):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((ip, 21))
            sock.close()
            return ip if result == 0 else None
        except Exception:
            return None

    ips = [f"{subnet}.{i}" for i in range(1, 255)]
    found = []
    with ThreadPoolExecutor(max_workers=64) as ex:
        for result in as_completed(ex.submit(check, ip) for ip in ips):
            val = result.result()
            if val:
                found.append(val)
    return sorted(found)


class ScannerThread(QThread):
    console_found = pyqtSignal(object)  # emite ConsoleInfo
    scan_finished = pyqtSignal()

    def run(self):
        subnet = get_local_subnet()
        ips = scan_for_ftp(subnet)
        for ip in ips:
            console = detect_console(ip)
            if console:
                self.console_found.emit(console)
        self.scan_finished.emit()
