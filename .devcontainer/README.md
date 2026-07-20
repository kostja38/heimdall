# Devcontainer — Heimdall

Reproducible backend development environment (Python 3.14), aligned with CI and
with JetBrains/PyCharm via Gateway.

## Quick start

### First time only (once per machine)

1. Install & start **Docker Desktop**.
2. Docker Desktop → Settings → Resources → **File Sharing** → add `~/.claude`.
3. In PyCharm: **JetBrains Gateway** (or *Remote Development → Dev Containers*) →
   *New Dev Container → From Local Project* → pick
   `.devcontainer/devcontainer.json`. First build takes a few minutes.
4. Once the container is open, in the PyCharm **terminal** run `claude` and log
   in once. The named volume remembers it from now on.

### Every work session (the routine)

1. **Start Docker Desktop** (if not already running — check the whale icon in
   the menu bar).
2. In PyCharm, **open Heimdall in the container**: Gateway → your existing
   Heimdall dev container → connect. (Reuses the built container; fast.)
3. Confirm you're inside: the PyCharm terminal prompt shows the container, and
   `python --version` reports 3.14. Interpreter should be
   `/usr/local/bin/python`.
4. **Start Claude in the sandbox:**
   ```bash
   claude --dangerously-skip-permissions
   ```
5. Work. When done, just close the connection — nothing to tear down.

> Everything below is reference detail. For day-to-day use, the two lists above
> are all you need.

## What's included

| Aspect        | Value / decision |
|---------------|------------------|
| Base image    | `mcr.microsoft.com/devcontainers/python:3.14-bookworm` (= CI Python) |
| Toolchain     | Python. `ruff`, `pytest`, `httpx` via `pip install -e ".[dev]"` |
| Setup step    | `postCreateCommand` installs runtime + dev deps automatically |
| Claude CLI    | Installed in-container via `claude-code` feature (+ Node runtime) |
| Claude login  | Named volume `heimdall-claude-config` → `~/.claude` (persists across rebuilds) |
| Claude logs   | Host `~/.claude/projects` mounted **read-only** → `/host-claude-logs` |
| Log path      | `HEIMDALL_CLAUDE_LOGS=/host-claude-logs` (no code change) |
| Port          | `8000` (Uvicorn) — forwarded, **no** auto-start |
| IDE           | JetBrains block (`PyCharm` + Ruff plugin) |
| Not included  | Frontend toolchain, Dockerfile, docker-compose, keyring backend |

Only new file: `.devcontainer/devcontainer.json`.

> Node is present only because the Claude CLI needs it — it is **not** the
> frontend toolchain. React/Vite tooling still comes later when `frontend/`
> starts.

## Prerequisites

1. **Docker Desktop is running.**
2. **File sharing for `~/.claude`** is enabled in Docker Desktop
   (Settings → Resources → File Sharing). Without it the log mount fails.
3. `~/.claude/projects` exists on the host (given here — it's Heimdall's data
   source). If the path is missing, the container won't start.

## Opening in PyCharm

1. Launch **JetBrains Gateway** (or, in newer PyCharm: *Remote Development →
   Dev Containers*).
2. **New Dev Container → From Local Project** and select
   `.devcontainer/devcontainer.json`.
3. First start takes longer — Gateway downloads the backend IDE into the
   container once. Fast afterwards.
4. If PyCharm reports "no interpreter": pick **`/usr/local/bin/python`**
   (the container's system Python — there is intentionally no `.venv`).

## Working inside the container

```bash
# Tests (same as CI)
python -m pytest -q

# Lint + format check (same as CI)
ruff check .
ruff format --check .

# Start the server (then http://localhost:8000)
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

> `--host 0.0.0.0` matters so the forwarded port is reachable from the host.
> The SQLite DB lives inside the container at `~/.heimdall/heimdall.db` and is
> separate from the host.

## Running Claude inside the container (the sandbox workflow)

The whole point of the container as a sandbox: Claude can only reach what is
mounted into it (your project, plus the read-only logs), never the rest of your
Mac. That makes it safe to skip the permission prompts.

1. Open the container in PyCharm via Gateway (see above).
2. Open a **terminal inside the container** (PyCharm's Terminal tab is already
   the container shell once you're connected — no `docker exec` needed).
3. First time only — log in; the named volume then remembers it:
   ```bash
   claude            # follow the login prompt once
   ```
4. From then on, run it without the permission nagging:
   ```bash
   claude --dangerously-skip-permissions
   ```

Why this is fine here but not on your Mac: outside a container that flag lets
Claude touch your real files. Inside, the blast radius is the container — a bad
command hits the disposable copy, not your machine.

**Two honest caveats:**

- *"Safe" means the host filesystem.* The container still has network access,
  and in skip-permissions mode in-container Claude can **read** everything
  mounted — including your host `~/.claude/projects` logs (read-only). If that
  bothers you, drop that mount while doing sandbox work.
- *In-container Claude logs go to the volume,* i.e. `~/.claude/projects` **inside
  the container**, not the host. So sessions you run inside the sandbox won't
  show up in Heimdall's analysis (which reads the host logs). Different scopes,
  by design.

## Deliberate limits / notes

- **Keyring is left open.** The Linux container has no macOS Keychain and no
  Secret Service. Keyring-dependent paths only work with a later solution
  (`keyrings.alt` as a file backend **or** D-Bus/gnome-keyring). Until then the
  container runs without a secret store.
- **`.idea/` churn.** `.idea/` is checked in. The Gateway backend IDE may touch
  those files (e.g. the interpreter path) and produce git changes. Purely a
  comfort issue — reset affected files individually if needed.
- **Read-only mount.** The container can only read your real logs. Heimdall only
  writes to the (container-local) SQLite DB anyway, never back to the logs.
- **Node is CLI-only.** Node is installed solely as the Claude CLI's runtime.
  Frontend tooling (React + Vite) still comes later when `frontend/` starts —
  at that point this same Node feature already covers it.
