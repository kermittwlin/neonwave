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
    playMode: 'loop',
    volume: 0.8,
    isPlaying: false,
    lyricsVisible: false,
    allHidden: false,
  },

  init() {
    this.loadSettings();
    this.initSplash();
    this.initPanels();
    this.initModals();
    this.initKeyboard();
    this.initHideAll();
    this.initMobileNav();
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
  },

  // --- 面板控制 ---
  initPanels() {
    const leftPanel = document.getElementById('playlist-panel');
    const rightPanel = document.getElementById('fx-panel');
    let leftTimeout, rightTimeout;

    // 桌面端：滑鼠靠近邊緣展開面板
    if (window.innerWidth > 768) {
      document.addEventListener('mousemove', (e) => {
        if (e.clientX < 30) {
          clearTimeout(leftTimeout);
          document.body.classList.add('panel-left-open');
        }
      });

      document.addEventListener('mousemove', (e) => {
        if (e.clientX > window.innerWidth - 30) {
          clearTimeout(rightTimeout);
          document.body.classList.add('panel-right-open');
        }
      });
    }

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
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = 'flex';
      requestAnimationFrame(() => modal.classList.add('open'));
    }
  },

  closeModal(modal) {
    if (!modal) return;
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
        case 'KeyH':
          this.toggleHideAll();
          break;
        case 'Escape':
          this.closeAllModals();
          break;
      }
    });
  },

  // --- 隱藏所有面板 ---
  initHideAll() {
    const hideBtn = document.getElementById('btn-hide-all');
    if (hideBtn) {
      hideBtn.addEventListener('click', () => this.toggleHideAll());
    }
  },

  toggleHideAll() {
    this.state.allHidden = !this.state.allHidden;
    document.body.classList.toggle('all-hidden', this.state.allHidden);
  },

  // --- 手機底部導航 ---
  initMobileNav() {
    // 建立手機導航列
    const nav = document.createElement('nav');
    nav.className = 'mobile-nav';
    nav.innerHTML = `
      <div class="mobile-nav-inner">
        <button class="mobile-nav-btn" data-action="home">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          </svg>
          <span>首頁</span>
        </button>
        <button class="mobile-nav-btn" data-action="search">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span>搜尋</span>
        </button>
        <button class="mobile-nav-btn" data-action="playlists">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
          </svg>
          <span>歌單</span>
        </button>
        <button class="mobile-nav-btn" data-action="visuals">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M4 7h8M16 7h4M4 17h4M12 17h8"/>
            <circle cx="14" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>
          </svg>
          <span>視覺</span>
        </button>
      </div>
    `;
    document.body.appendChild(nav);

    // 綁定事件
    nav.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        switch (action) {
          case 'home':
            this.closeAllPanels();
            break;
          case 'search':
            document.getElementById('search-input').focus();
            break;
          case 'playlists':
            document.body.classList.toggle('panel-left-open');
            break;
          case 'visuals':
            document.body.classList.toggle('panel-right-open');
            break;
        }
      });
    });
  },

  closeAllPanels() {
    document.body.classList.remove('panel-left-open', 'panel-right-open');
  },

  // --- 音量控制 ---
  setVolume(vol) {
    this.state.volume = vol;
    Player.setVolume(vol);
    const slider = document.getElementById('volume-slider');
    if (slider) slider.value = vol;
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
};

// 全域初始化
document.addEventListener('DOMContentLoaded', () => App.init());
