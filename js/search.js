/* ============================================
   NEONWAVE — Search Module (YouTube API)
   ============================================ */

const Search = {
  isOpen: false,
  lastQuery: '',
  isLoading: false,
  apiKey: localStorage.getItem('neonwave-yt-apikey') || 'AIzaSyAk69vBCPQPZpHX1SQd_rK4rwe8MAn21No',
  nextPageToken: '',
  currentQuery: '',

  init() {
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    const clearBtn = document.getElementById('search-clear');
    const submitBtn = document.getElementById('search-submit');

    // 搜尋輸入
    input.addEventListener('input', () => {
      clearBtn.style.display = input.value ? 'flex' : 'none';
      if (input.value.length >= 2) {
        this.debounceSearch(input.value);
      } else if (input.value.length === 0) {
        results.classList.remove('visible');
      }
    });

    // 清除按鈕
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      results.classList.remove('visible');
      input.focus();
    });

    // 提交搜尋
    submitBtn.addEventListener('click', () => this.search(input.value));

    // Enter 搜尋
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.search(input.value);
      }
      if (e.key === 'Escape') {
        input.blur();
        results.classList.remove('visible');
      }
    });

    // 點擊外部關閉結果
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#search-area')) {
        results.classList.remove('visible');
      }
    });

    // 如果沒有 API Key，顯示設定提示
    if (!this.apiKey) {
      this.showApiKeySetup();
    }
  },

  // --- API Key 設定 ---
  showApiKeySetup() {
    console.log('[NEONWAVE] YouTube API Key 未設定');
    console.log('[NEONWAVE] 請前往以下步驟取得 API Key:');
    console.log('1. 前往 https://console.cloud.google.com/');
    console.log('2. 建立或選擇專案');
    console.log('3. 啟用 YouTube Data API v3');
    console.log('4. 建立 API Key');
    console.log('5. 在瀏覽器主控台執行: Search.setApiKey("YOUR_API_KEY")');
  },

  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('neonwave-yt-apikey', key);
    console.log('[NEONWAVE] YouTube API Key 已儲存');
    App.toast('YouTube API Key 已設定');
  },

  // --- 防抖搜尋 ---
  searchTimeout: null,
  debounceSearch(query) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.search(query), 500);
  },

  // --- 執行搜尋 ---
  async search(query, loadMore = false) {
    if (!query || query.length < 2) return;
    if (this.isLoading) return;

    // 檢查是否為 YouTube URL
    const videoId = this.extractYouTubeId(query);
    if (videoId) {
      this.handleYouTubeUrl(videoId);
      return;
    }

    this.isLoading = true;
    this.currentQuery = query;
    const results = document.getElementById('search-results');

    if (!loadMore) {
      results.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><br>搜尋中...</div>';
      results.classList.add('visible');
      this.nextPageToken = '';
    }

    try {
      const data = await this.searchYouTube(query, loadMore);
      if (loadMore) {
        this.appendResults(data.tracks);
      } else {
        this.displayResults(data.tracks);
      }
      this.nextPageToken = data.nextPageToken;
    } catch (error) {
      console.error('[Search] Error:', error);
      if (!loadMore) {
        results.innerHTML = '<div class="empty-state">搜尋失敗，請確認 API Key 設定正確</div>';
      }
    } finally {
      this.isLoading = false;
    }
  },

  // --- 提取 YouTube URL 中的 Video ID ---
  extractYouTubeId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  },

  // --- 處理 YouTube URL ---
  handleYouTubeUrl(videoId) {
    const track = {
      id: videoId,
      title: 'YouTube Video',
      artist: '',
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      duration: '',
      source: 'YouTube',
    };

    Player.addToQueue(track);
    Player.playTrack(track);
    document.getElementById('search-results').classList.remove('visible');
    document.getElementById('search-input').value = '';
    document.getElementById('search-clear').style.display = 'none';
  },

  // --- YouTube Data API v3 搜尋 ---
  async searchYouTube(query, loadMore = false) {
    // 如果沒有 API Key，使用模擬數據
    if (!this.apiKey) {
      return this.getMockResults(query);
    }

    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=15&key=${this.apiKey}`;

    if (loadMore && this.nextPageToken) {
      url += `&pageToken=${this.nextPageToken}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    // 過濾出影片結果（排除頻道和播放清單）
    const videoItems = data.items.filter(item => item.id.kind === 'youtube#video');

    if (videoItems.length === 0) {
      return { tracks: [], nextPageToken: '' };
    }

    // 獲取影片詳細資訊（包括長度）
    const videoIds = videoItems.map(item => item.id.videoId).join(',');
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${this.apiKey}`;
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    // 合併資料
    const tracks = detailsData.items.map(item => ({
      id: item.id,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      duration: this.formatDuration(item.contentDetails.duration),
      source: 'YouTube',
    }));

    return {
      tracks,
      nextPageToken: data.nextPageToken || '',
    };
  },

  // --- ISO 8601 時間格式轉換 ---
  formatDuration(iso8601) {
    if (!iso8601) return '';

    const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },

  // --- 模擬搜尋結果（無 API Key 時使用） ---
  getMockResults(query) {
    const realVideos = [
      { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', artist: 'Rick Astley', duration: '3:33' },
      { id: '9bZkp7q19f0', title: 'PSY - GANGNAM STYLE(강남스타일)', artist: 'PSY', duration: '4:13' },
      { id: 'kJQP7kiw5Fk', title: 'Luis Fonsi - Despacito ft. Daddy Yankee', artist: 'Luis Fonsi', duration: '4:22' },
      { id: 'JGwWNGJdvx8', title: 'Ed Sheeran - Shape of You', artist: 'Ed Sheeran', duration: '4:24' },
      { id: 'RgKAFK5djSk', title: 'Wiz Khalifa - See You Again ft. Charlie Puth', artist: 'Wiz Khalifa', duration: '3:58' },
      { id: 'fJ9rUzIMcZQ', title: 'Queen - Bohemian Rhapsody', artist: 'Queen', duration: '5:55' },
      { id: '60ItHLz5WEA', title: 'Alan Walker - Faded', artist: 'Alan Walker', duration: '3:32' },
      { id: 'JwXju5zIZV4', title: 'Maroon 5 - Sugar', artist: 'Maroon 5', duration: '3:55' },
      { id: 'CevxZvSJLk8', title: 'Katy Perry - Roar', artist: 'Katy Perry', duration: '3:43' },
      { id: 'OPf0YbXqDm0', title: 'Mark Ronson - Uptown Funk ft. Bruno Mars', artist: 'Bruno Mars', duration: '4:30' },
    ];

    // 根據搜尋關鍵字簡單篩選，否則返回前 5 首
    const tracks = realVideos.slice(0, 5).map(v => ({
      id: v.id,
      title: v.title,
      artist: v.artist,
      thumbnail: `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
      duration: v.duration,
      source: 'YouTube',
    }));

    return new Promise(resolve => {
      setTimeout(() => resolve({ tracks, nextPageToken: '' }), 600);
    });
  },

  // --- 顯示搜尋結果 ---
  displayResults(tracks) {
    const results = document.getElementById('search-results');

    if (!tracks || tracks.length === 0) {
      results.innerHTML = '<div class="empty-state">找不到相關音樂</div>';
      return;
    }

    let html = tracks.map(track => this.createResultItem(track)).join('');

    // 載入更多按鈕
    if (this.nextPageToken) {
      html += `
        <div class="load-more-container">
          <button class="btn-ghost load-more-btn" id="load-more-btn">載入更多</button>
        </div>
      `;
    }

    results.innerHTML = html;

    // 綁定事件
    this.bindResultEvents(tracks);

    // 載入更多按鈕
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => this.search(this.currentQuery, true));
    }
  },

  // --- 附加搜尋結果（載入更多） ---
  appendResults(tracks) {
    const results = document.getElementById('search-results');
    const loadMoreContainer = results.querySelector('.load-more-container');

    if (loadMoreContainer) {
      loadMoreContainer.remove();
    }

    const html = tracks.map(track => this.createResultItem(track)).join('');
    results.insertAdjacentHTML('beforeend', html);

    // 重新綁定新項目
    this.bindResultEvents(tracks, true);

    // 重新加入載入更多按鈕
    if (this.nextPageToken) {
      results.insertAdjacentHTML('beforeend', `
        <div class="load-more-container">
          <button class="btn-ghost load-more-btn" id="load-more-btn">載入更多</button>
        </div>
      `);
      document.getElementById('load-more-btn').addEventListener('click', () => this.search(this.currentQuery, true));
    }
  },

  // --- 綁定結果事件 ---
  bindResultEvents(tracks, append = false) {
    const results = document.getElementById('search-results');
    const items = results.querySelectorAll('.search-result-item');

    items.forEach(item => {
      // 如果是附加的，跳過已綁定的
      if (append && item.dataset.bound) return;
      item.dataset.bound = 'true';

      item.addEventListener('click', (e) => {
        if (e.target.closest('.result-add')) return;
        const trackId = item.dataset.id;
        const track = tracks.find(t => t.id === trackId);
        if (track) {
          Player.addToQueue(track);
          Player.playTrack(track);
          results.classList.remove('visible');
        }
      });
    });

    results.querySelectorAll('.result-add').forEach(btn => {
      if (append && btn.dataset.bound) return;
      btn.dataset.bound = 'true';

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trackId = btn.closest('.search-result-item').dataset.id;
        const track = tracks.find(t => t.id === trackId);
        if (track) {
          Player.addToQueue(track);
        }
      });
    });
  },

  // --- 建立結果項目 HTML ---
  createResultItem(track) {
    const thumbnailHtml = track.thumbnail
      ? `<img src="${track.thumbnail}" alt="${track.title}" loading="lazy">`
      : `<div class="cover-placeholder">♫</div>`;

    return `
      <div class="search-result-item" data-id="${track.id}">
        <div class="result-cover">${thumbnailHtml}</div>
        <div class="result-info">
          <div class="result-title">${this.escapeHtml(track.title)}</div>
          <div class="result-artist">${this.escapeHtml(track.artist || '未知')}</div>
        </div>
        <div class="result-duration">${track.duration || ''}</div>
        <button class="result-add" title="加入佇列">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>
    `;
  },

  // --- HTML 轉義 ---
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};

// 初始化搜尋
document.addEventListener('DOMContentLoaded', () => Search.init());
