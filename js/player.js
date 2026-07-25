/* ============================================
   NEONWAVE — YouTube Player Module
   ============================================ */

const Player = {
  ytPlayer: null,
  isReady: false,

  // --- YouTube IFrame API Ready ---
  onYouTubeIframeAPIReady() {
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
        },
        onStateChange: (e) => this.onStateChange(e),
        onError: (e) => this.onError(e),
      },
    });
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
        // 載入中
        break;
    }
  },

  onError(event) {
    console.error('[NEONWAVE] YouTube error:', event.data);
    App.toast('播放錯誤，嘗試下一首', 'error');
    setTimeout(() => this.next(), 1000);
  },

  // --- 播放控制 ---
  play(videoId) {
    if (!this.isReady) {
      console.warn('[NEONWAVE] Player not ready');
      return;
    }

    if (videoId) {
      this.ytPlayer.loadVideoById(videoId);
    } else {
      this.ytPlayer.playVideo();
    }
  },

  pause() {
    if (this.isReady) this.ytPlayer.pauseVideo();
  },

  togglePlay() {
    if (!App.state.currentTrack) return;

    if (App.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  },

  stop() {
    if (this.isReady) this.ytPlayer.stopVideo();
    App.state.isPlaying = false;
    this.updateUI();
    this.stopProgressUpdate();
  },

  // --- 上下首 ---
  next() {
    const queue = App.state.queue;
    if (queue.length === 0) return;

    let nextIndex;
    if (App.state.playMode === 'shuffle') {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      const currentIndex = queue.findIndex(t => t.id === App.state.currentTrack?.id);
      nextIndex = (currentIndex + 1) % queue.length;
    }

    this.playTrack(queue[nextIndex]);
  },

  prev() {
    const queue = App.state.queue;
    if (queue.length === 0) return;

    const currentIndex = queue.findIndex(t => t.id === App.state.currentTrack?.id);
    let prevIndex;
    if (App.state.playMode === 'shuffle') {
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    }

    this.playTrack(queue[prevIndex]);
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
    App.state.currentTrack = track;
    this.play(track.id);
    App.addRecent(track);
    this.updateUI();
    Playlist.updateQueueUI();
  },

  // --- 添加到佇列 ---
  addToQueue(track) {
    App.state.queue.push(track);
    Playlist.updateQueueUI();
    App.toast(`已添加: ${track.title}`);
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
    if (this.isReady) this.ytPlayer.setVolume(vol * 100);
  },

  toggleMute() {
    if (!this.isReady) return;
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
    if (!this.isReady) return;
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
    const iconPlay = playBtn.querySelector('.icon-play');
    const iconPause = playBtn.querySelector('.icon-pause');

    if (App.state.isPlaying) {
      iconPlay.style.display = 'none';
      iconPause.style.display = 'block';
      playBtn.classList.add('playing');
    } else {
      iconPlay.style.display = 'block';
      iconPause.style.display = 'none';
      playBtn.classList.remove('playing');
    }

    // 更新歌曲資訊
    if (App.state.currentTrack) {
      const track = App.state.currentTrack;
      document.getElementById('track-title').textContent = track.title;
      document.getElementById('track-artist').textContent = track.artist || '未知藝術家';

      const coverEl = document.getElementById('track-cover');
      if (track.thumbnail) {
        coverEl.innerHTML = `<img src="${track.thumbnail}" alt="${track.title}">`;
        document.body.classList.add('has-album');

        // 更新專輯背景
        const albumBg = document.getElementById('album-bg');
        albumBg.style.backgroundImage = `url(${track.thumbnail})`;
      }

      // 更新頁面標題
      document.title = `${track.title} — NEONWAVE`;
    }

    // 更新播放模式圖標
    this.updatePlayModeIcon();
  },

  updatePlayModeIcon() {
    const btn = document.getElementById('btn-playmode');
    const modes = ['loop', 'shuffle', 'single'];
    const labels = ['順序播放', '隨機播放', '單曲循環'];

    const currentIndex = modes.indexOf(App.state.playMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];

    btn.title = labels[(currentIndex + 1) % modes.length];
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

// 全域 YouTube API 回調
window.onYouTubeIframeAPIReady = () => Player.onYouTubeIframeAPIReady();

// --- 初始化事件 ---
document.addEventListener('DOMContentLoaded', () => {
  // 播放按鈕
  document.getElementById('btn-play').addEventListener('click', () => Player.togglePlay());
  document.getElementById('btn-next').addEventListener('click', () => Player.next());
  document.getElementById('btn-prev').addEventListener('click', () => Player.prev());
  document.getElementById('btn-playmode').addEventListener('click', () => Player.cyclePlayMode());

  // 音量
  document.getElementById('volume-slider').addEventListener('input', (e) => {
    App.setVolume(parseFloat(e.target.value));
  });

  // 全螢幕
  document.getElementById('btn-fullscreen').addEventListener('click', () => App.toggleFullscreen());

  // 佇列
  document.getElementById('btn-mini-queue').addEventListener('click', () => {
    document.body.classList.toggle('panel-left-open');
    // 切換到佇列標籤
    document.querySelectorAll('.panel-tabs .tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.panel-tabs .tab[data-tab="queue"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    document.getElementById('tab-queue').classList.add('active');
  });

  document.getElementById('btn-shuffle-queue').addEventListener('click', () => Player.shuffleQueue());
  document.getElementById('btn-clear-queue').addEventListener('click', () => {
    Player.clearQueue();
    App.toast('佇列已清空');
  });

  // 進度條拖曳
  const progressContainer = document.querySelector('.progress-container');
  let isDragging = false;

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
          document.querySelector('.panel-tabs .tab[data-tab="playlists"]').classList.add('active');
          document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
          document.getElementById('tab-playlists').classList.add('active');
          break;
        case 'search':
          document.getElementById('search-input').focus();
          break;
        case 'visuals':
          document.body.classList.add('panel-right-open');
          break;
      }
    });
  });

  // 點讚按鈕
  document.getElementById('btn-like').addEventListener('click', () => {
    if (!App.state.currentTrack) return;
    App.toast('已收藏');
    document.getElementById('btn-like').classList.toggle('liked');
  });
});
