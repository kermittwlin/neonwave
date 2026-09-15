/* ============================================
   NEONWAVE — Player Module (YouTube)
   ============================================ */

const Player = {
  ytPlayer: null,
  isReady: false,

  // --- 初始化 YouTube Player ---
  initYouTube() {
    // 使用預先宣告的全域回調
    window.__ytReady = () => this.createPlayer();

    // 如果 API 已經載入完成
    if (window.YT && window.YT.Player) {
      this.createPlayer();
    }
  },

  createPlayer() {
    const container = document.getElementById('youtube-player');
    if (!container) {
      console.error('[NEONWAVE] youtube-player container not found');
      return;
    }

    console.log('[NEONWAVE] Creating YouTube player...');
    try {
      this.ytPlayer = new YT.Player('youtube-player', {
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: () => {
            this.isReady = true;
            this.ytPlayer.setVolume(App.state.volume * 100);
            console.log('[NEONWAVE] YouTube player ready');
            App.toast('YouTube 播放器已就緒');
          },
          onStateChange: (e) => this.onStateChange(e),
          onError: (e) => this.onError(e),
        },
      });
    } catch (err) {
      console.error('[NEONWAVE] YouTube player init error:', err);
      App.toast('播放器初始化失敗，請重新整理頁面', 'error');
    }
  },

  // --- 狀態變更 ---
  onStateChange(event) {
    switch (event.data) {
      case YT.PlayerState.PLAYING:
        App.state.isPlaying = true;
        this.updateUI();
        this.startProgressUpdate();
        break;
      case YT.PlayerState.PAUSED:
        App.state.isPlaying = false;
        this.updateUI();
        this.stopProgressUpdate();
        break;
      case YT.PlayerState.ENDED:
        App.state.isPlaying = false;
        this.updateUI();
        this.stopProgressUpdate();
        this.onTrackEnd();
        break;
      case YT.PlayerState.BUFFERING:
        console.log('[NEONWAVE] Buffering...');
        break;
      case YT.PlayerState.CUED:
        console.log('[NEONWAVE] Video cued');
        break;
    }
  },

  onError(event) {
    const errors = {
      2: '無效的影片 ID',
      100: '影片不存在或已移除',
      101: '嵌入功能已被禁止',
      150: '嵌入功能已被禁止',
    };
    const msg = errors[event.data] || `播放錯誤 (${event.data})`;
    console.error('[NEONWAVE] YouTube error:', msg, 'Code:', event.data);
    App.toast(msg, 'error');

    // 自動跳下一首
    setTimeout(() => this.next(), 2000);
  },

  // --- 播放控制 ---
  play(videoId) {
    if (!this.isReady || !this.ytPlayer) {
      console.warn('[NEONWAVE] Player not ready, retrying...');
      App.toast('播放器載入中...');
      setTimeout(() => this.play(videoId), 1500);
      return;
    }

    if (videoId) {
      console.log('[NEONWAVE] Loading video:', videoId);
      this.ytPlayer.loadVideoById(videoId);
    } else {
      this.ytPlayer.playVideo();
    }
  },

  pause() {
    if (this.isReady && this.ytPlayer) this.ytPlayer.pauseVideo();
  },

  togglePlay() {
    if (!App.state.currentTrack) {
      App.toast('請先選擇一首音樂');
      return;
    }

    if (App.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  },

  stop() {
    if (this.isReady && this.ytPlayer) this.ytPlayer.stopVideo();
    App.state.isPlaying = false;
    this.updateUI();
    this.stopProgressUpdate();
  },

  // --- 上下首（帶交叉淡入淡出）---
  next() {
    const queue = App.state.queue;
    if (queue.length === 0) {
      App.toast('佇列為空');
      return;
    }

    let nextIndex;
    if (App.state.playMode === 'shuffle') {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      const currentIndex = queue.findIndex(t => t.id === App.state.currentTrack?.id);
      nextIndex = (currentIndex + 1) % queue.length;
    }

    this.crossfadeTo(queue[nextIndex]);
  },

  prev() {
    const queue = App.state.queue;
    if (queue.length === 0) return;

    // 如果已播放超過 3 秒，重新播放目前歌曲
    if (this.getCurrentTime() > 3) {
      this.seekTo(0);
      return;
    }

    const currentIndex = queue.findIndex(t => t.id === App.state.currentTrack?.id);
    let prevIndex;
    if (App.state.playMode === 'shuffle') {
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    }

    this.crossfadeTo(queue[prevIndex]);
  },

  // --- 交叉淡入淡出 ---
  crossfadeTo(track, duration = 1000) {
    if (!track || !track.id) return;

    const originalVolume = App.state.volume;
    const steps = 20;
    const stepTime = duration / steps;
    let step = 0;

    // 淡出
    const fadeOut = setInterval(() => {
      step++;
      const newVol = originalVolume * (1 - step / steps);
      this.setVolume(Math.max(0, newVol));

      if (step >= steps) {
        clearInterval(fadeOut);
        // 切換歌曲
        this.playTrack(track);
        // 淡入
        this.fadeIn(originalVolume, duration);
      }
    }, stepTime);
  },

  fadeIn(targetVolume, duration = 1000) {
    const steps = 20;
    const stepTime = duration / steps;
    let step = 0;

    this.setVolume(0);

    const fadeIn = setInterval(() => {
      step++;
      const newVol = targetVolume * (step / steps);
      this.setVolume(Math.min(targetVolume, newVol));

      if (step >= steps) {
        clearInterval(fadeIn);
      }
    }, stepTime);
  },

  onTrackEnd() {
    if (App.state.playMode === 'single') {
      this.ytPlayer.seekTo(0, true);
      this.play();
    } else {
      this.next();
    }
  },

  // --- 播放歌曲 ---
  playTrack(track) {
    if (!track || !track.id) {
      console.error('[NEONWAVE] Invalid track:', track);
      return;
    }

    console.log('[NEONWAVE] Playing track:', track.title, track.id);
    App.state.currentTrack = track;
    this.play(track.id);
    App.addRecent(track);
    this.updateUI();
    Playlist.updateQueueUI();

    // 載入歌詞
    if (typeof Lyrics !== 'undefined') {
      Lyrics.loadForTrack(track);
    }
  },

  // --- 添加到佇列 ---
  addToQueue(track) {
    if (!track || !track.id) return;

    // 檢查是否已存在
    const exists = App.state.queue.find(t => t.id === track.id);
    if (!exists) {
      App.state.queue.push(track);
      Playlist.updateQueueUI();
      App.toast(`已添加: ${track.title}`);
    } else {
      App.toast('已在佇列中');
    }
  },

  // --- 從佇列移除 ---
  removeFromQueue(index) {
    App.state.queue.splice(index, 1);
    Playlist.updateQueueUI();
  },

  // --- 清空佇列 ---
  clearQueue() {
    App.state.queue = [];
    Playlist.updateQueueUI();
  },

  // --- 隨機打亂佇列 ---
  shuffleQueue() {
    for (let i = App.state.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [App.state.queue[i], App.state.queue[j]] = [App.state.queue[j], App.state.queue[i]];
    }
    Playlist.updateQueueUI();
    App.toast('佇列已隨機排序');
  },

  // --- 音量 ---
  setVolume(vol) {
    if (this.isReady && this.ytPlayer) {
      this.ytPlayer.setVolume(vol * 100);
    }
  },

  toggleMute() {
    if (!this.isReady || !this.ytPlayer) return;
    if (this.ytPlayer.isMuted()) {
      this.ytPlayer.unMute();
      App.toast('取消靜音');
    } else {
      this.ytPlayer.mute();
      App.toast('已靜音');
    }
  },

  // --- 進度 ---
  getCurrentTime() {
    return this.ytPlayer?.getCurrentTime() || 0;
  },

  getDuration() {
    return this.ytPlayer?.getDuration() || 0;
  },

  seekTo(percent) {
    if (!this.isReady || !this.ytPlayer) return;
    const duration = this.getDuration();
    if (duration > 0) {
      this.ytPlayer.seekTo(duration * percent, true);
    }
  },

  // --- 進度更新 ---
  progressInterval: null,

  startProgressUpdate() {
    this.stopProgressUpdate();
    this.progressInterval = setInterval(() => this.updateProgress(), 500);
  },

  stopProgressUpdate() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  },

  updateProgress() {
    const current = this.getCurrentTime();
    const duration = this.getDuration();
    if (duration <= 0) return;

    const percent = (current / duration) * 100;
    document.getElementById('progress-fill').style.width = percent + '%';
    document.getElementById('time-current').textContent = this.formatTime(current);
    document.getElementById('time-total').textContent = this.formatTime(duration);
  },

  // --- UI 更新 ---
  updateUI() {
    const playBtn = document.getElementById('btn-play');
    const iconPlay = playBtn?.querySelector('.icon-play');
    const iconPause = playBtn?.querySelector('.icon-pause');

    if (App.state.isPlaying) {
      if (iconPlay) iconPlay.style.display = 'none';
      if (iconPause) iconPause.style.display = 'block';
      playBtn?.classList.add('playing');
    } else {
      if (iconPlay) iconPlay.style.display = 'block';
      if (iconPause) iconPause.style.display = 'none';
      playBtn?.classList.remove('playing');
    }

    // 更新歌曲資訊
    if (App.state.currentTrack) {
      const track = App.state.currentTrack;
      const titleEl = document.getElementById('track-title');
      const artistEl = document.getElementById('track-artist');
      const coverEl = document.getElementById('track-cover');

      if (titleEl) titleEl.textContent = track.title;
      if (artistEl) artistEl.textContent = track.artist || '未知藝術家';

      if (coverEl && track.thumbnail) {
        coverEl.innerHTML = `<img src="${track.thumbnail}" alt="${track.title}">`;
        document.body.classList.add('has-album');

        // 更新專輯背景
        const albumBg = document.getElementById('album-bg');
        if (albumBg) albumBg.style.backgroundImage = `url(${track.thumbnail})`;
      }

      // 更新頁面標題
      document.title = `${track.title} — NEONWAVE`;
    }

    // 更新播放模式圖標
    this.updatePlayModeIcon();
  },

  updatePlayModeIcon() {
    const btn = document.getElementById('btn-playmode');
    if (!btn) return;

    const modes = ['loop', 'shuffle', 'single'];
    const labels = { loop: '順序播放', shuffle: '隨機播放', single: '單曲循環' };

    const currentIndex = modes.indexOf(App.state.playMode);
    btn.title = labels[App.state.playMode];
    btn.className = 'ctrl-btn mode-' + App.state.playMode;
  },

  cyclePlayMode() {
    const modes = ['loop', 'shuffle', 'single'];
    const currentIndex = modes.indexOf(App.state.playMode);
    App.state.playMode = modes[(currentIndex + 1) % modes.length];
    App.saveSettings();
    this.updatePlayModeIcon();

    const labels = { loop: '順序播放', shuffle: '隨機播放', single: '單曲循環' };
    App.toast(labels[App.state.playMode]);
  },

  // --- 工具 ---
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
};

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
  Player.initYouTube();

  // 播放按鈕
  document.getElementById('btn-play')?.addEventListener('click', () => Player.togglePlay());
  document.getElementById('btn-next')?.addEventListener('click', () => Player.next());
  document.getElementById('btn-prev')?.addEventListener('click', () => Player.prev());
  document.getElementById('btn-playmode')?.addEventListener('click', () => Player.cyclePlayMode());

  // 音量
  document.getElementById('volume-slider')?.addEventListener('input', (e) => {
    App.setVolume(parseFloat(e.target.value));
  });

  // 全螢幕
  document.getElementById('btn-fullscreen')?.addEventListener('click', () => App.toggleFullscreen());

  // 佇列
  document.getElementById('btn-mini-queue')?.addEventListener('click', () => {
    document.body.classList.toggle('panel-left-open');
    document.querySelectorAll('.panel-tabs .tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.panel-tabs .tab[data-tab="queue"]')?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    document.getElementById('tab-queue')?.classList.add('active');
  });

  document.getElementById('btn-shuffle-queue')?.addEventListener('click', () => Player.shuffleQueue());
  document.getElementById('btn-clear-queue')?.addEventListener('click', () => {
    Player.clearQueue();
    App.toast('佇列已清空');
  });

  // 進度條拖曳
  const progressContainer = document.querySelector('.progress-container');
  let isDragging = false;

  if (progressContainer) {
    progressContainer.addEventListener('mousedown', (e) => {
      isDragging = true;
      updateProgressFromEvent(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) updateProgressFromEvent(e);
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    function updateProgressFromEvent(e) {
      const rect = progressContainer.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      Player.seekTo(percent);
    }
  }

  // 首頁卡片
  document.querySelectorAll('.home-card').forEach(card => {
    card.addEventListener('click', () => {
      const action = card.dataset.action;
      switch (action) {
        case 'play-random':
          if (App.state.queue.length > 0) {
            const randomIndex = Math.floor(Math.random() * App.state.queue.length);
            Player.playTrack(App.state.queue[randomIndex]);
          } else {
            App.toast('佇列為空，請先搜尋添加音樂');
          }
          break;
        case 'playlists':
          document.body.classList.add('panel-left-open');
          document.querySelectorAll('.panel-tabs .tab').forEach(t => t.classList.remove('active'));
          document.querySelector('.panel-tabs .tab[data-tab="playlists"]')?.classList.add('active');
          document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
          document.getElementById('tab-playlists')?.classList.add('active');
          break;
        case 'search':
          document.getElementById('search-input')?.focus();
          break;
        case 'visuals':
          document.body.classList.add('panel-right-open');
          break;
      }
    });
  });

  // 點讚按鈕
  document.getElementById('btn-like')?.addEventListener('click', () => {
    if (!App.state.currentTrack) return;
    App.toast('已收藏');
    document.getElementById('btn-like')?.classList.toggle('liked');
  });

  // 歌詞按鈕（由 Lyrics 模組處理）
  // document.getElementById('btn-lyrics')?.addEventListener('click', ...)

  // 關閉歌詞按鈕（由 Lyrics 模組處理）
  // document.getElementById('btn-close-lyrics')?.addEventListener('click', ...)
});
