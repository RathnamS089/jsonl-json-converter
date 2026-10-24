Chrome Web Store Privacy Practices - Fill These In:

=== SINGLE PURPOSE DESCRIPTION ===
This extension converts between JSON Lines (JSONL) and JSON array format and lets the user preview the converted records as text or a table (with CSV export). Single purpose: local file format conversion without any data transmission.

=== PERMISSION JUSTIFICATIONS ===

sidePanel:
"The converter opens in Chrome's side panel when the user clicks the toolbar icon. A side panel (unlike a popup) stays open while the user picks or drags in a file. No page content is read; the panel only shows the extension's own converter page."

clipboardWrite:
"Required for 'Copy' button functionality. Users click a button to copy the converted output to their clipboard. No automatic clipboard access - only triggered by explicit user action."

host_permissions: (NONE - removed <all_urls>)
"This extension does not request any host permissions. All processing happens locally in the extension page (side panel or tab), in a Web Worker bundled with the extension. No network requests, no external API calls, no data transmission."

remote_code: (NONE - no remote code)
"This extension does not load or execute any remote code. All JavaScript is bundled locally in the extension package. No eval(), no dynamic script loading, no external resources."

=== DATA USAGE ===
Data collected: NONE
Data transmitted: NONE
Data stored locally: Only the current file being converted (in memory, cleared when the panel or tab closes)
User data sold: NO
User data shared: NO
Analytics/tracking: NO

=== REQUIRED URLs ===
Homepage URL: https://github.com/RathnamS089/jsonl-json-converter
Support URL: https://github.com/RathnamS089/jsonl-json-converter/issues
Privacy Policy URL: https://github.com/RathnamS089/jsonl-json-converter/blob/main/PRIVACY.md

=== CONTACT EMAIL ===
Add your email in Developer Dashboard > Settings > Contact email
Then verify it via the link sent to that email.

=== PRIVACY POLICY ===
See PRIVACY.md in the repo (linked above as the Privacy Policy URL).
