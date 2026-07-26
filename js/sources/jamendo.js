/* ============================================
   NEONWAVE — Jamendo Source (Free CC Music)
   ============================================ */

const JamendoSource = {
  name: 'Jamendo',
  appId: 'neonwave',  // 免費註冊取得
  isAvailable: true,

  // --- 搜尋音樂 ---
  async search(query, limit = 15) {
    if (!this.isAvailable) return { tracks: [], nextPageToken: '' };

    try {
      const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${this.appId}&format=json&limit=${limit}&search=${encodeURIComponent(query)}&include=musicinfo&audioformat=mp32`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Jamendo API error: ${res.status}`);

      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        return { tracks: [], nextPageToken: '' };
      }

      const tracks = data.results.map(track => ({
        id: `jamendo_${track.id}`,
        title: track.name,
        artist: track.artist_name,
        thumbnail: track.image || track.album_image || '',
        duration: this.formatDuration(track.duration),
        durationSec: track.duration,
        source: 'jamendo',
        streamUrl: track.audio,  // 直接串流 URL
        album: track.album_name,
        license: track.license_ccurl,
      }));

      return { tracks, nextPageToken: '' };

    } catch (err) {
      console.error('[NEONWAVE] Jamendo search error:', err);
      return { tracks: [], nextPageToken: '' };
    }
  },

  // --- 取得隨機音樂 ---
  async getRandom(limit = 20) {
    try {
      const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${this.appId}&format=json&limit=${limit}&order=popularity_total&include=musicinfo&audioformat=mp32`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      return (data.results || []).map(track => ({
        id: `jamendo_${track.id}`,
        title: track.name,
        artist: track.artist_name,
        thumbnail: track.image || track.album_image || '',
        duration: this.formatDuration(track.duration),
        durationSec: track.duration,
        source: 'jamendo',
        streamUrl: track.audio,
        album: track.album_name,
      }));
    } catch (err) {
      console.error('[NEONWAVE] Jamendo random error:', err);
      return [];
    }
  },

  // --- 格式化時間 ---
  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
};

// 匯出
if (typeof module !== 'undefined') module.exports = JamendoSource;
