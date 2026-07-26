/* ============================================
   NEONWAVE — Lyrics Module (LRCLIB API)
   ============================================ */

const Lyrics = {
  currentTrack: null,
  lines: [],
  activeIndex: -1,
  isVisible: false,
  updateInterval: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // 歌詞按鈕
    document.getElementById('btn-lyrics')?.addEventListener('click', () => this.toggle());
    document.getElementById('btn-close-lyrics')?.addEventListener('click', () => this.hide());
  },

  // --- 切換歌詞顯示 ---
  toggle() {
    this.isVisible = !this.isVisible;
    const display = document.getElementById('lyrics-display');
    if (display) {
      display.classList.toggle('lyrics-hidden', !this.isVisible);
    }

    if (this.isVisible) {
      this.startUpdate();
    } else {
      this.stopUpdate();
    }
  },

  show() {
    this.isVisible = true;
    document.getElementById('lyrics-display')?.classList.remove('lyrics-hidden');
    this.startUpdate();
  },

  hide() {
    this.isVisible = false;
    document.getElementById('lyrics-display')?.classList.add('lyrics-hidden');
    this.stopUpdate();
  },

  // --- 當歌曲變更時抓取歌詞 ---
  async loadForTrack(track) {
    if (!track) return;

    // 同一首歌不重複抓
    if (this.currentTrack?.id === track.id) return;

    this.currentTrack = track;
    this.lines = [];
    this.activeIndex = -1;
    this.renderPlaceholder('搜尋歌詞中...');

    try {
      const lyrics = await this.fetchLyrics(track);
      if (lyrics) {
        this.lines = this.parseLRC(lyrics);
        this.render();
        console.log(`[NEONWAVE] Lyrics loaded: ${this.lines.length} lines`);
      } else {
        this.renderPlaceholder('暫無歌詞');
      }
    } catch (err) {
      console.warn('[NEONWAVE] Lyrics fetch failed:', err);
      this.renderPlaceholder('暫無歌詞');
    }
  },

  // --- 從 LRCLIB API 抓取歌詞 ---
  async fetchLyrics(track) {
    const artist = track.artist || '';
    const title = track.title || '';
    const duration = Player.getDuration() || 0;

    // 方法1：用 artist + track + duration 搜尋
    if (artist && title) {
      try {
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}&duration=${Math.floor(duration)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.syncedLyrics) return data.syncedLyrics;
          if (data.plainLyrics) return data.plainLyrics;
        }
      } catch (e) {
        // 繼續嘗試其他方法
      }
    }

    // 方法2：用 artist + track 搜尋（無 duration）
    if (artist && title) {
      try {
        const url = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}&limit=5`;
        const res = await fetch(url);
        if (res.ok) {
          const results = await res.json();
          // 找最接近的結果
          for (const result of results) {
            if (result.syncedLyrics) return result.syncedLyrics;
            if (result.plainLyrics) return result.plainLyrics;
          }
        }
      } catch (e) {
        // 繼續
      }
    }

    return null;
  },

  // --- 解析 LRC 格式 ---
  parseLRC(lrcText) {
    if (!lrcText) return [];

    const lines = [];
    const lrcLines = lrcText.split('\n');

    for (const line of lrcLines) {
      // 匹配 [mm:ss.xx] 或 [mm:ss.xxx] 或 [mm:ss]
      const match = line.match(/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g);
      if (match) {
        const text = line.replace(/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g, '').trim();
        if (!text) continue;

        for (const tag of match) {
          const timeMatch = tag.match(/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/);
          if (timeMatch) {
            const minutes = parseInt(timeMatch[1], 10);
            const seconds = parseInt(timeMatch[2], 10);
            const ms = timeMatch[3] ? parseInt(timeMatch[3].padEnd(3, '0'), 10) : 0;
            const time = minutes * 60 + seconds + ms / 1000;
            lines.push({ time, text });
          }
        }
      }
    }

    // 按時間排序
    lines.sort((a, b) => a.time - b.time);
    return lines;
  },

  // --- 渲染歌詞 ---
  render() {
    const container = document.getElementById('lyrics-content');
    if (!container) return;

    if (this.lines.length === 0) {
      this.renderPlaceholder('暫無歌詞');
      return;
    }

    container.innerHTML = this.lines.map((line, i) =>
      `<div class="lyrics-line" data-index="${i}">${this.escapeHtml(line.text)}</div>`
    ).join('');
  },

  renderPlaceholder(text) {
    const container = document.getElementById('lyrics-content');
    if (container) {
      container.innerHTML = `<div class="lyrics-placeholder">${text}</div>`;
    }
  },

  // --- 更新目前播放的歌詞行 ---
  startUpdate() {
    this.stopUpdate();
    this.updateInterval = setInterval(() => this.updateActiveLine(), 100);
  },

  stopUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  },

  updateActiveLine() {
    if (this.lines.length === 0) return;

    const currentTime = Player.getCurrentTime();
    let newIndex = -1;

    // 找到目前時間對應的歌詞行
    for (let i = this.lines.length - 1; i >= 0; i--) {
      if (currentTime >= this.lines[i].time) {
        newIndex = i;
        break;
      }
    }

    // 如果行數改變，更新 UI
    if (newIndex !== this.activeIndex) {
      this.activeIndex = newIndex;
      this.highlightLine(newIndex);
    }
  },

  highlightLine(index) {
    const container = document.getElementById('lyrics-content');
    if (!container) return;

    const lines = container.querySelectorAll('.lyrics-line');
    lines.forEach((line, i) => {
      line.classList.toggle('active', i === index);
    });

    // 捲動到目前行
    if (index >= 0 && lines[index]) {
      lines[index].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};

// 初始化
document.addEventListener('DOMContentLoaded', () => Lyrics.init());
