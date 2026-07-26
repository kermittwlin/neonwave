/* ============================================
   NEONWAVE — Music Source Manager
   ============================================ */

const SourceManager = {
  currentSource: 'youtube',
  sources: {
    youtube: {
      name: 'YouTube',
      icon: '▶',
      available: true,
    },
    jamendo: {
      name: 'Jamendo (免費CC音樂)',
      icon: '♫',
      available: true,
    },
  },

  init() {
    // 從 localStorage 讀取上次使用的來源
    this.currentSource = localStorage.getItem('neonwave-source') || 'youtube';
  },

  // --- 切換來源 ---
  setSource(source) {
    if (this.sources[source]) {
      this.currentSource = source;
      localStorage.setItem('neonwave-source', source);
      console.log(`[NEONWAVE] Source changed to: ${source}`);
    }
  },

  // --- 取得目前來源 ---
  getSource() {
    return this.currentSource;
  },

  // --- 搜尋（根據目前來源）---
  async search(query, limit = 15) {
    if (this.currentSource === 'jamendo') {
      return await JamendoSource.search(query, limit);
    } else {
      // YouTube 搜尋由 Search 模組處理
      return await Search.searchYouTube(query);
    }
  },

  // --- 播放（根據來源建立 track）---
  createTrackFromSource(data, source) {
    if (source === 'jamendo') {
      return {
        id: data.id,
        title: data.title,
        artist: data.artist,
        thumbnail: data.thumbnail,
        duration: data.duration,
        source: 'jamendo',
        streamUrl: data.streamUrl,
      };
    }
    // YouTube tracks 由 Search 模組處理
    return data;
  },
};

// 初始化
document.addEventListener('DOMContentLoaded', () => SourceManager.init());
