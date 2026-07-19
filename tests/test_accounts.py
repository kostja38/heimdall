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
