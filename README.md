# ⚡ SmartShare Hub - Cross-Device Instant Data Sharing Vault

**SmartShare Hub** is an intelligent, high-aesthetics web application designed to instantly transfer text snippets, URLs, code, photos, and files between your Laptop, Smartphone, or Tablet without data cables, Bluetooth pairing, or account signups!

🌐 **Live Web App**: [https://amirracy.github.io/SmartShare/](https://amirracy.github.io/SmartShare/)

---

## 🛠️ What We Used (Technologies & Architecture)

SmartShare Hub is engineered as a zero-dependency, zero-cost static web application using modern Web APIs:

* **Core Stack**: Pure HTML5, Modular ES6+ JavaScript, and Vanilla CSS3 (Custom Properties & Glassmorphism).
* **Real-Time Cross-Device Sync Engines**:
  * 🌐 **PubSub Cloud Relay (`ntfy.sh` API)**: Real-time Server-Sent Events (SSE) stream allowing devices on 4G/5G cellular data and Wi-Fi to sync instantly.
  * 📦 **Attachment CDN Streaming**: Uploads photos and file blobs directly to an ephemeral attachment stream for high-speed cross-device delivery.
  * 🔄 **Continuous Cloud Polling (2.5s)**: Ensures 100% data sync reliability on mobile Safari & Chrome background tabs.
  * 🔗 **WebRTC P2P Mesh (PeerJS)**: Direct device-to-device peer-to-peer data channels for instant transfer.
  * 📑 **BroadcastChannel API**: Multi-tab synchronization on the same browser instance.
* **Libraries & Design Utilities**:
  * 📱 **QRCode.js**: Client-side pairing QR Code generator.
  * 🎨 **Lucide Icons**: Vector iconography set.
  * 🔤 **Google Fonts**: Modern `Outfit` & `Inter` typography.

---

## 🌟 Key Features

1. ⚡ **Zero-Cable & Zero-Login Pairing**:
   - Open on your laptop -> Scan the generated pairing QR Code with your smartphone camera -> Connected immediately!
   - Supports 4-digit Room PINs (e.g. `ROOM #3270`) or custom URL hashes (`#room=3270`).

2. ⬆️ **Descending Order Feed (Latest at Top)**:
   - Shared text, photos, and files are automatically sorted with the newest uploads appearing at the **very top** of the feed (like WhatsApp or Telegram).

3. 👤 **Display Names & Connected Users List**:
   - Prompt on join for your name (e.g. *Amir's Laptop*, *Amir's iPhone*).
   - Every shared card displays a `Sent by [User Name]` badge.
   - Tap the **ROOM** badge to see all active connected users in the room.

4. 🔄 **Reset Room**:
   - Single-tap **Reset Room** button in the QR Code modal generates a fresh Room PIN and notifies all connected devices to leave the old room.

5. 🖼️ **Multi-Format Media Vault**:
   - 📝 **Text & URLs**: 1-click copy button & URL launcher.
   - 🖼️ **Photos**: Auto-compressed image thumbnails, full-screen Lightbox view, and native Blob downloads.
   - 📁 **Files & Documents**: PDF, ZIP, and file attachments with size indicators.

6. ☀️ **High-Contrast Dark & Light Glassmorphism Themes**:
   - Vibrant midnight navy theme with elevated high-contrast cards and 1-tap Light Theme switch for outdoor sunlight viewing.

7. ⏱️ **Temporary DB & Auto-Cleanup**:
   - Set auto-delete timers (15m, 1h, 24h, or manual) + 1-click **Clear All Items** wipe button.

---

## 📖 How to Use (Step-by-Step Guide)

### 📱 Scenario: Sharing Data between Laptop and Smartphone

1. **Open on Laptop**:
   - Go to [https://amirracy.github.io/SmartShare/](https://amirracy.github.io/SmartShare/).
   - Click the **`ROOM #----`** badge at the top right to view your unique **Pairing QR Code** and 4-digit Room PIN (e.g., `3270`).

2. **Connect Smartphone**:
   - Open your mobile camera app on your phone and scan the QR Code on your laptop screen.
   - *(Alternative)*: Open [https://amirracy.github.io/SmartShare/](https://amirracy.github.io/SmartShare/) on your phone, tap the **`#`** icon in the top header, and enter `3270`.

3. **Set Display Name**:
   - Enter your name or device name (e.g., *Laptop*, *Phone*) when prompted.

4. **Start Sharing!**:
   - **Send Text / Links**: Paste text in the text box -> Tap **Send Text**.
   - **Send Photos**: Tap **Photo** tab -> Choose an image -> Tap **Send Photo**.
   - **Send Files**: Tap **File** tab -> Pick any document -> Tap **Send File**.
   - The item will appear **instantly at the top** of the Synced Items Vault on all connected devices!

---

## 🚀 How to Host Your Own Copy (GitHub Pages)

Hosting your own copy is **100% FREE** and requires **NO setup or backend server**:

1. Fork or download this repository.
2. Go to your GitHub repository -> **Settings** -> **Pages**.
3. Under **Branch**, select **`main`** and **`/ (root)`** -> Click **Save**.
4. Your site will be live at `https://<your-username>.github.io/<repo-name>/`!
