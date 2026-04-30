import socket
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread

from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtWidgets import (
    QDialog, QLabel, QPushButton, QVBoxLayout, QHBoxLayout,
)

from detector import verify_hen
from webman import WebManClient


def _get_local_ip() -> str:
    """Best-effort local IP on the LAN (the address the PS3 would reach us at)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


_HEN_PORT = 8080
_REDIRECT_URL = "https://ps3xploit.me/hen/ps3hen.html"


class _RedirectHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(302)
        self.send_header("Location", _REDIRECT_URL)
        self.end_headers()

    def log_message(self, *args):
        pass  # silence server logs


class HenServerThread(Thread):
    """Lightweight HTTP server that redirects the PS3 browser to the HEN exploit page."""

    def __init__(self):
        super().__init__(daemon=True)
        self._server: HTTPServer | None = None

    def run(self):
        try:
            self._server = HTTPServer(("0.0.0.0", _HEN_PORT), _RedirectHandler)
            self._server.serve_forever()
        except Exception:
            pass

    def stop(self):
        if self._server:
            self._server.shutdown()


class HenGuideDialog(QDialog):
    """
    Step-by-step dialog to guide the user through HEN activation.
    Phase 1: instructions + start local server.
    Phase 2: polling loop until HEN is detected.
    """

    def __init__(self, console_ip: str, webman_available: bool, parent=None):
        super().__init__(parent)
        self._console_ip = console_ip
        self._webman = webman_available
        self._server: HenServerThread | None = None
        self._poll_timer = QTimer(self)
        self._poll_timer.setInterval(5000)
        self._poll_timer.timeout.connect(self._poll_hen)

        self.setWindowTitle("Activar HEN en la PS3")
        self.setMinimumWidth(520)
        self.setMinimumHeight(340)
        self.setModal(True)

        layout = QVBoxLayout(self)
        layout.setSpacing(10)
        layout.setContentsMargins(18, 16, 18, 16)

        # ---- Instructions ----
        local_ip = _get_local_ip()
        url = f"http://{local_ip}:{_HEN_PORT}"

        self._lbl_title = QLabel("HEN no está activo en la PS3")
        self._lbl_title.setStyleSheet(
            "color: #e05050; font-size: 14px; font-weight: bold;"
        )
        layout.addWidget(self._lbl_title)

        steps_text = (
            "<ol style='margin:0; padding-left:18px; line-height:1.8'>"
            "<li>Hacé clic en <b>Iniciar servidor</b> (abajo).</li>"
            f"<li>En la PS3, abrí el <b>Explorador de Internet</b>.</li>"
            f"<li>Navegá a: <b style='color:#8080ff'>{url}</b></li>"
            "<li>Seguí las instrucciones en pantalla hasta que aparezca <b>HEN installed</b>.</li>"
            "<li>Si no tenés internet en la PS3, tipea directamente:<br>"
            f"<b style='color:#8080ff'>{_REDIRECT_URL}</b></li>"
            "</ol>"
        )
        self._lbl_steps = QLabel(steps_text)
        self._lbl_steps.setTextFormat(Qt.TextFormat.RichText)
        self._lbl_steps.setWordWrap(True)
        self._lbl_steps.setStyleSheet(
            "color: #9090b0; font-size: 12px; padding: 10px;"
            "background: #121228; border-radius: 6px;"
        )
        layout.addWidget(self._lbl_steps)

        # ---- Status label ----
        self._lbl_status = QLabel("Esperando que inicies el servidor...")
        self._lbl_status.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._lbl_status.setStyleSheet("color: #505080; font-size: 12px; padding: 4px;")
        layout.addWidget(self._lbl_status)

        # ---- Buttons ----
        btn_row = QHBoxLayout()

        self._btn_server = QPushButton("Iniciar servidor")
        self._btn_server.clicked.connect(self._start_server)
        btn_row.addWidget(self._btn_server)

        btn_row.addStretch()

        self._btn_continue = QPushButton("Continuar")
        self._btn_continue.setEnabled(False)
        self._btn_continue.clicked.connect(self.accept)
        btn_row.addWidget(self._btn_continue)

        btn_cancel = QPushButton("Cancelar")
        btn_cancel.clicked.connect(self.reject)
        btn_row.addWidget(btn_cancel)

        layout.addLayout(btn_row)

    def _start_server(self):
        self._btn_server.setEnabled(False)
        self._btn_server.setText("Servidor activo")
        self._server = HenServerThread()
        self._server.start()
        self._lbl_status.setText("Servidor activo. Esperando que actives HEN en la PS3...")
        self._lbl_status.setStyleSheet("color: #d0a030; font-size: 12px; padding: 4px;")
        self._poll_timer.start()

    def _poll_hen(self):
        if self._check_hen():
            self._poll_timer.stop()
            self._lbl_title.setText("✓ HEN activo")
            self._lbl_title.setStyleSheet(
                "color: #28d860; font-size: 14px; font-weight: bold;"
            )
            self._lbl_status.setText("HEN detectado. Podés continuar con la carga.")
            self._lbl_status.setStyleSheet(
                "color: #28d860; font-size: 12px; padding: 4px;"
            )
            self._btn_continue.setEnabled(True)
            self._btn_continue.setDefault(True)

    def _check_hen(self) -> bool:
        if self._webman:
            return WebManClient(self._console_ip).is_hen_active()
        return verify_hen(self._console_ip)

    def closeEvent(self, event):
        self._poll_timer.stop()
        if self._server:
            self._server.stop()
        super().closeEvent(event)

    def reject(self):
        self._poll_timer.stop()
        if self._server:
            self._server.stop()
        super().reject()
