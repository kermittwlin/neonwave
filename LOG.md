# NEONWAVE — 專案進度與開發記錄

## 專案概述
- **名稱：** NEONWAVE — Cyberpunk Music Visualizer
- **倉庫：** https://github.com/kermittwlin/neonwave
- **網址：** https://kermittwlin.github.io/neonwave/
- **技術：** Vanilla HTML/CSS/JS + Three.js + YouTube IFrame API
- **風格：** 賽博龐克霓虹（深色底 + 粉紫橘霓虹）

---

## 開發時間線

### 2026-07 — 初版建置

#### 核心功能
- [x] YouTube 搜尋播放（Data API v3）
- [x] Three.js 粒子視覺化（4 種預設效果）
- [x] 視覺控制台（強度/速度/大小/發光滑桿、色彩選擇器）
- [x] 歌單管理（建立/刪除/加入歌曲）
- [x] 佇列管理（加入/移除/隨機/清空）
- [x] 玻璃擬態 UI（glass morphism）
- [x] 啟動畫面（splash screen）
- [x] 鍵盤快捷鍵（Space/方向鍵/H/L/F/M/Escape）
- [x] 手機響應式設計 + 底部導航列
- [x] PWA 離線支援（Service Worker + manifest.json）

#### Bug 修復
- [x] 修復 CSP 頭阻擋 YouTube iframe 播放
- [x] 修復「隱藏全介面」按鈕擋住歌單面板（移至右上角）
- [x] 修復粒子效果漂移（改用 delta time）
- [x] 修復粒子加速問題（改用 clock.getDelta()）

#### 功能新增
- [x] 節奏反應式粒子（模擬低音/中音/高音）
- [x] 螢幕音訊擷取（getDisplayMedia API）
- [x] 歌詞同步顯示（LRCLIB API + LRC 解析 + 自動捲動）
- [x] 搜尋歷史（localStorage，最多 10 筆）
- [x] 歌曲交叉淡入淡出（1 秒淡出/淡入）
- [x] 邊緣提示（左：歌單，右：視覺控制台）
- [x] 視覺效果開關（掃描線/色差/溢光/網格）

### 2026-07-31 — 功能優化與 Bug 修復

#### Jamendo 整合（已移除）
- [x] 嘗試整合 Jamendo 免費 CC 音樂 API
- [x] 建立 `js/sources/jamendo.js` 和 `js/sources/index.js`
- [x] 新增來源選擇器 UI
- [x] 發現 Jamendo API 需要有效的 client_id，免費測試 ID 已停用
- [x] 決定移除 Jamendo，簡化為純 YouTube 播放器
- [x] 清理所有 Jamendo 相關程式碼

#### Bug 修復
- [x] **移除 Jamendo 後 JS 全部失效** — `index.html` 仍引用已刪除的 `jamendo.js` 和 `index.js`，導致後續所有 JS 報錯不執行
- [x] **手機面板無法關閉** — 邊緣提示只有 `add` 沒有 toggle，手機無 hover 事件
  - 邊緣提示改為 toggle 行為
  - 新增點擊面板外部區域關閉
  - 手機隱藏邊緣提示，改用底部導航列
- [x] **Home Card 點擊無效** — 點擊外部關閉邏輯誤將 home-card 的 click 事件也攔截關閉

#### 新功能
- [x] **歌詞點擊跳轉** — 點擊任意歌詞行，播放進度跳到對應時間點

#### 效能優化
- [x] **移除 GSAP** — 載入了但完全沒用到，省 60KB
- [x] **字型延遲載入** — Noto Sans SC（大 CJK 字型）改為 `media=print` 懶載入
- [x] **`escapeHtml` 統一** — 建立 `js/utils.js`，三個模組共用同一個函式

#### Bug 修復（深層）
- [x] **`Player.currentTrack` 未定義** — `next()` 和 `prev()` 引用 `this.currentTrack` 但該屬性從未設定，導致上/下一首永遠跳到 index 0。改用 `App.state.currentTrack`
- [x] **Service Worker 路徑** — `/sw.js` 改為 `./sw.js`，修復 GitHub Pages 子目錄部署失敗

