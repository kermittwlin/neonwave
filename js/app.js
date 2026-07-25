/* ============================================
   NEONWAVE — Main App Controller
   ============================================ */

const App = {
  state: {
    isReady: false,
    currentTrack: null,
    queue: [],
    playlists: JSON.parse(localStorage.getItem('neonwave-playlists') || '[]'),
    recent: JSON.parse(localStorage.getItem('neonwave-recent') || '[]'),
    settings: JSON.parse(localStorage.getItem('neonwave-settings') || '{}'),
    playMode: 'loop', // loop, shuffle, single
    volume: 0.8,
    isPlaying: false,
  },

  init() {
    this.loadSettings();
    this.initSplash();
    this.initPanels();
    this.initModals();
    this.initKeyboard();
    this.initDragDrop();
    this.initApiSettings();
    this.state.isReady = true;
  },

  // --- 啟動畫面 ---
  initSplash() {
    const splash = document.getElementById('splash');
    const loaderBar = splash.querySelector('.loader-bar');
    const enterText = splash.querySelector('.splash-enter');

    let progress = 0;
    const loadInterval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(loadInterval);
        enterText.textContent = '點擊進入';
        enterText.style.cursor = 'pointer';
        enterText.style.color = 'var(--neon-pink)';

        splash.addEventListener('click', () => {
          splash.classList.add('hidden');
          setTimeout(() => {
            splash.style.display = 'none';
            this.onReady();
          }, 800);
        }, { once: true });
      }
      loaderBar.style.width = progress + '%';
    }, 200);
  },

  onReady() {
    document.body.classList.add('app-ready');
    // 顯示面板滑入指示
    setTimeout(() => {
      document.body.classList.add('show-panel-hints');
    }, 1000);
  },

  // --- 面板控制 ---
  initPanels() {
    const leftPanel = document.getElementById('playlist-panel');
    const rightPanel = document.getElementById('fx-panel');
    let leftTimeout, rightTimeout;

    // 左側面板滑入
    document.addEventListener('mousemove', (e) => {
      if (e.clientX < 30) {
        clearTimeout(leftTimeout);
        document.body.classList.add('panel-left-open');
      }
    });

    leftPanel.addEventListener('mouseenter', () => {
      clearTimeout(leftTimeout);
      document.body.classList.add('panel-left-open');
    });

    leftPanel.addEventListener('mouseleave', (e) => {
      if (e.relatedTarget && leftPanel.contains(e.relatedTarget)) return;
      leftTimeout = setTimeout(() => {
        if (!leftPanel.matches(':hover')) {
          document.body.classList.remove('panel-left-open');
        }
      }, 300);
    });

    // 右側面板滑入
    document.addEventListener('mousemove', (e) => {
      if (e.clientX > window.innerWidth - 30) {
        clearTimeout(rightTimeout);
        document.body.classList.add('panel-right-open');
      }
    });

    rightPanel.addEventListener('mouseenter', () => {
      clearTimeout(rightTimeout);
      document.body.classList.add('panel-right-open');
    });

    rightPanel.addEventListener('mouseleave', (e) => {
      if (e.relatedTarget && rightPanel.contains(e.relatedTarget)) return;
      rightTimeout = setTimeout(() => {
        if (!rightPanel.matches(':hover')) {
          document.body.classList.remove('panel-right-open');
        }
      }, 300);
    });

    // 面板標籤切換
    document.querySelectorAll('.panel-tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        tab.closest('.panel-tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        document.getElementById('tab-' + tabName).classList.add('active');
      });
    });
  },

  // --- 彈窗控制 ---
  initModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal(overlay);
      });
    });

    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModal(btn.closest('.modal-overlay'));
      });
    });

    // API Key 設定
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyBtn = document.getElementById('btn-save-api-key');
    if (saveApiKeyBtn && apiKeyInput) {
      saveApiKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
          Search.setApiKey(key);
          this.closeModal(document.getElementById('modal-api-key'));
        } else {
          this.toast('請輸入 API Key', 'error');
        }
      });
    }
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = 'flex';
      requestAnimationFrame(() => modal.classList.add('open'));
    }
  },

  closeModal(modal) {
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
  },

  // --- 鍵盤快捷鍵 ---
  initKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          Player.togglePlay();
          break;
        case 'ArrowLeft':
          Player.prev();
          break;
        case 'ArrowRight':
          Player.next();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.setVolume(Math.min(1, this.state.volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.setVolume(Math.max(0, this.state.volume - 0.1));
          break;
        case 'KeyM':
          Player.toggleMute();
          break;
        case 'KeyF':
          this.toggleFullscreen();
          break;
        case 'KeyL':
          document.getElementById('search-input').focus();
          break;
        case 'Escape':
          this.closeAllModals();
          break;
      }
    });
  },

  // --- 拖曳上傳 ---
  initDragDrop() {
    const overlay = document.createElement('div');
    overlay.className = 'drop-overlay';
    overlay.innerHTML = `
      <div class="drop-content">
        <div class="drop-icon">♫</div>
        <div class="drop-text">DROP MUSIC HERE</div>
      </div>
    `;
    document.body.appendChild(overlay);

    let dragCounter = 0;

    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      overlay.classList.add('active');
    });

    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) overlay.classList.remove('active');
    });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      overlay.classList.remove('active');
      // TODO: 處理檔案上傳
    });
  },

  // --- 音量控制 ---
  setVolume(vol) {
    this.state.volume = vol;
    Player.setVolume(vol);
    document.getElementById('volume-slider').value = vol;
    this.saveSettings();
  },

  // --- 全螢幕 ---
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  },

  // --- 關閉所有彈窗 ---
  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => this.closeModal(m));
  },

  // --- 設定持久化 ---
  loadSettings() {
    const s = this.state.settings;
    if (s.volume !== undefined) this.state.volume = s.volume;
    if (s.playMode) this.state.playMode = s.playMode;
  },

  saveSettings() {
    localStorage.setItem('neonwave-settings', JSON.stringify({
      volume: this.state.volume,
      playMode: this.state.playMode,
    }));
  },

  // --- 最近播放 ---
  addRecent(track) {
    this.state.recent = this.state.recent.filter(t => t.id !== track.id);
    this.state.recent.unshift(track);
    if (this.state.recent.length > 20) this.state.recent.pop();
    localStorage.setItem('neonwave-recent', JSON.stringify(this.state.recent));
  },

  // --- Toast 通知 ---
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  // --- API 設定 ---
  initApiSettings() {
    const settingsBtn = document.getElementById('btn-api-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        const apiKeyInput = document.getElementById('api-key-input');
        if (apiKeyInput) {
          apiKeyInput.value = Search.apiKey || '';
        }
        this.openModal('modal-api-key');
      });
    }
  },
};

// 全域初始化
document.addEventListener('DOMContentLoaded', () => App.init());
