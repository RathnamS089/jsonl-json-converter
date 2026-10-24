# JSONL ⇄ JSON Converter

A Chrome extension for converting and inspecting **JSONL (JSON Lines / NDJSON)** files: JSONL → JSON, JSON → JSONL, a table view, and CSV export. Everything runs locally in your browser, with no uploads, analytics, or tracking.

Useful for LLM fine-tuning and eval datasets, AI agent session logs, application logs, and database exports.

## What's new in v2.0

- **Side panel UI.** Clicking the toolbar icon opens the converter in Chrome's side panel, which stays open while you pick or drag in a file. An **Open in tab** button gives you a full-width view.
- **Paste input.** Use the Paste tab, or press ⌘/Ctrl+V anywhere in the extension.
- **Both directions.** JSONL → JSON array and JSON array → JSONL. **Auto** mode picks the direction from the file.
- **Errors per line.** Invalid lines are listed with their line number, error, and a preview, then skipped. Turn off "Skip invalid lines" if any bad line should stop the conversion.
- **Large files.** Parsing runs in a Web Worker and only visible rows are rendered, so 100 MB+ files stay responsive.
- **Table view.** Each record is a row and each top-level key a column. Nested values are shown as JSON.
- **CSV export.** Opens correctly in Excel and Google Sheets, and cells that look like formulas are escaped.
- **Output options.** 2-space, 4-space, or minified JSON.
- **Light and dark theme.** Follows your system setting.

## Install

**From the Chrome Web Store:** search for "JSONL to JSON Converter".

**From source:**

1. Clone this repository:

   ```bash
   git clone https://github.com/RathnamS089/jsonl-json-converter.git
   ```

2. Open `chrome://extensions` in Google Chrome (version 116 or newer).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and choose the repository folder.
5. Click the extension's toolbar icon to open the side panel.

## Example

### Input JSONL

```jsonl
{"id":1,"name":"Alice"}
{"id":2,"name":"Bob"}
```

### Output JSON

```json
[
  {
    "id": 1,
    "name": "Alice"
  },
  {
    "id": 2,
    "name": "Bob"
  }
]
```

## Project structure

| File | Purpose |
| --- | --- |
| `manifest.json` | MV3 manifest (permissions: `sidePanel`, `clipboardWrite`) |
| `background.js` | Opens the side panel when the toolbar icon is clicked |
| `app.html`, `app.css`, `app.js` | The converter UI and the virtualized text and table views |
| `worker.js` | Parsing, conversion, and CSV export, run off the main thread |

## Packaging for the Chrome Web Store

```bash
zip jsonl-json-converter.zip manifest.json background.js app.html app.css app.js worker.js icon16.png icon32.png icon48.png icon128.png
```

`privacy-practices.md` and `store-listing.md` contain the text for the Developer Dashboard. They are not part of the package.

## Chrome Web Store performance

The v1 release reached **86+ installs** and **91 page views**.

## Roadmap

- Search and filter across records
- Collapsible tree view
- Chat transcript view for LLM conversation logs (`role` / `content` records)
- Firefox version of v2

## Contributing

Suggestions, bug reports, and pull requests are welcome. Please open an issue to discuss significant changes before submitting a pull request.

## License

No license has been specified yet.