#### 視覺效果改善
- [x] **網格背景** — 線條透明度從 `0.03` 提升到 `0.15`
- [x] **色差效果** — 新增 CSS `drop-shadow` 在 canvas 和標題上
- [x] **溢光效果** — 實作 `bloom-on` class，canvas 用 `brightness + blur + mix-blend-mode: screen`

---

## 已知問題與待辦

### 待修 Bug
- [ ] `updateColors()` 每幀建立 2000 個 `THREE.Color` 物件，手機可能卡頓
- [ ] 搜尋結果事件綁定有 closure bug（append 後點擊舊項目可能失效）
- [ ] `mockResults` 忽略搜尋關鍵字，無 API Key 時永遠顯示相同結果

### 待新增功能
- [ ] 💛 收藏持久化（喜歡按鈕存 localStorage）
- [ ] 🔀 歌單隨機播放
- [ ] 📱 PWA 安裝提示（手機端提示「加入主畫面」）
- [ ] 🎨 更多視覺預設
- [ ] 🌙 自動深色/淺色主題
- [ ] 📊 播放統計（播放次數/最愛歌曲排行）
- [ ] 🔗 分享功能（產生可分享的播放連結）

### 待優化
- [ ] 粒子系統效能（减少每幀物件建立）
- [ ] 事件委派（取代大量獨立事件監聽）
- [ ] 索引標籤切換邏輯重複（至少 4 處）
- [ ] 移除未使用的 CSS/JS

---

## 檔案結構

```
neonwave/
├── index.html          # 主頁面
├── manifest.json       # PWA 配置
├── sw.js               # Service Worker
├── styles/
│   ├── main.css        # 主要樣式 + 響應式
│   ├── components.css  # 額外元件樣式
│   └── animations.css  # 動畫關鍵影格
├── js/
│   ├── app.js          # 主控制器（splash/面板/彈窗/鍵盤/手機導航）
│   ├── player.js       # YouTube 播放器（播放/暫停/上/下一首/交叉淡入淡出）
│   ├── search.js       # YouTube 搜尋 + 歷史
│   ├── playlist.js     # 歌單/佇列管理
│   ├── visualizer.js   # Three.js 粒子系統（4 種預設 + 節奏反應）
│   ├── controls.js     # 視覺控制台（滑桿/色彩/開關）
│   ├── lyrics.js       # 歌詞同步（LRCLIB API + LRC 解析）
│   └── utils.js        # 共用工具函式（escapeHtml）
└── README.md
```

---

## Git 提交記錄

```
12d227a  fix: Player.currentTrack bug, SW path, lyrics click-to-seek, remove GSAP, lazy fonts, shared utils
2b73855  fix: improve grid/chromatic/bloom effects visibility, implement bloom callback
506e8c6  fix: remove stale jamendo script tags that broke all JS execution
b2241e8  fix: mobile panel closing - toggle edge hints, tap-outside close, hide hints on mobile
b71011d  fix: exclude home-card from click-outside panel close handler
26eeb70  refactor: remove Jamendo integration entirely, simplify to YouTube-only
25bfe9e  fix: disable Jamendo source (requires valid API key), show registration message
b7d7f8d  fix: move hide-all button to top-right to avoid blocking search bar
124fd52  feat: PWA support - manifest.json, service worker, offline caching
777d3d4  feat: Jamendo source integration, source selector, HTML5 Audio support
a65f679  feat: crossfade between songs with volume fade
5279f7a  feat: search history with dropdown, improved error handling
4e32c29  feat: lyrics sync - LRCLIB API, LRC parsing, auto-scroll
a2f2b22  fix: use delta time for effects to prevent acceleration
7515b9a  fix: implement glow slider - canvas filter + particle opacity
7a87eb4  feat: audio capture, repositioned hide button, edge hints for panels
c86f917  feat: add rhythm-reactive visuals with simulated beats
7176859  fix: rewrite all 4 effects - use initial positions, no more drift/flicker
```
