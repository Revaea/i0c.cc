<img src="./public/img/E617F59CDD7A58032DC2B01D78A97986.webp" alt="i0c.cc" width="720">

## Project Overview

i0c.cc WebUI is a management panel based on Next.js 16, designed for online editing of `redirects.json` after logging in via GitHub OAuth. When saving changes, it calls the GitHub Contents API to create commits on the specified branch of the target repository, preserving the history.

**Better together: Use this with [i0c.cc](https://github.com/Revaea/i0c.cc) for the ultimate serverless redirection management.**

This project provides two editing modes:

- Visual rule editing (group tree + form)
- JSON editing (right panel, directly edit raw JSON)

## Quick Start

1. Copy the example environment variables:

   - macOS/Linux:
     ```bash
     cp .env.example .env.local
     ```
   - Windows PowerShell:
     ```powershell
     Copy-Item .env.example .env.local
     ```

2. Create an OAuth App on GitHub, set the callback URL to `http(s)://<localhost:3000 or your domain>/api/auth/callback/github`, and write the `Client ID` and `Client Secret` into `.env.local` as `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. If deploying on ▲ Vercel, configure these as environment variables.



3. By default, `redirects.json` is loaded from the `data` branch of `Revaea/i0c.cc`, and the QR code domain defaults to `https://i0c.cc`. You may modify the following variables as needed:

  ```dotenv
  GITHUB_REPO_OWNER="Revaea"
  GITHUB_REPO_NAME="i0c.cc"
  GITHUB_TARGET_BRANCH="data"
  GITHUB_CONFIG_PATH="redirects.json"

  NEXT_PUBLIC_DOMAIN="https://your-domain.com"
  ```

1. Generate `NEXTAUTH_SECRET` and write it into `.env.local`. For production, set `NEXTAUTH_URL` to `https://your-domain`; for development, set it to `http://localhost:3000`.

   - Using OpenSSL:
     ```bash
     openssl rand -base64 32
     ```
   - Or using Node.js:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     ```

2. From the repository root, install dependencies and start the development server:

   ```bash
   pnpm install
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) or **your domain**, log in with a GitHub account that has write access to the repository, and start editing `redirects.json`.

## Features Overview

- GitHub OAuth login, automatically retrieves access tokens and stores them in the session.
- Visual editing of `redirects.json`: group tree management + rule form editing.
- JSON editor: line numbers, current line highlighting, JSON syntax validation (error prompts for formatting issues).
- Form behavior aligned with the schema (specification source: [https://raw.githubusercontent.com/Revaea/i0c.cc/main/apps/runtime/redirects.schema.json](https://raw.githubusercontent.com/Revaea/i0c.cc/main/apps/runtime/redirects.schema.json)).
- Supports undo/redo for quick editing rollback.
- Calls the GitHub Contents API to create commits with commit messages when saving.
- Displays recent commit history with links to view details on GitHub.

## Notes

- The OAuth app requires `repo` permissions to write to private repositories.
- If the target repository is private, ensure the logged-in account has the appropriate write permissions.
- For production deployment, make sure to configure the credentials in `.env.local` into the environment variable management of the respective platform.

For the Chinese version, see [README.zh-CN.md](README.zh-CN.md).
