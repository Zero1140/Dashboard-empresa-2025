import sys
import pytest

# Add parent directory to path so tests can import from gameloader
sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))


@pytest.fixture(scope="session", autouse=True)
def qapp():
    from PyQt6.QtWidgets import QApplication
    app = QApplication.instance()
    if app is None:
        app = QApplication(sys.argv[:1])
    yield app
