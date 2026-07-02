To start codegen manually:
npm run codegen:manual https://demo.automationtesting.in/Register.html

After triggering script:
1. Wait for the codegen browser to open
2. Open browser dev tools (F12)
3. Go to the Console tab
4. Copy and paste the injector script into the console:
   - **CodegenMetadataInjector.js** – records element metadata and optional screenshots per action
   - **NetworkCaptureInjector.js** – (optional, separate file) records all fetch/XHR network calls
5. Press Enter to execute the script(s)
6. (Optional) For screenshots on each action: run `window.enableScreenshotCapture()` before interacting
7. Interact with elements to record metadata (and screenshots if enabled)
8. When done, run one or more of these commands:

**Metadata**
- `window.downloadMetadata()` – Downloads metadata JSON with timestamp to default download folder
- `window.copyMetadataToClipboard()` – Copies metadata to clipboard (paste into file in this folder)

**Screenshots (after enabling with `window.enableScreenshotCapture()`)**  
- **`window.copyScreenshotsToClipboard()`** – **Recommended in codegen.** Copies the screenshots HTML to clipboard. Paste into a new file (e.g. `screenshots.html`) in this folder, save, then open that file in a browser. This avoids the codegen browser’s download location.
- `window.downloadScreenshots()` – Downloads all screenshots as one HTML file (may go to browser/Downloads; use copy above for a file in your project)
- `window.getScreenshotCount()` – Shows how many screenshots were captured
- `window.clearScreenshots()` – Clears captured screenshots

**Network capture (if you pasted NetworkCaptureInjector.js)**
- `window.downloadNetworkLog()` – Downloads network log JSON (all fetch/XHR requests and responses)
- `window.copyNetworkLogToClipboard()` – Copies network log to clipboard
- `window.showNetworkLogCount()` – Shows number of captured requests
- `window.clearNetworkLog()` – Clears the network log

Note: Due to browser security restrictions, files cannot be directly saved to specific folders. When using codegen, downloads go to the codegen browser’s download location (often not easy to find). **For screenshots, use `window.copyScreenshotsToClipboard()`**, then paste into a new file (e.g. `screenshots.html`) in this folder and open it in your normal browser.