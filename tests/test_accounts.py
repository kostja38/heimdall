import pytest

from backend import accounts, db


def _conn(tmp_path):
    return db.connect(tmp_path / "heimdall.db")


def test_create_and_get_api_key_roundtrip(tmp_path):
    conn = _conn(tmp_path)

    account_id = accounts.create_account(conn, "client-a", "sk-ant-admin-test")

    assert isinstance(account_id, int)
    assert accounts.get_api_key("client-a") == "sk-ant-admin-test"
    row = conn.execute("SELECT name FROM accounts").fetchone()
    assert row == ("client-a",)


def test_empty_or_whitespace_name_raises(tmp_path):
    conn = _conn(tmp_path)

    with pytest.raises(ValueError):
        accounts.create_account(conn, "   ", "sk-ant-admin-test")

    count = conn.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
    assert count == 0
    assert accounts.get_api_key("   ") is None


def test_empty_or_whitespace_key_raises(tmp_path):
    conn = _conn(tmp_path)

    with pytest.raises(ValueError):
        accounts.create_account(conn, "client-a", "")

    count = conn.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
    assert count == 0


def test_duplicate_name_raises(tmp_path):
    conn = _conn(tmp_path)
    accounts.create_account(conn, "client-a", "key-1")

    with pytest.raises(accounts.DuplicateAccountError):
        accounts.create_account(conn, "client-a", "key-2")

    count = conn.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
    assert count == 1
    assert accounts.get_api_key("client-a") == "key-1"
