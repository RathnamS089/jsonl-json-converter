# JSONL → JSON Converter

A lightweight Chrome extension that converts **JSONL (JSON Lines)** data into formatted JSON, making newline-delimited records easier to inspect, copy, and work with.

This repository contains the **basic v1 version** of the web extension published in the Chrome Web Store.

## Features

- Convert JSONL data into JSON.
- Work with newline-delimited JSON records in a simple browser interface.
- Format converted output for easier reading and debugging.
- Useful for developers working with logs, exports, APIs, and data-processing workflows.

## Version 1

This is the initial/basic version of the extension. It focuses on providing a simple way to convert JSONL input into JSON output directly in the browser.

## Chrome Web Store performance

According to the Chrome Web Store analytics shared for this project, the extension has reached:

- **86+ installs**
- **91 page views**

These figures represent the early adoption of the v1 release.

## Getting started

1. Clone this repository:

   ```bash
   git clone https://github.com/RathnamS089/jsonl-json-converter.git
   ```

2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the repository directory.
6. Open the extension and paste JSONL data to convert it.

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

## Roadmap

Potential improvements for future versions include:

- Better validation and error messages.
- Copy and download buttons for converted output.
- Support for larger JSONL files.
- Additional formatting options.
- Improved user interface and accessibility.

## Contributing

Suggestions, bug reports, and pull requests are welcome. Please open an issue to discuss significant changes before submitting a pull request.

## License

No license has been specified yet.
