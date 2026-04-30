from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QDialog, QHBoxLayout, QLabel, QPushButton, QVBoxLayout,
)

_STEPS = [
    (
        "Paso 1 — Entrar a mmOS / fileManager",
        "En el menú de la PS3, abrí MultiMAN o webMAN y seleccioná\n"
        "la opción 'fileManager' o 'mmOS'.\n\n"
        "Aparecerá una pantalla que muestra las carpetas de la consola.",
    ),
    (
        "Paso 2 — Navegar hasta la carpeta packages",
        "En la pantalla de fileManager:\n\n"
        "  1. Hacé doble clic en 'ps3root'\n"
        "  2. Doble clic en 'dev_hdd0'\n"
        "  3. Doble clic en la carpeta 'packages'\n\n"
        "Ahí van a aparecer los archivos .pkg que acabamos de cargar.",
    ),
    (
        "Paso 3 — Abrir el primer PKG",
        "Dentro de la carpeta packages, hacé doble clic en el\n"
        "primer archivo .pkg de la lista.\n\n"
        "Aparecerá el mensaje:\n\n"
        "  'Do you want to exit to XMB to install select package\n"
        "   from [install package files] menu?'\n\n"
        "Seleccioná  SÍ / YES.",
    ),
    (
        "Paso 4 — Instalar desde el XMB",
        "La PS3 vuelve al menú XMB automáticamente.\n\n"
        "Buscá y seleccioná:\n"
        "  'Administrador de archivos PKG'\n"
        "  → 'Instalar archivos PKG'\n"
        "  → 'Directorio estándar'\n\n"
        "Aparecen los juegos disponibles. Presioná el juego\n"
        "y comenzará la instalación.\n\n"
        "Repetí los pasos 3 y 4 para cada archivo PKG cargado.",
    ),
]


class PkgGuideDialog(QDialog):
    """Guía paso a paso para instalar archivos PKG en la PS3."""

    def __init__(self, pkg_names: list[str], parent=None):
        super().__init__(parent)
        self.setWindowTitle("Guía de instalación PKG")
        self.setMinimumWidth(540)
        self.setMinimumHeight(380)
        self.setModal(True)
        self._step = 0

        layout = QVBoxLayout(self)
        layout.setSpacing(10)
        layout.setContentsMargins(16, 14, 16, 14)

        if pkg_names:
            pkgs_text = "\n".join(f"  • {n}" for n in pkg_names[:8])
            if len(pkg_names) > 8:
                pkgs_text += f"\n  … y {len(pkg_names) - 8} más"
        else:
            pkgs_text = "  (archivos PKG cargados)"
        lbl_intro = QLabel(
            f"Los archivos PKG fueron copiados a la PS3.\n"
            f"Seguí estos pasos para instalarlos:\n\n{pkgs_text}"
        )
        lbl_intro.setWordWrap(True)
        lbl_intro.setStyleSheet(
            "color: #9090c0; padding: 8px; background: #121228; border-radius: 6px;"
        )
        layout.addWidget(lbl_intro)

        self._lbl_title = QLabel()
        self._lbl_title.setStyleSheet(
            "color: #c0c0ff; font-size: 14px; font-weight: bold; padding: 6px 0 2px 0;"
        )
        layout.addWidget(self._lbl_title)

        self._lbl_body = QLabel()
        self._lbl_body.setWordWrap(True)
        self._lbl_body.setAlignment(Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignLeft)
        self._lbl_body.setStyleSheet(
            "color: #a0a0cc; font-size: 13px; padding: 12px; "
            "background: #1a1a32; border-radius: 6px;"
        )
        self._lbl_body.setMinimumHeight(140)
        layout.addWidget(self._lbl_body, stretch=1)

        self._lbl_indicator = QLabel()
        self._lbl_indicator.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._lbl_indicator.setStyleSheet("color: #404070; font-size: 11px;")
        layout.addWidget(self._lbl_indicator)

        btn_row = QHBoxLayout()
        self._btn_prev = QPushButton("← Anterior")
        self._btn_prev.clicked.connect(self._prev)
        btn_row.addWidget(self._btn_prev)
        btn_row.addStretch()
        self._btn_next = QPushButton("Siguiente →")
        self._btn_next.setDefault(True)
        self._btn_next.clicked.connect(self._next)
        btn_row.addWidget(self._btn_next)
        self._btn_done = QPushButton("Listo")
        self._btn_done.clicked.connect(self.accept)
        btn_row.addWidget(self._btn_done)
        layout.addLayout(btn_row)

        self._refresh()

    def _refresh(self):
        title, body = _STEPS[self._step]
        self._lbl_title.setText(title)
        self._lbl_body.setText(body)
        self._lbl_indicator.setText(f"Paso {self._step + 1} de {len(_STEPS)}")
        self._btn_prev.setEnabled(self._step > 0)
        is_last = self._step == len(_STEPS) - 1
        self._btn_next.setEnabled(not is_last)
        self._btn_done.setEnabled(is_last)

    def _prev(self):
        if self._step > 0:
            self._step -= 1
            self._refresh()

    def _next(self):
        if self._step < len(_STEPS) - 1:
            self._step += 1
            self._refresh()
