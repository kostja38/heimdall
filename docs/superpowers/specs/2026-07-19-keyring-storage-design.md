# Encrypted API-Key Storage & Accounts — Design

**Date:** 2026-07-19
**Scope:** Commit 4 — storage layer for optional Anthropic Admin keys.
**Status:** Approved

## Context

Heimdall's hybrid data-source model makes Admin keys optional: the default
path (parsing local Claude Code logs) needs no credentials. Users who want
real billed numbers can register one or more accounts (e.g. different client
orgs), each backed by an Anthropic Admin key. Keys are a trust-critical
asset: they must never be stored in SQLite or appear in logs — they live
exclusively in the OS keychain via the `keyring` library.

This commit delivers the storage layer only. REST endpoints and UI arrive
with their consuming features (usage polling, account management UI).

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Cardinality | Multiple named accounts | Freelancer audience manages several client orgs; account-management UI is on the roadmap |
| Module layout | Single `backend/accounts.py` | The unit is "account with stored credential" — DB row and keychain entry belong together; keyring stays an internal detail |
| Key location | OS keychain, `service="heimdall"`, `username=<account name>` | Encrypted by the OS; DB stores only the account name |
| Key validation | None in the storage layer | Storage stores, it does not police; the Admin API client validates keys against the real API. No format assumptions that could break |
| Scope | Storage layer only | Interfaces are shaped by their consumers (same reasoning that deferred this table in Commit 3) |

## Migration 2: `accounts` (in `backend/db.py`)

```sql
CREATE TABLE accounts (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
```

No key material, no key column. Existing Commit-3 databases (user_version 1)
upgrade in place — the migration mechanism applies migration 2 on connect.

## Module: `backend/accounts.py`

New dependency: `keyring>=25` (runtime).

- `SERVICE_NAME = "heimdall"` — keychain service identifier.
- `class DuplicateAccountError(ValueError)` — account name already exists.
- `class AccountNotFoundError(KeyError)` — account name unknown.
- `create_account(conn, name, api_key) -> int` — validates both strings are
  non-empty after stripping whitespace (`ValueError`; the stripped name is
  what gets stored), INSERTs the row, then `keyring.set_password`,
  then commits. If the keyring write raises, the transaction is rolled back —
  no half-created accounts. Duplicate name raises `DuplicateAccountError`.
  Returns the new row id.
- `get_api_key(name) -> str | None` — `keyring.get_password`; no DB access.
- `delete_account(conn, name) -> None` — deletes the row (unknown name
  raises `AccountNotFoundError`), commits, then removes the keychain entry.
  A missing keychain entry is tolerated (`keyring.errors.PasswordDeleteError`
  is swallowed) so a manually cleaned keychain never blocks deletion.
- `list_accounts(conn) -> list[dict]` — `id`, `name`, `created_at` for all
  accounts, ordered by name. Never returns key material.

## Testing (TDD)

Tests must never touch the real OS keychain: a minimal in-memory
`keyring.backend.KeyringBackend` subclass is installed via
`keyring.set_keyring()` in an autouse fixture and restored afterwards.

- Create + `get_api_key` roundtrip returns the stored key.
- Duplicate name raises `DuplicateAccountError`; DB still has one row.
- Keyring failure during create rolls back the DB row.
- Empty or whitespace-only name or key raises `ValueError`; nothing is stored.
- Delete removes row and keychain entry; `get_api_key` returns `None` after.
- Delete with missing keychain entry still removes the row.
- Delete of unknown name raises `AccountNotFoundError`.
- `list_accounts` returns id/name/created_at and no key material.
- A user_version-1 database (Commit 3 schema) upgrades to version 2 on connect.

## Out of Scope

REST endpoints, account management UI, Admin API client / key validation,
key rotation or renaming, usage polling.
