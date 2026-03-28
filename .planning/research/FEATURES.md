# Features Research: Database Backup Manager Web App

**Researched:** 2026-03-28
**Confidence:** MEDIUM (stable, well-understood domain)

## Table Stakes (Must Have)

Users expect these — missing any means the product feels incomplete.

| # | Feature | Complexity | Dependencies |
|---|---------|-----------|--------------|
| 1 | Multi-DB connection CRUD (MySQL, MariaDB, PostgreSQL, SQL Server, Oracle, SQLite) | Medium | Auth |
| 2 | Connection test (verify credentials before saving) | Low | Connection management |
| 3 | Encrypted credential storage (AES-256) | Medium | None |
| 4 | Manual backup execution (on-demand) | High | Connection management |
| 5 | Scheduled automatic backup (daily at specified time) | High | Manual backup, Scheduler |
| 6 | Backup history with pass/fail status | Medium | Backup execution |
| 7 | Backup logs with error messages on failure | Medium | Backup execution |
| 8 | Backup file download | Low | Backup storage |
| 9 | Local server storage for backup files | Low | Backup execution |
| 10 | Multi-user authentication (login/logout) | Medium | None |
| 11 | Role-based access control (RBAC) | Medium | Auth |
| 12 | Dashboard (connection status, recent backups, schedule summary) | Medium | All data sources |
| 13 | Backup retention / auto-cleanup by days | Medium | Backup storage |
| 14 | Clear error visibility when backup fails | Low | Backup execution |

## Differentiators (Competitive Advantage)

Features that set this apart from basic backup scripts or CLI tools.

| # | Feature | Complexity | Dependencies |
|---|---------|-----------|--------------|
| 1 | Real-time backup progress via WebSocket | High | Backup execution |
| 2 | Cloud storage upload option (S3/GCS) | Medium | Backup execution |
| 3 | Email notifications (backup success/failure) | Medium | Backup execution |
| 4 | Slack/webhook notifications | Medium | Backup execution |
| 5 | SQL query executor (SELECT + DML) | High | Connection management |
| 6 | Saved queries management (CRUD) | Medium | Query executor |
| 7 | Per-connection schedule configuration | Medium | Scheduler |
| 8 | Backup file size display with compression info | Low | Backup storage |
| 9 | Backup integrity check (SHA-256 hash) | Low | Backup storage |
| 10 | Audit log (who did what, when) | Medium | Auth |
| 11 | Overdue backup detection and alert | Medium | Scheduler |
| 12 | Backup duration tracking | Low | Backup execution |
| 13 | Color-coded connections (visual identification) | Low | Connection management |

## Anti-Features (Do NOT Build)

Features that seem useful but add complexity without proportional value for v1.

| Feature | Why NOT |
|---------|---------|
| Full database restore via UI | Extremely dangerous in web UI — one wrong click loses production data. Restores should be deliberate CLI operations. |
| Schema migration execution | Out of scope — this is a backup tool, not a migration manager |
| Automated restore testing | High complexity, requires sandbox environments |
| In-browser ERD / schema browser | Scope creep — use dedicated tools (DBeaver, pgAdmin) |
| Query notebooks (cells, markdown) | Over-engineering the query executor |
| Public self-registration | Security risk for DB management tool — admin-only user creation |
| Mobile native app | Responsive web is sufficient |
| Real-time DB monitoring (connections, queries, performance) | Different product category entirely |
| Replication management | Enterprise feature, different domain |
| Multi-tenancy | Unnecessary complexity for internal tool |

## Feature Dependencies Graph

```
Auth + RBAC
  └── Connection Management (CRUD + test + encryption)
        ├── Manual Backup + Real-time Progress
        │     ├── Backup History / Logs
        │     │     └── Backup File Download
        │     ├── Backup Retention / Auto-cleanup
        │     ├── Cloud Storage Upload (option)
        │     └── Notifications (email/Slack)
        ├── Scheduled Backup
        │     └── Overdue Detection
        └── SQL Query Executor
              └── Saved Queries
Dashboard (aggregates all data sources)
Audit Log (cross-cutting)
```

## Recommended MVP Build Sequence

1. Auth + RBAC
2. Connection management (CRUD + test + encrypted storage)
3. Manual backup + real-time progress (WebSocket)
4. Backup history / logs + download
5. Retention / auto-cleanup
6. Scheduled backup
7. Dashboard
8. Notifications (email/Slack)
9. SQL query executor + saved queries
10. Cloud storage upload (deferred option)

## Key Insight

This product sits between lightweight dev tools (TablePlus, pgAdmin) and enterprise ops tools (Barman, Veeam). Most tools pick one lane. Combining scheduling/retention/notifications depth with a SQL query executor is the actual differentiator — a single pane of glass for DB backup operations.
