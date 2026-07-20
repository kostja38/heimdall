from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_list_accounts_returns_empty_list_when_none_exist(tmp_path, monkeypatch):
    monkeypatch.setenv("HEIMDALL_DB", str(tmp_path / "heimdall.db"))

    response = client.get("/api/accounts")

    assert response.status_code == 200
    assert response.json() == []


def test_create_account_returns_201_and_never_echoes_the_key(tmp_path, monkeypatch):
    monkeypatch.setenv("HEIMDALL_DB", str(tmp_path / "heimdall.db"))

    response = client.post(
        "/api/accounts", json={"name": "client-a", "api_key": "sk-ant-admin-x"}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "client-a"
    assert "id" in body
    assert "created_at" in body
    assert "api_key" not in body


def test_create_account_rejects_duplicate_name(tmp_path, monkeypatch):
    monkeypatch.setenv("HEIMDALL_DB", str(tmp_path / "heimdall.db"))
    client.post("/api/accounts", json={"name": "client-a", "api_key": "key-1"})

    response = client.post(
        "/api/accounts", json={"name": "client-a", "api_key": "key-2"}
    )

    assert response.status_code == 409


def test_create_account_rejects_empty_name(tmp_path, monkeypatch):
    monkeypatch.setenv("HEIMDALL_DB", str(tmp_path / "heimdall.db"))

    response = client.post("/api/accounts", json={"name": "  ", "api_key": "key-1"})

    assert response.status_code == 422


def test_create_account_rejects_empty_api_key(tmp_path, monkeypatch):
    monkeypatch.setenv("HEIMDALL_DB", str(tmp_path / "heimdall.db"))

    response = client.post("/api/accounts", json={"name": "client-a", "api_key": " "})

    assert response.status_code == 422


def test_list_accounts_never_includes_api_key(tmp_path, monkeypatch):
    monkeypatch.setenv("HEIMDALL_DB", str(tmp_path / "heimdall.db"))
    client.post("/api/accounts", json={"name": "client-a", "api_key": "sk-ant-x"})

    response = client.get("/api/accounts")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert "api_key" not in body[0]


def test_delete_account_returns_204(tmp_path, monkeypatch):
    monkeypatch.setenv("HEIMDALL_DB", str(tmp_path / "heimdall.db"))
    client.post("/api/accounts", json={"name": "client-a", "api_key": "sk-ant-x"})

    response = client.delete("/api/accounts/client-a")

    assert response.status_code == 204
    assert client.get("/api/accounts").json() == []


def test_delete_account_returns_404_when_missing(tmp_path, monkeypatch):
    monkeypatch.setenv("HEIMDALL_DB", str(tmp_path / "heimdall.db"))

    response = client.delete("/api/accounts/does-not-exist")

    assert response.status_code == 404
