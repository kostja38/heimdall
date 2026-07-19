import keyring
import keyring.backend
import keyring.errors
import pytest


class InMemoryKeyring(keyring.backend.KeyringBackend):
    """Test double so tests never touch the real OS keychain."""

    priority = 1

    def __init__(self):
        super().__init__()
        self._store = {}

    def set_password(self, service, username, password):
        self._store[(service, username)] = password

    def get_password(self, service, username):
        return self._store.get((service, username))

    def delete_password(self, service, username):
        try:
            del self._store[(service, username)]
        except KeyError:
            raise keyring.errors.PasswordDeleteError(username)


@pytest.fixture(autouse=True)
def fake_keyring():
    previous = keyring.get_keyring()
    backend = InMemoryKeyring()
    keyring.set_keyring(backend)
    yield backend
    keyring.set_keyring(previous)
