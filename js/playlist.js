/* ============================================
   NEONWAVE — Playlist Module
   ============================================ */

const Playlist = {
  init() {
    this.renderPlaylists();
    this.updateQueueUI();
    this.initCreatePlaylist();
    this.initAddToPlaylist();
  },

  // --- 建立歌單 ---
  initCreatePlaylist() {
    const createBtn = document.getElementById('btn-create-playlist');
    const confirmBtn = document.getElementById('btn-confirm-create');
    const nameInput = document.getElementById('playlist-name-input');

    createBtn.addEventListener('click', () => {
      App.openModal('modal-create-playlist');
      nameInput.value = '';
      nameInput.focus();
    });

    confirmBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (name) {
        this.createPlaylist(name);
        App.closeModal(document.getElementById('modal-create-playlist'));
        App.toast(`歌單「${name}」已建立`);
      }
    });

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmBtn.click();
    });
  },

  // --- 加入歌單 ---
  initAddToPlaylist() {
    // 此功能由搜尋結果和佇列項目的按鈕觸發
  },

  openAddToPlaylistModal(track) {
    if (!track) return;
    this._pendingTrack = track;

    const info = document.getElementById('add-track-info');
    info.innerHTML = `
      ${track.thumbnail ? `<img src="${track.thumbnail}" alt="">` : '<div style="width:48px;height:48px;background:var(--bg-tertiary);border-radius:6px;display:flex;align-items:center;justify-content:center">♫</div>'}
      <div>
        <div class="track-name">${this.escapeHtml(track.title)}</div>
        <div class="track-artist-name">${this.escapeHtml(track.artist || '未知')}</div>
      </div>
    `;

    const list = document.getElementById('add-playlist-list');
    if (App.state.playlists.length === 0) {
      list.innerHTML = '<div class="empty-state">尚未建立歌單<br>請先建立歌單</div>';
    } else {
      list.innerHTML = App.state.playlists.map(pl => `
        <div class="add-playlist-item" data-id="${pl.id}">
          <div class="pl-icon">♫</div>
          <div>
            <div class="pl-name">${this.escapeHtml(pl.name)}</div>
            <div class="pl-count">${pl.tracks.length} 首歌曲</div>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.add-playlist-item').forEach(item => {
        item.addEventListener('click', () => {
          const plId = item.dataset.id;
          this.addToPlaylist(plId, this._pendingTrack);
          App.closeModal(document.getElementById('modal-add-to-playlist'));
        });
      });
    }

    App.openModal('modal-add-to-playlist');
  },

  // --- CRUD ---
  createPlaylist(name) {
    const playlist = {
      id: 'pl-' + Date.now(),
      name: name,
      tracks: [],
      createdAt: new Date().toISOString(),
    };
    App.state.playlists.push(playlist);
    this.savePlaylists();
    this.renderPlaylists();
  },

  deletePlaylist(id) {
    App.state.playlists = App.state.playlists.filter(p => p.id !== id);
    this.savePlaylists();
    this.renderPlaylists();
    App.toast('歌單已刪除');
  },

  addToPlaylist(playlistId, track) {
    const playlist = App.state.playlists.find(p => p.id === playlistId);
    if (playlist && !playlist.tracks.find(t => t.id === track.id)) {
      playlist.tracks.push(track);
      this.savePlaylists();
      this.renderPlaylists();
      App.toast(`已添加到「${playlist.name}」`);
    } else if (playlist) {
      App.toast('歌曲已在歌單中');
    }
  },

  removeFromPlaylist(playlistId, trackId) {
    const playlist = App.state.playlists.find(p => p.id === playlistId);
    if (playlist) {
      playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
      this.savePlaylists();
      this.renderPlaylists();
    }
  },

  playPlaylist(playlistId) {
    const playlist = App.state.playlists.find(p => p.id === playlistId);
    if (playlist && playlist.tracks.length > 0) {
      App.state.queue = [...playlist.tracks];
      Player.playTrack(playlist.tracks[0]);
      this.updateQueueUI();
      App.toast(`正在播放「${playlist.name}」`);
    } else {
      App.toast('歌單為空');
    }
  },

  savePlaylists() {
    localStorage.setItem('neonwave-playlists', JSON.stringify(App.state.playlists));
  },

  // --- 渲染歌單列表 ---
  renderPlaylists() {
    const container = document.getElementById('playlist-list');
    const playlists = App.state.playlists;

    if (playlists.length === 0) {
      container.innerHTML = '<div class="empty-state">尚未建立歌單<br>點擊上方按鈕建立</div>';
      return;
    }

    container.innerHTML = playlists.map(pl => `
      <div class="playlist-item" data-id="${pl.id}">
        <div class="pl-icon">♫</div>
        <div class="pl-info">
          <div class="pl-name">${this.escapeHtml(pl.name)}</div>
          <div class="pl-count">${pl.tracks.length} 首歌曲</div>
        </div>
        <div class="pl-actions">
          <button class="pl-action-btn play-playlist" title="播放">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          <button class="pl-action-btn delete-playlist" title="刪除">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.playlist-item').forEach(item => {
      const id = item.dataset.id;

      item.querySelector('.play-playlist').addEventListener('click', (e) => {
        e.stopPropagation();
        this.playPlaylist(id);
      });

      item.querySelector('.delete-playlist').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('確定要刪除此歌單嗎？')) {
          this.deletePlaylist(id);
        }
      });
    });
  },

  // --- 更新佇列 UI ---
  updateQueueUI() {
    const container = document.getElementById('queue-list');
    const countEl = document.getElementById('queue-count');
    const queue = App.state.queue;

    countEl.textContent = `${queue.length} 首歌曲`;

    if (queue.length === 0) {
      container.innerHTML = '<div class="empty-state">佇列為空<br>搜尋並添加音樂開始播放</div>';
      return;
    }

    container.innerHTML = queue.map((track, index) => {
      const isActive = App.state.currentTrack?.id === track.id;
      const thumbnailHtml = track.thumbnail
        ? `<img src="${track.thumbnail}" alt="">`
        : '';

      return `
        <div class="queue-item ${isActive ? 'active' : ''}" data-index="${index}" data-id="${track.id}">
          <span class="q-num">${index + 1}</span>
          <div class="q-cover">${thumbnailHtml}</div>
          <div class="q-info">
            <div class="q-title">${this.escapeHtml(track.title)}</div>
            <div class="q-artist">${this.escapeHtml(track.artist || '未知')}</div>
          </div>
          <button class="q-add-to-pl" title="加入歌單">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
          <button class="q-remove" title="移除">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.queue-item').forEach(item => {
      const index = parseInt(item.dataset.index);

      item.addEventListener('click', (e) => {
        if (e.target.closest('.q-remove') || e.target.closest('.q-add-to-pl')) return;
        const track = queue[index];
        if (track) Player.playTrack(track);
      });

      item.querySelector('.q-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        Player.removeFromQueue(index);
      });

      item.querySelector('.q-add-to-pl').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openAddToPlaylistModal(queue[index]);
      });
    });
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};

document.addEventListener('DOMContentLoaded', () => Playlist.init());
