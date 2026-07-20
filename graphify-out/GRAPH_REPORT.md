# Graph Report - .  (2026-07-20)

## Corpus Check
- Corpus is ~9,333 words - fits in a single context window. You may not need a graph.

## Summary
- 366 nodes · 568 edges · 22 communities (19 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.78)
- Token cost: 78,174 input · 0 output

## Community Hubs (Navigation)
- Frontend Dashboard Components
- Dashboard Page & Usage Hook
- SQLite Migrations & DB Connection
- Devcontainer & CI Pipeline
- Accounts & Keychain Storage
- Claude Log Import
- Biome Frontend Lint/Format Config
- Frontend App TS Config
- Frontend Dev Dependencies
- Frontend Package Manifest
- Frontend Node TS Config
- Usage Aggregation & Cost Summary
- FastAPI Main Endpoints
- Model Pricing Table
- Frontend App Shell & Backend Status
- Test Fixtures & Fake Keyring
- Frontend TS Project References
- Favicon Asset
- Heimdall Root Package

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `connect()` - 17 edges
3. `summarize()` - 16 edges
4. `compilerOptions` - 15 edges
5. `create_account()` - 12 edges
6. `_conn()` - 11 edges
7. `_connect()` - 11 edges
8. `Heimdall Devcontainer Environment` - 11 edges
9. `formatUsd()` - 9 edges
10. `_seed()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `ruff (lint/format, devcontainer toolchain)` --semantically_similar_to--> `Oxlint`  [INFERRED] [semantically similar]
  .devcontainer/README.md → frontend/README.md
- `test_parse_entry_returns_none_without_usage()` --calls--> `parse_entry()`  [EXTRACTED]
  tests/test_claude_logs.py → backend/claude_logs.py
- `test_resolve_log_root_precedence()` --calls--> `resolve_log_root()`  [EXTRACTED]
  tests/test_claude_logs.py → backend/claude_logs.py
- `test_iter_usage_events_with_missing_root_yields_nothing()` --calls--> `iter_usage_events()`  [EXTRACTED]
  tests/test_claude_logs.py → backend/claude_logs.py
- `test_resolve_db_path_defaults_to_home_dotfolder()` --calls--> `resolve_db_path()`  [EXTRACTED]
  tests/test_db.py → backend/db.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI Pipeline Jobs (lint, test, changes, frontend)** — _github_workflows_ci_workflow, _github_workflows_ci_lint_job, _github_workflows_ci_test_job, _github_workflows_ci_changes_job, _github_workflows_ci_frontend_job [EXTRACTED 1.00]

## Communities (22 total, 3 thin omitted)

### Community 0 - "Frontend Dashboard Components"
Cohesion: 0.11
Nodes (24): BreakdownCard(), BreakdownCardProps, sortByCostDesc(), DELTA_ARROW, KpiRow(), KpiRowProps, StatTileProps, current (+16 more)

### Community 1 - "Dashboard Page & Usage Hook"
Cohesion: 0.11
Nodes (24): Dashboard(), PeriodPicker(), PeriodPickerProps, RefreshButton(), RefreshButtonProps, Status, summaryResponse, UsageSummaryState (+16 more)

### Community 2 - "SQLite Migrations & DB Connection"
Cohesion: 0.11
Nodes (27): connect(), _migrate(), Connection, Path, Heimdall storage — SQLite connection and schema migrations., Database schema is newer than this Heimdall version supports., Resolve the DB location: explicit argument > HEIMDALL_DB env var > default., Open the Heimdall database, creating or upgrading schema as needed. (+19 more)

### Community 3 - "Devcontainer & CI Pipeline"
Cohesion: 0.09
Nodes (28): Claude CLI (in-container), heimdall-claude-config named volume, Docker Desktop, Heimdall Devcontainer Environment, HEIMDALL_CLAUDE_LOGS=/host-claude-logs, Keyring left open (Linux container has no macOS Keychain / Secret Service), JetBrains Gateway / PyCharm Dev Containers, pytest (devcontainer toolchain) (+20 more)

### Community 4 - "Accounts & Keychain Storage"
Cohesion: 0.15
Nodes (25): AccountNotFoundError, create_account(), delete_account(), DuplicateAccountError, get_api_key(), list_accounts(), Heimdall accounts — named Admin-key accounts; keys live in the OS keychain., An account with this name already exists. (+17 more)

### Community 5 - "Claude Log Import"
Cohesion: 0.16
Nodes (24): import_usage(), ImportStats, iter_usage_events(), parse_entry(), Path, Heimdall log parser — Claude Code JSONL logs into usage events., Map one JSONL entry to a usage-event dict, or None if not usage., Resolve the log root: explicit argument > env var > default. (+16 more)

### Community 6 - "Biome Frontend Lint/Format Config"
Cohesion: 0.08
Nodes (25): source, assist, actions, enabled, files, includes, formatter, enabled (+17 more)

### Community 7 - "Frontend App TS Config"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 8 - "Frontend Dev Dependencies"
Cohesion: 0.09
Nodes (23): @biomejs/biome, devDependencies, @biomejs/biome, jsdom, @testing-library/jest-dom, @testing-library/react, @types/node, @types/react (+15 more)

### Community 9 - "Frontend Package Manifest"
Cohesion: 0.10
Nodes (19): dependencies, react, react-dom, recharts, name, private, scripts, build (+11 more)

### Community 10 - "Frontend Node TS Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 11 - "Usage Aggregation & Cost Summary"
Cohesion: 0.26
Nodes (17): _empty_bucket(), Connection, Heimdall usage aggregation — groups usage_events into cost-annotated buckets., Aggregate usage_events in [since, until) into buckets with computed cost.      `, summarize(), _connect(), Connection, _seed() (+9 more)

