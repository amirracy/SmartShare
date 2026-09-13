# ⚡ SmartShare Hub - Cross-Device Temporary Sharing Web Application

**SmartShare Hub** is an intelligent, zero-friction web tool designed to instantly share text snippets, URLs, code, photos, and files between your Laptop and Smartphone without cables, bluetooth pairing, or user signups!

---

## 🌟 Key Features

1. **Instant QR Code & Room PIN Pairing**:
   - Open on your laptop -> Scan the generated QR Code with your smartphone camera -> Connected immediately!
   - Supports 4-digit Room PINs (e.g., `#ROOM 8492`) or custom room URLs (`#room=MYROOM`).

2. **Multi-Format Media Sync**:
   - 📝 **Text & URLs**: Instant 1-click copy button, auto link detector.
   - 🖼️ **Photos & Images**: Take photo with camera or drag & drop, lightbox preview & download.
   - 📁 **Files & Documents**: Transfer PDFs, ZIPs, or office documents with size indicators.

3. **Temporary DB & Auto-Cleanup**:
   - Choose auto-delete countdown timer (15 minutes, 1 hour, 24 hours, or manual).
   - Manual **"Clear All Items"** button wipes the temporary vault across all connected devices.

4. **WebRTC P2P & Real-Time Sync**:
   - Uses WebRTC (PeerJS) and BroadcastChannel API for high-speed device-to-device transfers.

5. **Aesthetics & Responsive Design**:
   - Modern Glassmorphism dark/light theme.
   - Responsive mobile-first interface.

---

## 🚀 How to Host FREE on GitHub Pages (2 Minutes)

You can host **SmartShare Hub** completely free forever on GitHub Pages using these simple steps:

### Step 1: Create a GitHub Repository
1. Go to [GitHub.com](https://github.com) and log in to your account.
2. Click the **`+`** icon at the top right -> Select **"New repository"**.
3. Name your repository (e.g. `smart-share` or `quickdrop`).
4. Keep it **Public** and click **"Create repository"**.

### Step 2: Upload Files
1. On your new repository page, click **"uploading an existing file"**.
2. Drag and drop all the files from this folder:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
3. Click **"Commit changes"**.

### Step 3: Enable GitHub Pages
1. Go to **Settings** tab in your repository.
2. Click **Pages** on the left menu (under "Code and automation").
3. Under **Build and deployment** -> **Branch**, select `main` (or `master`) branch and folder `/ (root)`.
4. Click **Save**.

🎉 **Your site is live!** In ~1 minute, GitHub will give you your free live URL, like:
`https://yourusername.github.io/smart-share/`

---

## 💻 Local Quick Test

To test locally on your laptop:
Open PowerShell in this folder and run:
```powershell
python -m http.server 8080
```
Then open `http://localhost:8080` in your browser!
