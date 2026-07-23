# Security Policy

## Supported versions

The project is pre-1.0 and moves quickly; only the latest `main` receives
security fixes.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through GitHub's
[private vulnerability reporting](https://github.com/danielinspring/docker-context-switcher/security/advisories/new),
or email **daniel@newnal.com**. Include steps to reproduce, affected version or
commit, and impact if you can. We aim to acknowledge reports within a few days.

## Security model

This app drives the local `docker` CLI on the user's behalf and can open SSH
connections to remote daemons, so a few properties are load-bearing:

- **No shell interpolation.** Every command runs via an argument vector
  (`platform::run_docker`); context names, hosts, and ids are never spliced
  into a shell string. New backend code must preserve this.
- **Destructive actions are confirmed.** Removals and prunes are gated behind a
  dialog that shows the exact command before it runs.
- **Bounded execution.** Each `docker` invocation has a timeout so an
  unreachable SSH endpoint cannot hang the app.

If you find a way to bypass any of these, we'd like to hear about it.
