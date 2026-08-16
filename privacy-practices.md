Chrome Web Store Privacy Practices - Fill These In:

=== SINGLE PURPOSE DESCRIPTION ===
This extension converts JSON Lines (JSONL) files to standard JSON array format. Single purpose: local file format conversion without any data transmission.

=== PERMISSION JUSTIFICATIONS ===

clipboardWrite:
"Required for 'Copy to Clipboard' button functionality. Users click a button to copy the converted JSON output to their clipboard. No automatic clipboard access - only triggered by explicit user action."

host_permissions: (NONE - removed <all_urls>)
"This extension does not request any host permissions. All processing happens locally in the extension popup. No network requests, no external API calls, no data transmission."

remote_code: (NONE - no remote code)
"This extension does not load or execute any remote code. All JavaScript is bundled locally in the extension package. No eval(), no dynamic script loading, no external resources."

=== DATA USAGE ===
Data collected: NONE
Data transmitted: NONE
Data stored locally: Only the current file being converted (in memory, cleared on popup close)
User data sold: NO
User data shared: NO
Analytics/tracking: NO

=== REQUIRED URLs (create simple pages or use GitHub) ===
Homepage URL: https://github.com/YOURUSERNAME/jsonl-converter
Support URL: https://github.com/YOURUSERNAME/jsonl-converter/issues
Privacy Policy URL: https://github.com/YOURUSERNAME/jsonl-converter/blob/main/PRIVACY.md

=== CONTACT EMAIL ===
Add your email in Developer Dashboard > Settings > Contact email
Then verify it via the link sent to that email.

=== PRIVACY POLICY (minimal) ===
Create PRIVACY.md in your repo:
---
# Privacy Policy
JSONL to JSON Converter does not collect, store, or transmit any user data.
All file processing occurs locally in your browser.
No analytics, no tracking, no external connections.
---