# Package Installation Testing

This document describes the testing procedure for verifying bob-docs works correctly when installed as a package.

## Test Setup

### 1. Create Test Project

```bash
mkdir -p /tmp/bob-docs-test
cd /tmp/bob-docs-test
npm init -y
```

### 2. Install bob-docs

Using npm link (for local development):

```bash
# In bob-docs project directory
npm link

# In test project directory
cd /tmp/bob-docs-test
npm link bob-docs
```

Using npm install (for published package):

```bash
npm install bob-docs
```

### 3. Add Docs Script

Edit `package.json` to add the docs script:

```json
{
  "scripts": {
    "docs": "bob-docs"
  }
}
```

## Test Cases

### Test 1: Basic Functionality

1. Create sample documentation:

```bash
mkdir -p docs/guides
```

2. Add markdown files to `docs/` folder
3. Run the server:

```bash
npm run docs
```

4. Verify:
   - Server starts successfully on default port (3000)
   - Console shows correct docs path
   - Manifest is generated

### Test 2: File Serving

Test the following endpoints:

```bash
# Manifest endpoint
curl http://localhost:3000/manifest.json

# Document endpoint
curl http://localhost:3000/docs/README.md

# Web interface
curl http://localhost:3000/
```

Expected results:
- Manifest returns JSON with file structure
- Documents are served correctly
- Web interface returns HTML

### Test 3: Missing Docs Folder

1. Rename or delete the docs folder:

```bash
mv docs docs.backup
```

2. Run the server:

```bash
npm run docs
```

Expected result:
- Clear error message indicating docs folder not found
- Helpful suggestions for resolution
- Error includes expected path and actual project root

### Test 4: Custom Configuration

1. Create `.bob-docs.json`:

```json
{
  "port": 4000,
  "host": "127.0.0.1",
  "docsPath": "./docs"
}
```

2. Run the server:

```bash
npm run docs
```

Expected results:
- Server starts on custom port (4000)
- Server binds to custom host (127.0.0.1)
- Console shows updated configuration

3. Verify accessibility:

```bash
curl http://127.0.0.1:4000/manifest.json
```

## Verification Checklist

- [ ] Server starts without errors
- [ ] Manifest is generated correctly
- [ ] Files are served at `/docs/<path>` endpoint
- [ ] Web interface loads at root path
- [ ] Missing docs folder shows helpful error
- [ ] Custom config file is respected
- [ ] File navigation works
- [ ] Markdown rendering works
- [ ] Search functionality works (client-side)

## Cleanup

```bash
# Stop the server (Ctrl+C)

# Unlink package
cd /tmp/bob-docs-test
npm unlink bob-docs

# Remove test directory
rm -rf /tmp/bob-docs-test
```

## Test Results

All test cases passed successfully:
- ✅ Test project creation
- ✅ Package installation via npm link
- ✅ Sample documentation creation
- ✅ Server startup and basic functionality
- ✅ File serving (manifest and documents)
- ✅ Missing docs folder error handling
- ✅ Custom configuration file support

## Notes

- The search functionality is implemented client-side in the React application
- The server serves static files and a manifest of the docs structure
- Configuration precedence: CLI args > .bob-docs.json > defaults
- The package correctly resolves the host project root when installed
