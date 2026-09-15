# NEONWAVE

賽博龐克霓虹音樂視覺化播放器

## 功能

- YouTube 音樂搜尋與播放
- Three.js 粒子視覺化效果
- 歌單管理（localStorage 持久化）
- 視覺控制台（粒子強度、顏色、效果開關）
- 玻璃擬態 UI 設計
- 鍵盤快捷鍵

## 使用方式

### 本地執行
直接用瀏覽器開啟 `index.html`，或使用本地伺服器：

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

## 鍵盤快捷鍵

| 按鍵 | 功能 |
|------|------|
| 空白鍵 | 播放 / 暫停 |
| ← → | 上一首 / 下一首 |
| ↑ ↓ | 音量 +/- |
| M | 靜音 |
| F | 全螢幕 |
| L | 聚焦搜尋欄 |

## 技術棧

- HTML5 / CSS3 / Vanilla JavaScript
- YouTube IFrame API
- Three.js r128
