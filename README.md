# Landie - AI Landing Page Generator

Landie is an AI-powered landing page generator that helps users create professional landing pages through an intuitive onboarding wizard.

## Mobile Viewport Quirks

### iOS Safari 100vh Issue

iOS Safari has a known issue where `100vh` doesn't account for the browser chrome (address bar, toolbar), causing content to be cut off at the bottom of the viewport. This is particularly problematic on mobile devices where the browser UI can dynamically show/hide.

**Symptoms:**
- Page stops ~100-150px short of the real bottom
- Content becomes reachable when Safari's bars collapse
- Affects long landing pages and dashboard tabs

**Solution Implemented:**

We've implemented a robust fix using modern viewport units with fallbacks:

```css
/* CSS Custom Properties with Safe Viewport Heights */
:root {
  --safe-vh: 100vh;           /* Fallback */
  --safe-dvh: 100dvh;         /* Dynamic viewport height */
  --safe-svh: 100svh;         /* Small viewport height */
  --safe-lvh: 100lvh;         /* Large viewport height */
}

/* Utility Classes */
.h-safe { height: var(--safe-vh); }
.min-h-safe { min-height: var(--safe-vh); }
.h-safe-dynamic { height: var(--safe-dvh); }
```

**Usage:**
- Replace `h-screen` with `h-safe`
- Replace `min-h-screen` with `min-h-safe`
- Use `h-safe-dynamic` for hero sections that should adapt to browser chrome

**Browser Support:**
- `100dvh`: iOS 15.4+, Chrome 108+
- `100svh`/`100lvh`: iOS 15.4+, Chrome 108+
- Fallback to `100vh` for older browsers

**Testing:**
Run mobile viewport tests: `npm run test:mobile`

### Debugging Scroll Issues

A red scroll sentinel is added at the bottom of pages in development to help identify scroll issues:

```html
<div id="scroll-sentinel" style="height: 20px; background: red;"></div>
```

The sentinel should be visible when scrolling to the bottom. If it's not visible, there's likely a viewport height issue.

---

- [x] Running Supabase locally
- [x] Managing database migrations
- [x] Creating and deploying Supabase Functions
- [x] Generating types directly from your database schema
- [x] Making authenticated HTTP requests to [Management API](https://supabase.com/docs/reference/api/introduction)

## Getting started

### Install the CLI

Available via [NPM](https://www.npmjs.com) as dev dependency. To install:

```bash
npm i supabase --save-dev
```

To install the beta release channel:

```bash
npm i supabase@beta --save-dev
```

When installing with yarn 4, you need to disable experimental fetch with the following nodejs config.

```
NODE_OPTIONS=--no-experimental-fetch yarn add supabase
```

> **Note**
For Bun versions below v1.0.17, you must add `supabase` as a [trusted dependency](https://bun.sh/guides/install/trusted) before running `bun add -D supabase`.

<details>
  <summary><b>macOS</b></summary>

  Available via [Homebrew](https://brew.sh). To install:

  ```sh
  brew install supabase/tap/supabase
  ```

  To install the beta release channel:
  
  ```sh
  brew install supabase/tap/supabase-beta
  brew link --overwrite supabase-beta
  ```
  
  To upgrade:

  ```sh
  brew upgrade supabase
  ```
</details>

<details>
  <summary><b>Windows</b></summary>

  Available via [Scoop](https://scoop.sh). To install:

  ```powershell
  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
  scoop install supabase
  ```

  To upgrade:

  ```powershell
  scoop update supabase
  ```
</details>

<details>
  <summary><b>Linux</b></summary>

  Available via [Homebrew](https://brew.sh) and Linux packages.

  #### via Homebrew

  To install:

  ```sh
  brew install supabase/tap/supabase
  ```

  To upgrade:

  ```sh
  brew upgrade supabase
  ```

  #### via Linux packages

  Linux packages are provided in [Releases](https://github.com/supabase/cli/releases). To install, download the `.apk`/`.deb`/`.rpm`/`.pkg.tar.zst` file depending on your package manager and run the respective commands.

  ```sh
  sudo apk add --allow-untrusted <...>.apk
  ```

  ```sh
  sudo dpkg -i <...>.deb
  ```

  ```sh
  sudo rpm -i <...>.rpm
  ```

  ```sh
  sudo pacman -U <...>.pkg.tar.zst
  ```
</details>

<details>
  <summary><b>Other Platforms</b></summary>

  You can also install the CLI via [go modules](https://go.dev/ref/mod#go-install) without the help of package managers.

  ```sh
  go install github.com/supabase/cli@latest
  ```

  Add a symlink to the binary in `$PATH` for easier access:

  ```sh
  ln -s "$(go env GOPATH)/cli" /usr/bin/supabase
  ```

  This works on other non-standard Linux distros.
</details>

<details>
  <summary><b>Community Maintained Packages</b></summary>

  Available via [pkgx](https://pkgx.sh/). Package script [here](https://github.com/pkgxdev/pantry/blob/main/projects/supabase.com/cli/package.yml).
  To install in your working directory:

  ```bash
  pkgx install supabase
  ```

  Available via [Nixpkgs](https://nixos.org/). Package script [here](https://github.com/NixOS/nixpkgs/blob/master/pkgs/development/tools/supabase-cli/default.nix).
</details>

### Run the CLI

```bash
supabase bootstrap
```

Or using npx:

```bash
npx supabase bootstrap
```

The bootstrap command will guide you through the process of setting up a Supabase project using one of the [starter](https://github.com/supabase-community/supabase-samples/blob/main/samples.json) templates.

## Docs

Command & config reference can be found [here](https://supabase.com/docs/reference/cli/about).

## Breaking changes

We follow semantic versioning for changes that directly impact CLI commands, flags, and configurations.

However, due to dependencies on other service images, we cannot guarantee that schema migrations, seed.sql, and generated types will always work for the same CLI major version. If you need such guarantees, we encourage you to pin a specific version of CLI in package.json.

## Developing

To run from source:

```sh
# Go >= 1.22
go run . help
```
