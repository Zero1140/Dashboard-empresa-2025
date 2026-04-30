import urllib.parse

import requests
from PyQt6.QtCore import QThread, pyqtSignal


class WebManClient:
    """HTTP client for webMAN MOD's built-in web server (port 80)."""

    TIMEOUT = 3.0

    def __init__(self, ip: str, timeout: float = TIMEOUT):
        self._base = f"http://{ip}"
        self._timeout = timeout

    def is_available(self) -> bool:
        try:
            r = requests.get(self._base + "/", timeout=self._timeout)
            return r.status_code < 500
        except requests.RequestException:
            return False

    def get_fw_type(self) -> str | None:
        """Returns 'HEN', 'CFW', or None on failure."""
        try:
            r = requests.get(
                f"{self._base}/ps3mapi.ps3?PS3+GETFWTYPE",
                timeout=self._timeout,
            )
            text = r.text.strip().upper()
            if "HEN" in text:
                return "HEN"
            if "CFW" in text:
                return "CFW"
            return None
        except requests.RequestException:
            return None

    def is_hen_active(self) -> bool:
        return self.get_fw_type() == "HEN"

    def refresh_xmb(self) -> bool:
        try:
            r = requests.get(f"{self._base}/refresh.ps3", timeout=self._timeout)
            return r.status_code < 400
        except requests.RequestException:
            return False

    def notify(self, msg: str) -> bool:
        try:
            encoded = urllib.parse.quote(msg)
            r = requests.get(f"{self._base}/notify.ps3?{encoded}", timeout=self._timeout)
            return r.status_code < 400
        except requests.RequestException:
            return False

    def install_pkgs(self, pkg_names: list[str] | None = None) -> bool:
        """
        Triggers PKG installation on the PS3 via webMAN.
        If pkg_names is given, installs each one individually from /dev_hdd0/packages/.
        Otherwise installs everything in /dev_hdd0/packages/ at once.
        Uses a longer timeout since the PS3 may take time to start the install.
        """
        try:
            if pkg_names:
                ok = True
                for name in pkg_names:
                    path = urllib.parse.quote(f"/dev_hdd0/packages/{name}")
                    r = requests.get(f"{self._base}/install.ps3{path}", timeout=30.0)
                    if r.status_code >= 400:
                        ok = False
                return ok
            else:
                r = requests.get(
                    f"{self._base}/install.ps3/dev_hdd0/packages/",
                    timeout=30.0,
                )
                return r.status_code < 400
        except requests.RequestException:
            return False


class PkgInstallWorker(QThread):
    """Calls webMAN install_pkgs in a background thread, then refresh + notify."""

    finished_ok = pyqtSignal(int)   # success count
    finished_err = pyqtSignal(str)  # error message

    def __init__(self, ip: str, pkg_names: list[str]):
        super().__init__()
        self._ip = ip
        self._pkg_names = pkg_names

    def run(self):
        client = WebManClient(self._ip)
        ok = client.install_pkgs(self._pkg_names)
        if ok:
            client.refresh_xmb()
            client.notify(f"{len(self._pkg_names)} PKG(s) instalado(s) en PS3")
            self.finished_ok.emit(len(self._pkg_names))
        else:
            self.finished_err.emit("No se pudo iniciar la instalación de PKGs en la PS3.")


class WebManPostWorker(QThread):
    """Calls refresh_xmb + notify on PS3 after a successful transfer queue."""

    done = pyqtSignal()

    def __init__(self, ip: str, success_count: int):
        super().__init__()
        self._ip = ip
        self._count = success_count

    def run(self):
        client = WebManClient(self._ip)
        client.refresh_xmb()
        client.notify(f"{self._count} juego(s) cargado(s) correctamente")
        self.done.emit()
