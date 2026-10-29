<img src="assets/icon.svg" width="64" height="64" alt="">

# khentstack

My personal [Pi](https://pi.dev) coding stack: the skills I use, local extensions, package choices, and configuration for working in Pi and T3 Code.

This is a portable snapshot of my setup. Credentials, conversations, memory stores, and caches stay on my machine.

## What's here

| Path | Contents |
| --- | --- |
| [`skills/`](skills/) | 37 top-level skills, including their scripts, references, and assets |
| [`pi/settings.json`](pi/settings.json) | Package list, model preferences, thinking levels, terminal settings, and skill exclusions |
| [`pi/extensions/`](pi/extensions/) | RTK command integration and T3 companions for questions, goals, and subagents |
| [`pi/models.example.json`](pi/models.example.json) | Custom provider definitions and model overrides with credential references |
| [`pi/mcp.example.json`](pi/mcp.example.json) | TinyFish, Discord, Cloudflare, and Telegram MCP configuration templates |
| [`pi/global-AGENTS.md`](pi/global-AGENTS.md) | My global agent rules |
| [`docs/versions.json`](docs/versions.json) | Observed Pi and package versions when this snapshot was created |
| [`docs/skill-sources.json`](docs/skill-sources.json) | Original local source of each skill |

The skills cover debugging, codebase exploration, reviews, PR workflows, interface design, performance, releases, Discord, and Remotion video work. The Remotion router also carries nested reference skills.

## Set it up

See [SETUP.md](SETUP.md) for installation, configuration, and verification on another machine. The snapshot records Pi **1.4.0** and requires Node.js **22.19+**. Some workflows also need GitHub CLI, RTK, browser tooling, or T3 Code.

My default model uses a local Magpie gateway at `127.0.0.1:3425`. That gateway and its credentials are separate from this repository. Choose an available provider and model if you don't run the same gateway.

## Keep it current

Edit the repository copies when changing this stack, then copy the affected files into the corresponding user directories. Skill directories are stored as real files here, including skills that were symlinked on the source machine. Setup installs them into `~/.agents/skills/` so Pi's existing exclusions continue to apply.

The package declarations retain the original unpinned sources. `docs/versions.json` records the versions observed locally; it is an inventory, not a dependency lockfile.

Downloaded Impeccable executables are omitted; its bundled launchers fetch the matching engine when needed. Discord and Telegram MCP server implementations are also separate installations.

## Attribution

Bundled skills and tools retain their existing attribution and license notices. This repository does not assign a new license to third-party material. See individual skill files for credits and upstream references.
