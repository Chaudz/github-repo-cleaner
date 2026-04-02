# GitHub Repo Bulk Deleter

A command-line and web-based tool to **permanently delete multiple GitHub repositories in bulk** using the GitHub REST API. Supports both a rich terminal CLI and a local web UI with real-time progress tracking.

> ⚠️ **Destructive operation.** Deleted repositories cannot be recovered. Always double-check your list before proceeding.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Authentication](#authentication)
- [Usage](#usage)
  - [Web UI (Recommended)](#web-ui-recommended)
  - [CLI — From File](#cli--from-file)
  - [CLI — Inline URLs](#cli--inline-urls)
  - [CLI — Pipe via stdin](#cli--pipe-via-stdin)
  - [Dry Run](#dry-run)
- [CLI Reference](#cli-reference)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)

---

## Features

- 🖥️ **Web UI** — paste token + URLs in browser, see real-time deletion progress
- 🖥️ **CLI** — scriptable, pipe-friendly, color-coded output
- 🔒 **Two-step confirmation** — requires typing `DELETE` before any destructive action
- 🧪 **Dry-run mode** — preview what would be deleted without touching anything
- 📡 **Real-time streaming** — Server-Sent Events show per-repo status as it happens
- ⚠️ **Graceful error handling** — per-repo failure reasons (403, 404, 401) with clear messages
- 🧹 **Smart URL parsing** — handles `https://`, `.git` suffix, trailing slashes

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | ≥ 18.x  |
| npm         | ≥ 9.x   |

---

## Installation

```bash
# Clone the repository
git clone https://github.com/Chaudz/github-delete-repos.git
cd github-delete-repos

# Install dependencies
npm install

# Set up your environment file
cp .env.example .env
```

---

## Authentication

This tool requires a **GitHub Personal Access Token (PAT)** with permission to delete repositories.

### Option A — Fine-grained Token (Recommended)

1. Go to **[GitHub → Settings → Developer settings → Fine-grained tokens](https://github.com/settings/tokens?type=beta)**
2. Click **Generate new token**
3. Set **Repository access** → `All repositories`
4. Under **Permissions → Repository permissions**, find **Administration** → set to `Read and write`
5. Click **Generate token** and copy the value

### Option B — Classic Token

1. Go to **[GitHub → Settings → Tokens (classic)](https://github.com/settings/tokens/new)**
2. Select scope: ✅ `delete_repo`
3. Click **Generate token** and copy the value

### Configure the token

**Via `.env` file** (recommended for repeated use):
```bash
# .env
GITHUB_TOKEN=github_pat_xxxxxxxxxxxx
```

**Via CLI flag** (one-off usage):
```bash
node index.js --token github_pat_xxxxxxxxxxxx --file repos.txt
```

---

## Usage

### Web UI (Recommended)

The web UI is the easiest way to use this tool — no command-line arguments needed.

```bash
npm run ui
```

Then open **http://localhost:3001** in your browser.

**Flow:**
1. Paste your GitHub token
2. Paste repo URLs (one per line)
3. Click **Preview Repos** — verifies your token and parses URLs
4. Review the list, click **Delete All**
5. Type `DELETE` in the confirmation dialog
6. Watch real-time deletion progress per repo

---

### CLI — From File

Create a `repos.txt` file with one GitHub URL per line:

```
# Lines starting with # are comments and will be ignored
https://github.com/your-username/repo-1
https://github.com/your-username/repo-2
https://github.com/your-org/deprecated-project
```

Run:
```bash
node index.js --file repos.txt
```

---

### CLI — Inline URLs

```bash
node index.js --urls https://github.com/user/repo1 https://github.com/user/repo2
```

---

### CLI — Pipe via stdin

```bash
cat repos.txt | node index.js

# Or combine with other tools
grep "old-" repos.txt | node index.js
```

---

### Dry Run

Preview the repos that *would* be deleted — no API calls are made:

```bash
node index.js --file repos.txt --dry-run
```

---

## CLI Reference

| Flag | Short | Description |
|------|-------|-------------|
| `--token <token>` | `-t` | GitHub Personal Access Token |
| `--file <path>` | `-f` | Path to a file containing repo URLs (one per line) |
| `--urls <url...>` | `-u` | One or more repo URLs (space-separated) |
| `--yes` | `-y` | Skip interactive confirmation prompts |
| `--dry-run` | — | Preview repos to delete without actually deleting |
| `--help` | `-h` | Show help message |

---

## Project Structure

```
.
├── index.js          # CLI entry point
├── server.js         # Express server (Web UI backend + SSE API)
├── public/
│   └── index.html    # Web UI frontend (single-page, no build step)
├── repos.txt         # Example file for listing repo URLs
├── .env.example      # Environment variable template
├── .env              # Your local config (gitignored)
├── package.json
└── README.md
```

---

## Troubleshooting

### `403 Permission denied`

Your token does not have the required `delete_repo` (Classic) or `Administration: Write` (Fine-grained) permission. See [Authentication](#authentication) to create a new token with the right scope.

### `404 Not found`

The repository was already deleted, the URL is misspelled, or you don't have access to it. Verify the URL is correct and that your account has admin access to the repo.

### `401 Unauthorized`

Your token is invalid or has expired. Generate a new token and update your `.env` file.

### `EADDRINUSE: address already in use :::3001`

Another process is using port 3001. You can change the port:
```bash
PORT=4000 npm run ui
```

### Token not picked up from `.env`

Make sure the `.env` file is in the **project root** (same directory as `server.js` / `index.js`) and the variable is named exactly `GITHUB_TOKEN`.

---

## Security Notes

- **Never commit your `.env` file.** It is already listed in `.gitignore`.
- Treat your GitHub token like a password — anyone with it can act on your behalf.
- For CI/CD or automation, inject `GITHUB_TOKEN` via environment secrets — never hardcode it.
- Prefer **Fine-grained tokens** over Classic tokens for minimal permission scope.
# github-repo-cleaner