### Community 12 - "FastAPI Main Endpoints"
Cohesion: 0.15
Nodes (12): get_conn(), get_usage_summary(), health(), post_import_logs(), Connection, Heimdall backend — FastAPI application entry point., Request-scoped DB connection, closed after the request., Liveness probe. Returns a static OK payload. (+4 more)

### Community 13 - "Model Pricing Table"
Cohesion: 0.36
Nodes (7): cost_usd(), Model price table (USD per million tokens) and cost computation., Compute USD cost for one usage event. None for unknown models —     callers surf, test_cost_usd_computes_known_model(), test_cost_usd_longest_prefix_match_wins(), test_cost_usd_unknown_model_returns_none(), test_cost_usd_zero_tokens_is_zero()

### Community 14 - "Frontend App Shell & Backend Status"
Cohesion: 0.43
Nodes (4): App(), STATUS_LABEL, BackendStatus, useBackendStatus()

### Community 15 - "Test Fixtures & Fake Keyring"
Cohesion: 0.29
Nodes (3): fake_keyring(), InMemoryKeyring, Test double so tests never touch the real OS keychain.

## Knowledge Gaps
- **103 isolated node(s):** `$schema`, `enabled`, `clientKind`, `useIgnoreFile`, `**` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `connect()` connect `SQLite Migrations & DB Connection` to `Claude Log Import`, `Usage Aggregation & Cost Summary`, `FastAPI Main Endpoints`, `Accounts & Keychain Storage`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `summarize()` connect `Usage Aggregation & Cost Summary` to `Accounts & Keychain Storage`, `FastAPI Main Endpoints`, `Model Pricing Table`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Frontend Dev Dependencies` to `Frontend Package Manifest`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `$schema`, `enabled`, `clientKind` to the rest of the system?**
  _103 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Dashboard Components` be split into smaller, more focused modules?**
  _Cohesion score 0.1064102564102564 - nodes in this community are weakly interconnected._
- **Should `Dashboard Page & Usage Hook` be split into smaller, more focused modules?**
  _Cohesion score 0.10984848484848485 - nodes in this community are weakly interconnected._
- **Should `SQLite Migrations & DB Connection` be split into smaller, more focused modules?**
  _Cohesion score 0.1053763440860215 - nodes in this community are weakly interconnected._