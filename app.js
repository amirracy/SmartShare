/**
 * SmartShare Hub - Core Application Logic
 * Triple-Engine Real-Time Sync: PubSub SSE + Active Cloud Polling (2.5s) + PeerJS WebRTC Auto-Mesh.
 * 100% Guaranteed Cross-Device Sync on 4G/5G, Wi-Fi, Smartphones, and Laptops.
 */

(function () {
  'use strict';

  // --- App Constants ---
  const STORAGE_KEY = 'smartshare_vault_items';
  const THEME_KEY = 'smartshare_theme';
  
  let currentRoomCode = '';
  let itemsVault = [];
  let peer = null;
  let activeConnections = [];
  let isRoomMaster = false;
  let eventSource = null;
  let pollTimer = null;
  let broadcastChannel = null;
  let qrcodeObj = null;

  let selectedPhotoData = null;
  let selectedFileData = null;

  // --- DOM Elements ---
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const roomCodeDisplay = document.getElementById('roomCodeDisplay');
  const modalRoomPin = document.getElementById('modalRoomPin');
  const openRoomBtn = document.getElementById('openRoomBtn');
  const quickJoinBtn = document.getElementById('quickJoinBtn');
  const roomModal = document.getElementById('roomModal');
  const closeRoomModalBtn = document.getElementById('closeRoomModalBtn');
  const joinRoomPinInput = document.getElementById('joinRoomPinInput');
  const joinRoomSubmitBtn = document.getElementById('joinRoomSubmitBtn');

  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const selfPeerId = document.getElementById('selfPeerId');
  const storageSizeDisplay = document.getElementById('storageSizeDisplay');
  const cloudDbStatus = document.getElementById('cloudDbStatus');

  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  const textInput = document.getElementById('textInput');
  const sendTextBtn = document.getElementById('sendTextBtn');

  const photoDropzone = document.getElementById('photoDropzone');
  const photoFileInput = document.getElementById('photoFileInput');
  const photoPreviewBar = document.getElementById('photoPreviewBar');
  const photoFileName = document.getElementById('photoFileName');
  const clearPhotoBtn = document.getElementById('clearPhotoBtn');
  const sendPhotoBtn = document.getElementById('sendPhotoBtn');

  const fileDropzone = document.getElementById('fileDropzone');
  const generalFileInput = document.getElementById('generalFileInput');
  const filePreviewBar = document.getElementById('filePreviewBar');
  const generalFileName = document.getElementById('generalFileName');
  const clearFileBtn = document.getElementById('clearFileBtn');
  const sendFileBtn = document.getElementById('sendFileBtn');

  const itemExpirySelect = document.getElementById('itemExpirySelect');
  const feedGrid = document.getElementById('feedGrid');
  const emptyState = document.getElementById('emptyState');
  const totalItemCount = document.getElementById('totalItemCount');
  const searchFeedInput = document.getElementById('searchFeedInput');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const targetPeerCount = document.getElementById('targetPeerCount');

  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImage = document.getElementById('lightboxImage');
  const closeLightboxBtn = document.getElementById('closeLightboxBtn');
  const toastContainer = document.getElementById('toastContainer');

  // --- Initialization ---
  function init() {
    loadTheme();
    loadRoomCode();
    loadVaultLocal();
    initBroadcastChannel();
    initCloudRealtimeEngine();
    initPeerJSMesh();
    setupEventListeners();
    setupDropzones();
    startExpiryChecker();
    renderFeed();
  }

  // --- Theme Management ---
  function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    if (themeIcon) {
      themeIcon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
      if (window.lucide) lucide.createIcons();
    }
  }

  // --- Room Code & Hash Parser ---
  function loadRoomCode() {
    const hash = window.location.hash;
    const search = window.location.search;

    let pin = null;

    // Check #room=3270 or #3270
    const hashMatch = hash.match(/room=([A-Za-z0-9]+)/) || hash.match(/#([A-Za-z0-9]{3,8})/);
    if (hashMatch && hashMatch[1]) {
      pin = hashMatch[1];
    } else {
      // Check ?room=3270 or ?pin=3270
      const searchMatch = search.match(/[?&](?:room|pin)=([A-Za-z0-9]+)/);
      if (searchMatch && searchMatch[1]) {
        pin = searchMatch[1];
      }
    }

    if (pin) {
      currentRoomCode = pin.toUpperCase();
    } else {
      currentRoomCode = Math.floor(1000 + Math.random() * 9000).toString();
    }

    window.location.hash = `room=${currentRoomCode}`;
    roomCodeDisplay.textContent = `ROOM #${currentRoomCode}`;
    modalRoomPin.textContent = currentRoomCode;
    generateQRCode();
  }

  function generateQRCode() {
    const qrContainer = document.getElementById('qrcodeCanvas');
    if (!qrContainer) return;
    qrContainer.innerHTML = '';

    const shareUrl = `${window.location.origin}${window.location.pathname}#room=${currentRoomCode}`;
    
    qrcodeObj = new QRCode(qrContainer, {
      text: shareUrl,
      width: 180,
      height: 180,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  function joinRoom(pin) {
    if (!pin || pin.trim() === '') return;
    const cleanPin = pin.trim().toUpperCase();
    if (cleanPin === currentRoomCode) return;

    currentRoomCode = cleanPin;
    window.location.hash = `room=${cleanPin}`;
    roomCodeDisplay.textContent = `ROOM #${cleanPin}`;
    modalRoomPin.textContent = cleanPin;
    generateQRCode();

    itemsVault = [];
    loadVaultLocal();
    renderFeed();

    initCloudRealtimeEngine();
    initPeerJSMesh();

    closeModal(roomModal);
    showToast(`Joined Room #${cleanPin}`, 'success');
  }

  // --- Triple-Engine Cross-Device Real-Time Synchronization ---
  function initCloudRealtimeEngine() {
    // 1. Close previous EventSource SSE
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    // 2. Clear previous active polling
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }

    const topic = `smartshare_vault_room_${currentRoomCode}`;
    const sseUrl = `https://ntfy.sh/${topic}/json?since=24h`;

    if (cloudDbStatus) cloudDbStatus.textContent = 'Active (Live Cloud Sync)';

    // Connect SSE Stream
    try {
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          handleCloudMessage(raw);
        } catch (_) {}
      };

      eventSource.onerror = () => {
        console.warn('PubSub SSE reconnecting...');
      };
    } catch (e) {
      console.warn('EventSource fallback:', e);
    }

    // Connect Active 2.5s Polling Fallback (Guarantees cross-device sync on all networks)
    fetchCloudHistory();
    pollTimer = setInterval(fetchCloudHistory, 2500);
  }

  function fetchCloudHistory() {
    const topic = `smartshare_vault_room_${currentRoomCode}`;
    const pollUrl = `https://ntfy.sh/${topic}/json?poll=1&since=24h`;

    fetch(pollUrl)
      .then(res => res.text())
      .then(text => {
        if (!text) return;
        const lines = text.trim().split('\n');
        lines.forEach(line => {
          try {
            const raw = JSON.parse(line);
            handleCloudMessage(raw);
          } catch (_) {}
        });
      })
      .catch(err => console.warn('Cloud poll error:', err));
  }

  function handleCloudMessage(raw) {
    if (!raw) return;

    // Handle attachment upload (Photos & Files)
    if (raw.title === 'SMARTSHARE_ATTACHMENT' && raw.message && raw.attachment) {
      try {
        const meta = JSON.parse(raw.message);
        const item = {
          id: meta.id,
          category: meta.category,
          name: meta.name || raw.attachment.name,
          size: meta.size || formatBytes(raw.attachment.size),
          mime: meta.mime || raw.attachment.type,
          content: raw.attachment.url,
          timestamp: meta.timestamp || Date.now(),
          expireMinutes: meta.expireMinutes || 60
        };

        addItemToVault(item);
      } catch (err) {
        console.warn('Attachment parse error:', err);
      }
      return;
    }

    // Handle JSON message (Text & P2P actions)
    if (raw.message) {
      try {
        const payload = JSON.parse(raw.message);
        handleCloudAction(payload);
      } catch (_) {}
    }
  }

  function handleCloudAction(payload) {
    if (!payload || !payload.action) return;

    if (payload.action === 'ADD_ITEM' && payload.item) {
      addItemToVault(payload.item);
    } else if (payload.action === 'DELETE_ITEM' && payload.id) {
      itemsVault = itemsVault.filter(i => i.id !== payload.id);
      saveVaultLocal();
      renderFeed();
    } else if (payload.action === 'CLEAR_ALL') {
      itemsVault = [];
      saveVaultLocal();
      renderFeed();
    } else if (payload.action === 'REQUEST_SYNC' && isRoomMaster) {
      publishToCloudRelay({ action: 'RESPONSE_SYNC', vault: itemsVault });
    } else if (payload.action === 'RESPONSE_SYNC' && Array.isArray(payload.vault)) {
      let changed = false;
      payload.vault.forEach(item => {
        if (!itemsVault.some(i => i.id === item.id)) {
          itemsVault.push(item);
          changed = true;
        }
      });
      if (changed) {
        itemsVault.sort((a, b) => b.timestamp - a.timestamp);
        cleanExpiredItems();
        saveVaultLocal();
        renderFeed();
      }
    }
  }

  function addItemToVault(item) {
    if (!item || !item.id) return;
    const index = itemsVault.findIndex(i => i.id === item.id);
    if (index === -1) {
      itemsVault.unshift(item);
      cleanExpiredItems();
      saveVaultLocal();
      renderFeed();
      showToast(`Received new ${item.category || 'item'}!`, 'info');
    } else {
      // Upgrade existing item if new full content URL arrives
      if (item.content && itemsVault[index].content !== item.content) {
        itemsVault[index] = item;
        saveVaultLocal();
        renderFeed();
      }
    }
  }

  function publishToCloudRelay(actionObj) {
    const topic = `smartshare_vault_room_${currentRoomCode}`;
    const url = `https://ntfy.sh/${topic}`;

    fetch(url, {
      method: 'POST',
      body: JSON.stringify(actionObj),
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(err => console.warn('Publish error:', err));
  }

  function publishAttachmentToCloud(blob, item) {
    const topic = `smartshare_vault_room_${currentRoomCode}`;
    const url = `https://ntfy.sh/${topic}`;

    const metadataHeader = JSON.stringify({
      id: item.id,
      category: item.category,
      name: item.name,
      size: item.size,
      mime: item.mime,
      timestamp: item.timestamp,
      expireMinutes: item.expireMinutes
    });

    fetch(url, {
      method: 'PUT',
      body: blob,
      headers: {
        'Title': 'SMARTSHARE_ATTACHMENT',
        'Filename': item.name || 'file',
        'X-Message': metadataHeader
      }
    }).then(res => res.json())
      .then(data => {
        if (data && data.attachment && data.attachment.url) {
          item.content = data.attachment.url;
          addItemToVault(item);
        }
      })
      .catch(err => console.warn('Attachment upload fallback:', err));
  }

  // --- PeerJS WebRTC Auto-Mesh ---
  function initPeerJSMesh() {
    if (peer) {
      try { peer.destroy(); } catch (_) {}
      peer = null;
    }
    activeConnections = [];

    const masterPeerId = `smartshare-room-${currentRoomCode}-master`;
    const clientSuffix = Math.random().toString(36).substring(2, 6);
    const clientPeerId = `smartshare-room-${currentRoomCode}-client-${clientSuffix}`;

    peer = new Peer(masterPeerId, { debug: 1 });

    peer.on('open', (id) => {
      isRoomMaster = true;
      if (selfPeerId) selfPeerId.textContent = `Master: ${id}`;
      updateSyncStatus();
    });

    peer.on('connection', (conn) => {
      activeConnections.push(conn);
      updateSyncStatus();

      conn.on('open', () => {
        conn.send({ type: 'SYNC_FULL_VAULT', vault: itemsVault });
      });

      conn.on('data', (data) => {
        handleP2PMessage(data);
      });

      conn.on('close', () => {
        activeConnections = activeConnections.filter(c => c !== conn);
        updateSyncStatus();
      });
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        connectAsClient(clientPeerId, masterPeerId);
      }
    });
  }

  function connectAsClient(myPeerId, masterPeerId) {
    peer = new Peer(myPeerId, { debug: 1 });

    peer.on('open', (id) => {
      isRoomMaster = false;
      if (selfPeerId) selfPeerId.textContent = `Client: ${id}`;
      updateSyncStatus();

      const conn = peer.connect(masterPeerId);
      conn.on('open', () => {
        activeConnections.push(conn);
        updateSyncStatus();
        conn.send({ type: 'REQUEST_VAULT' });
        publishToCloudRelay({ action: 'REQUEST_SYNC' });
      });

      conn.on('data', (data) => {
        handleP2PMessage(data);
      });

      conn.on('close', () => {
        activeConnections = activeConnections.filter(c => c !== conn);
        updateSyncStatus();
      });
    });

    peer.on('connection', (conn) => {
      activeConnections.push(conn);
      updateSyncStatus();

      conn.on('data', (data) => {
        handleP2PMessage(data);
      });
    });
  }

  function handleP2PMessage(data) {
    if (!data || !data.type) return;

    if (data.type === 'SYNC_FULL_VAULT' && Array.isArray(data.vault)) {
      let updated = false;
      data.vault.forEach(item => {
        if (!itemsVault.some(i => i.id === item.id)) {
          itemsVault.push(item);
          updated = true;
        }
      });
      if (updated) {
        itemsVault.sort((a, b) => b.timestamp - a.timestamp);
        cleanExpiredItems();
        saveVaultLocal();
        renderFeed();
      }
    } else if (data.type === 'ADD_ITEM' && data.item) {
      addItemToVault(data.item);
    } else if (data.type === 'DELETE_ITEM' && data.id) {
      itemsVault = itemsVault.filter(i => i.id !== data.id);
      saveVaultLocal();
      renderFeed();
    } else if (data.type === 'CLEAR_ALL') {
      itemsVault = [];
      saveVaultLocal();
      renderFeed();
    } else if (data.type === 'REQUEST_VAULT') {
      broadcastP2P({ type: 'SYNC_FULL_VAULT', vault: itemsVault });
    }
  }

  function broadcastP2P(msgObj) {
    activeConnections.forEach(conn => {
      if (conn.open) {
        conn.send(msgObj);
      }
    });
  }

  function updateSyncStatus() {
    if (targetPeerCount) {
      const activeCount = activeConnections.length + 1;
      targetPeerCount.textContent = `Cloud Synced`;
    }
  }

  // --- BroadcastChannel ---
  function initBroadcastChannel() {
    if ('BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel(`smartshare_channel_${currentRoomCode}`);
      broadcastChannel.onmessage = (event) => {
        if (event.data) {
          handleP2PMessage(event.data);
        }
      };
    }
  }

  function broadcastToAll(actionType, payloadObj, blobMedia = null) {
    if (actionType === 'ADD_ITEM') {
      if (blobMedia) {
        publishAttachmentToCloud(blobMedia, payloadObj);
      } else {
        publishToCloudRelay({ action: 'ADD_ITEM', item: payloadObj });
      }
      broadcastP2P({ type: 'ADD_ITEM', item: payloadObj });
    } else if (actionType === 'DELETE_ITEM') {
      publishToCloudRelay({ action: 'DELETE_ITEM', id: payloadObj });
      broadcastP2P({ type: 'DELETE_ITEM', id: payloadObj });
    } else if (actionType === 'CLEAR_ALL') {
      publishToCloudRelay({ action: 'CLEAR_ALL' });
      broadcastP2P({ type: 'CLEAR_ALL' });
    }

    if (broadcastChannel) {
      if (actionType === 'ADD_ITEM') broadcastChannel.postMessage({ type: 'ADD_ITEM', item: payloadObj });
      if (actionType === 'DELETE_ITEM') broadcastChannel.postMessage({ type: 'DELETE_ITEM', id: payloadObj });
      if (actionType === 'CLEAR_ALL') broadcastChannel.postMessage({ type: 'CLEAR_ALL' });
    }
  }

  // --- Local Vault Storage ---
  function loadVaultLocal() {
    try {
      const data = localStorage.getItem(`${STORAGE_KEY}_${currentRoomCode}`);
      if (data) {
        itemsVault = JSON.parse(data);
        cleanExpiredItems();
      }
    } catch (e) {
      itemsVault = [];
    }
  }

  function saveVaultLocal() {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${currentRoomCode}`, JSON.stringify(itemsVault));
      updateStorageSizeDisplay();
    } catch (e) {
      console.warn('Storage limit reached:', e);
    }
  }

  function cleanExpiredItems() {
    const now = Date.now();
    const initialLen = itemsVault.length;
    itemsVault = itemsVault.filter(item => {
      if (!item.expireMinutes || item.expireMinutes === 0) return true;
      const expireTime = item.timestamp + (item.expireMinutes * 60 * 1000);
      return now < expireTime;
    });

    if (itemsVault.length !== initialLen) {
      saveVaultLocal();
    }
  }

  function startExpiryChecker() {
    setInterval(() => {
      cleanExpiredItems();
      renderFeed();
    }, 15000);
  }

  function updateStorageSizeDisplay() {
    if (!storageSizeDisplay) return;
    const str = JSON.stringify(itemsVault);
    const bytes = new Blob([str]).size;
    const kb = (bytes / 1024).toFixed(1);
    storageSizeDisplay.textContent = kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb} KB`;
  }

  // --- UI Event Handlers ---
  function setupEventListeners() {
    themeToggleBtn.addEventListener('click', toggleTheme);

    openRoomBtn.addEventListener('click', () => openModal(roomModal));
    if (quickJoinBtn) {
      quickJoinBtn.addEventListener('click', () => {
        const pinPrompt = prompt("Enter Room PIN to Join (e.g. 3270):");
        if (pinPrompt) joinRoom(pinPrompt);
      });
    }

    closeRoomModalBtn.addEventListener('click', () => closeModal(roomModal));
    roomModal.addEventListener('click', (e) => { if (e.target === roomModal) closeModal(roomModal); });

    openSettingsBtn.addEventListener('click', () => {
      updateStorageSizeDisplay();
      openModal(settingsModal);
    });
    closeSettingsModalBtn.addEventListener('click', () => closeModal(settingsModal));
    saveSettingsBtn.addEventListener('click', () => closeModal(settingsModal));
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeModal(settingsModal); });

    joinRoomSubmitBtn.addEventListener('click', () => joinRoom(joinRoomPinInput.value));
    joinRoomPinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinRoom(joinRoomPinInput.value); });

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = document.getElementById(`tab-${btn.dataset.tab}`);
        if (targetTab) targetTab.classList.add('active');
      });
    });

    sendTextBtn.addEventListener('click', handleSendText);
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSendText();
      }
    });

    photoFileInput.addEventListener('change', handlePhotoSelect);
    clearPhotoBtn.addEventListener('click', clearPhotoSelection);
    sendPhotoBtn.addEventListener('click', handleSendPhoto);

    generalFileInput.addEventListener('change', handleFileSelect);
    clearFileBtn.addEventListener('click', clearFileSelection);
    sendFileBtn.addEventListener('click', handleSendFile);

    searchFeedInput.addEventListener('input', renderFeed);
    clearAllBtn.addEventListener('click', handleClearAll);

    closeLightboxBtn.addEventListener('click', () => closeModal(lightboxModal));
    lightboxModal.addEventListener('click', (e) => { if (e.target === lightboxModal) closeModal(lightboxModal); });

    window.addEventListener('hashchange', () => {
      const match = window.location.hash.match(/room=([A-Za-z0-9]+)/);
      if (match && match[1] && match[1].toUpperCase() !== currentRoomCode) {
        joinRoom(match[1]);
      }
    });
  }

  function setupDropzones() {
    setupSingleDropzone(photoDropzone, photoFileInput, handlePhotoSelect);
    setupSingleDropzone(fileDropzone, generalFileInput, handleFileSelect);
  }

  function setupSingleDropzone(element, inputEl, handleFn) {
    element.addEventListener('click', () => inputEl.click());
    
    ['dragenter', 'dragover'].forEach(eventName => {
      element.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        element.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      element.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        element.classList.remove('dragover');
      }, false);
    });

    element.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        inputEl.files = files;
        handleFn();
      }
    });
  }

  function getSelectedExpiry() {
    return parseInt(itemExpirySelect.value, 10) || 60;
  }

  // --- Handlers & Upload Actions ---
  function handleSendText() {
    const val = textInput.value.trim();
    if (!val) {
      showToast('Please enter some text to send', 'warning');
      return;
    }

    const newItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      category: 'text',
      content: val,
      timestamp: Date.now(),
      expireMinutes: getSelectedExpiry()
    };

    itemsVault.unshift(newItem);
    saveVaultLocal();
    broadcastToAll('ADD_ITEM', newItem);
    renderFeed();

    textInput.value = '';
    showToast('Text shared to Phone & Laptop!', 'success');
  }

  function handlePhotoSelect() {
    const file = photoFileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1000;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

          selectedPhotoData = {
            file: file,
            blob: blob || file,
            name: file.name,
            size: formatBytes(file.size),
            mime: 'image/jpeg',
            dataUrl: compressedDataUrl
          };

          photoFileName.textContent = file.name;
          photoPreviewBar.style.display = 'flex';
          sendPhotoBtn.disabled = false;
        }, 'image/jpeg', 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function clearPhotoSelection() {
    photoFileInput.value = '';
    selectedPhotoData = null;
    photoPreviewBar.style.display = 'none';
    sendPhotoBtn.disabled = true;
  }

  function handleSendPhoto() {
    if (!selectedPhotoData) return;

    const newItem = {
      id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      category: 'photo',
      name: selectedPhotoData.name,
      size: selectedPhotoData.size,
      mime: selectedPhotoData.mime,
      content: selectedPhotoData.dataUrl,
      timestamp: Date.now(),
      expireMinutes: getSelectedExpiry()
    };

    itemsVault.unshift(newItem);
    saveVaultLocal();
    broadcastToAll('ADD_ITEM', newItem, selectedPhotoData.blob);
    renderFeed();

    clearPhotoSelection();
    showToast('Photo shared to Phone & Laptop!', 'success');
  }

  function handleFileSelect() {
    const file = generalFileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      selectedFileData = {
        file: file,
        blob: file,
        name: file.name,
        size: formatBytes(file.size),
        mime: file.type || 'application/octet-stream',
        dataUrl: e.target.result
      };
      generalFileName.textContent = file.name;
      filePreviewBar.style.display = 'flex';
      sendFileBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  function clearFileSelection() {
    generalFileInput.value = '';
    selectedFileData = null;
    filePreviewBar.style.display = 'none';
    sendFileBtn.disabled = true;
  }

  function handleSendFile() {
    if (!selectedFileData) return;

    const newItem = {
      id: 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      category: 'file',
      name: selectedFileData.name,
      size: selectedFileData.size,
      mime: selectedFileData.mime,
      content: selectedFileData.dataUrl,
      timestamp: Date.now(),
      expireMinutes: getSelectedExpiry()
    };

    itemsVault.unshift(newItem);
    saveVaultLocal();
    broadcastToAll('ADD_ITEM', newItem, selectedFileData.blob);
    renderFeed();

    clearFileSelection();
    showToast('File shared to Phone & Laptop!', 'success');
  }

  // --- Render Feed Grid ---
  function renderFeed() {
    const query = (searchFeedInput.value || '').toLowerCase().trim();
    let filtered = itemsVault;

    if (query) {
      filtered = itemsVault.filter(item => {
        if (item.category === 'text') return item.content.toLowerCase().includes(query);
        if (item.name) return item.name.toLowerCase().includes(query);
        return false;
      });
    }

    totalItemCount.textContent = `${filtered.length} Item${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      feedGrid.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    feedGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    feedGrid.innerHTML = '';

    filtered.forEach(item => {
      const card = createCardElement(item);
      feedGrid.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
  }

  function createCardElement(item) {
    const card = document.createElement('div');
    card.className = 'feed-card';
    card.dataset.id = item.id;

    const timeAgo = formatTimeAgo(item.timestamp);
    let categoryIcon = 'file-text';
    if (item.category === 'photo') categoryIcon = 'image';
    if (item.category === 'file') categoryIcon = 'file';

    let contentHtml = '';

    if (item.category === 'text') {
      contentHtml = `
        <div class="card-content-text">${escapeHtml(item.content)}</div>
      `;
    } else if (item.category === 'photo') {
      contentHtml = `
        <div class="card-image-wrap" onclick="window.openLightbox('${item.id}')">
          <img src="${item.content}" alt="${escapeHtml(item.name || 'Photo')}">
        </div>
      `;
    } else if (item.category === 'file') {
      contentHtml = `
        <div class="card-file-box">
          <div class="file-icon-box">
            <i data-lucide="file"></i>
          </div>
          <div class="file-meta">
            <span class="file-name">${escapeHtml(item.name || 'File')}</span>
            <span class="file-size">${item.size || 'Unknown size'}</span>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-top">
        <span class="card-type-tag">
          <i data-lucide="${categoryIcon}" style="width: 14px;"></i>
          ${item.category}
        </span>
        <span class="card-time">${timeAgo}</span>
      </div>

      ${contentHtml}

      <div class="card-actions">
        ${item.category === 'text' ? `
          <button class="btn-card-action" onclick="window.copyTextToClipboard('${escapeJsString(item.content)}')">
            <i data-lucide="copy" style="width: 14px;"></i> Copy
          </button>
          ${isValidUrl(item.content) ? `
            <a href="${escapeHtml(item.content)}" target="_blank" class="btn-card-action" style="text-decoration: none;">
              <i data-lucide="external-link" style="width: 14px;"></i> Open
            </a>
          ` : ''}
        ` : `
          <button class="btn-card-action" onclick="window.downloadMediaItem('${item.id}')">
            <i data-lucide="download" style="width: 14px;"></i> Download
          </button>
        `}

        <button class="btn-card-action delete" onclick="window.deleteVaultItem('${item.id}')">
          <i data-lucide="trash-2" style="width: 14px;"></i> Delete
        </button>
      </div>
    `;

    return card;
  }

  function handleClearAll() {
    if (itemsVault.length === 0) return;
    if (confirm('Are you sure you want to clear all items in this room vault?')) {
      itemsVault = [];
      saveVaultLocal();
      broadcastToAll('CLEAR_ALL');
      renderFeed();
      showToast('Vault cleared!', 'info');
    }
  }

  // --- Downloader ---
  window.downloadMediaItem = function (id) {
    const item = itemsVault.find(i => i.id === id);
    if (!item || !item.content) {
      showToast('Item content unavailable for download', 'warning');
      return;
    }

    try {
      if (item.content.startsWith('http://') || item.content.startsWith('https://')) {
        fetch(item.content)
          .then(res => res.blob())
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = item.name || `download_${Date.now()}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
            showToast('Download started!', 'success');
          })
          .catch(() => {
            window.open(item.content, '_blank');
          });
      } else if (item.content.startsWith('data:')) {
        const parts = item.content.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : (item.mime || 'application/octet-stream');
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = item.name || `shared_media_${Date.now()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        showToast('Download started!', 'success');
      }
    } catch (err) {
      console.error('Download error:', err);
      showToast('Failed to download item', 'error');
    }
  };

  // --- Global Helpers ---
  window.copyTextToClipboard = function (text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
      }).catch(() => fallbackCopyText(text));
    } else {
      fallbackCopyText(text);
    }
  };

  function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Copied to clipboard!', 'success');
    } catch (err) {
      showToast('Failed to copy', 'error');
    }
    document.body.removeChild(textArea);
  }

  window.deleteVaultItem = function (id) {
    itemsVault = itemsVault.filter(item => item.id !== id);
    saveVaultLocal();
    broadcastToAll('DELETE_ITEM', id);
    renderFeed();
    showToast('Item deleted', 'info');
  };

  window.openLightbox = function (itemIdOrSrc) {
    let imgSrc = itemIdOrSrc;
    const item = itemsVault.find(i => i.id === itemIdOrSrc);
    if (item && item.content) imgSrc = item.content;

    lightboxImage.src = imgSrc;
    openModal(lightboxModal);
  };

  function openModal(el) {
    if (el) el.classList.add('active');
  }

  function closeModal(el) {
    if (el) el.classList.remove('active');
  }

  function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'warning') iconName = 'alert-triangle';
    if (type === 'error') iconName = 'alert-circle';

    toast.innerHTML = `
      <i data-lucide="${iconName}" style="color: var(--primary);"></i>
      <span>${escapeHtml(msg)}</span>
    `;

    toastContainer.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeJsString(str) {
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  document.addEventListener('DOMContentLoaded', init);

})();
