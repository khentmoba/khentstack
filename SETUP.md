# Restore the stack

## 1. Install Pi and clone

Install Node.js 22.19 or newer, Git, and Pi. This snapshot used Pi 1.4.0:

```sh
npm install -g --ignore-scripts @earendil-works/pi-coding-agent@1.4.0
git clone https://github.com/khentmoba/khentstack.git
cd khentstack
```

The repository is private; cloning requires access to the GitHub account.

## 2. Back up existing configuration

On an existing machine, back up `~/.pi/agent/settings.json`, `models.json`, `mcp.json`, `extensions/`, `~/.agents/skills/`, and any global `AGENTS.md` you plan to merge. Keep backups outside this checkout. Preserve credentials and unrelated skills in your existing user directories.

The following copy commands are for a fresh setup. On an existing setup, merge the relevant files and directories after taking the backup; settings and same-name files can otherwise be replaced.

## 3. Copy skills and extensions

From the repository root, in PowerShell:

```powershell
$agentDir = Join-Path $HOME '.pi/agent'
$skillDir = Join-Path $HOME '.agents/skills'
New-Item -ItemType Directory -Force $agentDir, $skillDir, "$agentDir/extensions" | Out-Null
Copy-Item -Recurse -Force ./skills/* $skillDir
Copy-Item -Recurse -Force ./pi/extensions/* "$agentDir/extensions"
Copy-Item ./pi/settings.json "$agentDir/settings.json"
```

Or in Bash on macOS/Linux:

```sh
mkdir -p ~/.pi/agent/extensions ~/.agents/skills
cp -R skills/. ~/.agents/skills/
cp -R pi/extensions/. ~/.pi/agent/extensions/
cp pi/settings.json ~/.pi/agent/settings.json
```

All skills go into the shared Agent Skills directory, which Pi discovers automatically. The original setup used both shared and Pi-specific skill directories; the provenance file records that layout. If the destination already has the same skills under `~/.pi/agent/skills/`, reconcile those copies to avoid duplicate discovery.

`pi/settings.json` retains exclusions for the standalone Remotion skills and `use-tinyfish`; the Remotion router's bundled references remain available. It also keeps the RPIV question package installed with its extensions disabled, because the local T3 question extension owns `ask_user_question`.

## 4. Configure providers and MCP

Copy `pi/models.example.json` to `~/.pi/agent/models.json` only after reviewing it. Its `apiKey` and header values name environment variables; set those variables in the environment used to launch Pi. Built-in providers can instead use Pi's `/login` flow.

The default selection is `magpie/codex/gpt-6.1-sol`, served by a separate local gateway at `http://127.0.0.1:3425/v1`. To use that selection, install and run your gateway and supply `MAGPIE_API_KEY`. Otherwise change `defaultProvider`, `defaultModel`, `enabledModels`, and any relevant `modelThinkingLevels` in your user settings to match your available providers. Provider catalogs and model access may change over time.

Copy `pi/mcp.example.json` to `~/.pi/agent/mcp.json` after configuring the servers you want:

| Server | Setup required |
| --- | --- |
| TinyFish | Set `TINYFISH_API_KEY` in Pi's launch environment |
| Discord | Install the server at `~/.mcp/mcp-discord/build/index.js` or change the path; set `DISCORD_TOKEN` |
| Cloudflare | Complete OAuth with `pi mcp login cloudflare` |
| Telegram | Install the server at `~/.mcp/telegram-bot-api-mcp/run-mcp.mjs` or change the path; configure that server's own authentication |

Remove unused entries or add `"enabled": false` to them. MCP templates use `${VARIABLE}` interpolation; provider keys in the models template use plain environment-variable names. Pi does not automatically load a repository `.env` file.

These are templates, not bundled server installations. Local Discord and Telegram source code and the Magpie gateway are outside this snapshot.

Merge `pi/global-AGENTS.md` into your global agent instructions if desired. It is a reference copy; simply keeping it in this repository does not activate it globally.

## 5. Load and verify

Start Pi. It installs missing packages declared in settings. In a standalone Pi terminal, use `/reload` after changing resources and check startup diagnostics. Restart a Pi-backed T3 thread to load the local extensions there.

```sh
pi list
pi mcp list
```

`pi list` should show the five packages in `pi/settings.json`. `pi mcp list` should connect every server you enabled; it may open or require a separate sign-in flow. These commands operate on the destination machine and require its network and credentials.

Try a named skill with `/skill:how` in standalone Pi. T3 clients may not forward slash commands; ask for a skill by name there. The question companion works in both Pi and T3. Goal tracking stores state in the current Pi session; subagent delegation requires T3's tools.

Install RTK 0.23.0 or newer on `PATH` to enable `rtk.ts`; it disables itself when RTK is unavailable. The browser package requires its own browser setup. Impeccable's bundled shell/Windows launchers download a verified engine on first use; executable downloads are not stored here.

## Snapshot limits

The local extension documentation describes earlier verification performed in its source projects. Those test suites are not included here. Copying this stack does not install T3 Code, authenticate providers, start a gateway, or verify live external services.

This repository excludes Pi auth and MCP auth stores, secrets, device identifiers, sessions, memories, caches, installed dependencies, logs, and backup files. Keep future credential-bearing overrides outside the checkout.
