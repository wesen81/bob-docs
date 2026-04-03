# bob-docs

A lightweight documentation viewer for browsing and rendering markdown, JSON, CSV, and Mermaid diagram files. Run it in any project to instantly browse your docs in the browser with live-reload.

## Features

- Markdown rendering with syntax highlighting and embedded Mermaid diagrams
- JSON viewer with formatted and raw views
- CSV viewer with table display
- Mermaid diagram rendering (`.mmd` files — sequence, class, flowchart)
- Full-text search across all documentation
- Live-reload when files change
- Responsive design (mobile, tablet, desktop)

## Quick Start

```bash
npx bob-docs init    # creates .bob-docs.json config
npx bob-docs         # starts the server
```

Open http://localhost:3000 in your browser.

## Installation

```bash
# as a dev dependency
npm install --save-dev bob-docs

# or globally
npm install -g bob-docs
```

Add to your `package.json` scripts:

```json
{
  "scripts": {
    "docs": "bob-docs"
  }
}
```

## Configuration

Create a `.bob-docs.json` in your project root (or run `bob-docs init`):

```json
{
  "docsPath": "./docs",
  "port": 3000,
  "host": "0.0.0.0"
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `docsPath` | string | `./docs` | Path to documentation folder (relative or absolute) |
| `port` | number | `3000` | Server port (1–65535) |
| `host` | string | `0.0.0.0` | Host to bind to (`localhost` for local-only, `0.0.0.0` for network access) |

CLI arguments override config file settings:

```bash
bob-docs --docs-path ./documentation --port 8080 --host localhost
```

## Supported File Types

| Extension | Rendering |
|-----------|-----------|
| `.md` | GitHub-flavored markdown with syntax highlighting |
| `.json` | Formatted + raw view |
| `.csv` | Table + raw view |
| `.mmd` | Mermaid diagram (sequence, class, flowchart) |
| `.txt` | Raw text |

## Development

```bash
git clone https://github.com/wesen81/bob-docs.git
cd bob-docs
bun install
bun run dev
```

## License

MIT
