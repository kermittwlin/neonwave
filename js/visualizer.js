/* ============================================
   NEONWAVE — Three.js Visualizer with Beat Detection
   ============================================ */

const Visualizer = {
  scene: null,
  camera: null,
  renderer: null,
  particles: null,
  geometry: null,
  material: null,
  clock: null,
  presets: {},
  currentPreset: 'neonSpiral',

  // 音訊分析
  audioContext: null,
  analyser: null,
  dataArray: null,
  beatDetector: {
    threshold: 0.15,
    decay: 0.98,
    energy: 0,
    lastBeat: 0,
    bpm: 0,
    isBeat: false,
    beatIntensity: 0,
  },

  // 節奏資料
  rhythm: {
    bass: 0,
    mid: 0,
    treble: 0,
    overall: 0,
    isPlaying: false,
  },

  config: {
    particleCount: 2000,
    intensity: 1,
    speed: 1,
    size: 1,
    glow: 1,
    colorPrimary: '#FF2D7B',
    colorSecondary: '#B026FF',
    colorBg: '#0A0A0F',
    beatReactive: true,
    effects: {
      scanlines: false,
      chromatic: false,
      bloom: true,
      grid: true,
    },
  },

  init() {
    const canvas = document.getElementById('visualizer-canvas');
    if (!canvas) return;

    // 場景
    this.scene = new THREE.Scene();

    // 相機
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 50;

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 時鐘
    this.clock = new THREE.Clock();

    // 初始化音訊分析
    this.initAudio();

    // 初始化預設
    this.initPresets();

    // 建立粒子
    this.createParticles(this.currentPreset);

    // 事件
    window.addEventListener('resize', () => this.onResize());

    // 監聽播放狀態
    this.startPlaybackMonitor();

    // 開始渲染
    this.animate();
  },

  // --- 音訊分析初始化 ---
  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      console.log('[NEONWAVE] Audio analyzer initialized');
    } catch (e) {
      console.warn('[NEONWAVE] Web Audio API not supported, using simulated beats');
    }
  },

  // --- 監聽播放狀態 ---
  startPlaybackMonitor() {
    setInterval(() => {
      this.rhythm.isPlaying = App?.state?.isPlaying || false;
      if (this.rhythm.isPlaying && this.analyser) {
        this.analyzeAudio();
      } else {
        this.simulateBeats();
      }
    }, 50);
  },

  // --- 分析音訊 ---
  analyzeAudio() {
    if (!this.analyser || !this.dataArray) return;

    try {
      this.analyser.getByteFrequencyData(this.dataArray);

      // 計算頻段能量
      const bufferLength = this.dataArray.length;
      let bassSum = 0, midSum = 0, trebleSum = 0;

      for (let i = 0; i < bufferLength; i++) {
        const value = this.dataArray[i] / 255;
        if (i < bufferLength * 0.15) {
          bassSum += value;
        } else if (i < bufferLength * 0.5) {
          midSum += value;
        } else {
          trebleSum += value;
        }
      }

      this.rhythm.bass = bassSum / (bufferLength * 0.15);
      this.rhythm.mid = midSum / (bufferLength * 0.35);
      this.rhythm.treble = trebleSum / (bufferLength * 0.5);
      this.rhythm.overall = (this.rhythm.bass + this.rhythm.mid + this.rhythm.treble) / 3;

      // 節拍檢測
      this.detectBeat();

    } catch (e) {
      this.simulateBeats();
    }
  },

  // --- 節拍檢測 ---
  detectBeat() {
    const now = performance.now();
    const energy = this.rhythm.bass;

    // 更新能量
    this.beatDetector.energy = this.beatDetector.energy * this.beatDetector.decay + energy * (1 - this.beatDetector.decay);

    // 檢測節拍
    if (energy > this.beatDetector.energy * 1.5 && energy > this.beatDetector.threshold) {
      if (now - this.beatDetector.lastBeat > 200) {
        this.beatDetector.isBeat = true;
        this.beatDetector.beatIntensity = Math.min(1, energy * 2);
        this.beatDetector.lastBeat = now;
      }
    } else {
      this.beatDetector.isBeat = false;
      this.beatDetector.beatIntensity *= 0.9;
    }
  },

  // --- 模擬節拍（無音訊時） ---
  simulateBeats() {
    const now = performance.now();
    const time = now / 1000;

    // 使用多個正弦波組合模擬音樂節奏
    const wave1 = Math.sin(time * 2.1) * 0.5 + 0.5;
    const wave2 = Math.sin(time * 3.7) * 0.3 + 0.3;
    const wave3 = Math.sin(time * 5.3) * 0.2 + 0.2;
    const combined = (wave1 + wave2 + wave3) / 3;

    this.rhythm.bass = combined;
    this.rhythm.mid = combined * 0.8;
    this.rhythm.treble = combined * 0.6;
    this.rhythm.overall = combined * 0.7;

    // 模擬節拍
    const beatPhase = (time * 2.2) % 1;
    if (beatPhase < 0.1) {
      this.beatDetector.isBeat = true;
      this.beatDetector.beatIntensity = 0.8 + Math.random() * 0.2;
    } else {
      this.beatDetector.isBeat = false;
      this.beatDetector.beatIntensity *= 0.92;
    }
  },

  // --- 粒子系統 ---
  createParticles(preset) {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.geometry.dispose();
      this.material.dispose();
    }

    const count = this.config.particleCount;
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    // 儲存初始位置（供星雲漩渦等效果使用）
    this.initialPositions = new Float32Array(count * 3);

    const color1 = new THREE.Color(this.config.colorPrimary);
    const color2 = new THREE.Color(this.config.colorSecondary);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const pos = this.getInitialPosition(preset, i, count);
      positions[i3] = pos.x;
      positions[i3 + 1] = pos.y;
      positions[i3 + 2] = pos.z;

      // 記錄初始位置
      this.initialPositions[i3] = pos.x;
      this.initialPositions[i3 + 1] = pos.y;
      this.initialPositions[i3 + 2] = pos.z;

      const mixRatio = Math.random();
      const color = color1.clone().lerp(color2, mixRatio);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = Math.random() * 2 + 0.5;

      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.userData = { velocities };

    this.material = new THREE.PointsMaterial({
      size: 0.5 * this.config.size,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);
  },

  getInitialPosition(preset, i, count) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = Math.random() * 40 + 10;

    switch (preset) {
      case 'neonSpiral':
        return {
          x: radius * Math.sin(phi) * Math.cos(theta + i * 0.01),
          y: radius * Math.sin(phi) * Math.sin(theta + i * 0.01),
          z: (i / count) * 80 - 40,
        };

      case 'matrixRain':
        return {
          x: (Math.random() - 0.5) * 80,
          y: Math.random() * 100 - 50,
          z: (Math.random() - 0.5) * 20,
        };

      case 'nebulaSwirl':
        return {
          x: radius * Math.cos(theta) * 0.5,
          y: radius * Math.sin(theta) * 0.5,
          z: (Math.random() - 0.5) * 30,
        };

      case 'particleStorm':
      default:
        return {
          x: (Math.random() - 0.5) * 80,
          y: (Math.random() - 0.5) * 80,
          z: (Math.random() - 0.5) * 40,
        };
    }
  },

  // --- 預設效果 ---
  initPresets() {
    this.presets = {
      neonSpiral: { name: '霓虹螺旋', update: (t) => this.updateSpiral(t) },
      matrixRain: { name: '矩陣雨', update: (t) => this.updateMatrixRain(t) },
      nebulaSwirl: { name: '星雲漩渦', update: (t) => this.updateNebula(t) },
      particleStorm: { name: '粒子風暴', update: (t) => this.updateStorm(t) },
    };

    const grid = document.getElementById('preset-grid');
    if (grid) {
      grid.innerHTML = Object.entries(this.presets).map(([key, preset]) => `
        <div class="preset-item ${key === this.currentPreset ? 'active' : ''}" data-preset="${key}">
          <div class="preset-name">${preset.name}</div>
        </div>
      `).join('');

      grid.querySelectorAll('.preset-item').forEach(item => {
        item.addEventListener('click', () => {
          grid.querySelectorAll('.preset-item').forEach(p => p.classList.remove('active'));
          item.classList.add('active');
          this.currentPreset = item.dataset.preset;
          this.createParticles(this.currentPreset);
        });
      });
    }
  },

  // --- 動畫更新 ---
  animate() {
    requestAnimationFrame(() => this.animate());

    const elapsed = this.clock.getElapsedTime();

    if (this.particles) {
      // 節奏數據
      const bass = this.rhythm.bass;
      const beat = this.beatDetector.beatIntensity;
      const isBeat = this.beatDetector.isBeat;

      // 執行當前預設的更新（傳入原始時間，各預設自行乘以 speed）
      const preset = this.presets[this.currentPreset];
      if (preset && preset.update) {
        preset.update(elapsed);
      }

      // 節奏反應：粒子大小
      if (this.config.beatReactive) {
        const baseSize = 0.5 * this.config.size;
        const beatSize = isBeat ? baseSize * (1 + beat * 0.8) : baseSize;
        this.material.size = beatSize;

        // 節奏反應：透明度
        this.material.opacity = 0.6 + bass * 0.4;

        // 節奏反應：相機晃動
        if (isBeat) {
          this.camera.position.x += (Math.random() - 0.5) * beat * 0.5;
          this.camera.position.y += (Math.random() - 0.5) * beat * 0.5;
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  },

  // --- 預設更新函數（加入節奏反應） ---
  updateSpiral(t) {
    const positions = this.geometry.attributes.position.array;
    const count = this.config.particleCount;
    const bass = this.rhythm.bass;
    const beat = this.beatDetector.beatIntensity;
    const speed = this.config.speed;
    const intensity = this.config.intensity;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const ratio = i / count;

      const moveSpeed = speed * intensity * (1 + bass * 0.5);
      positions[i3] += Math.sin(t * speed + ratio * 10) * 0.02 * moveSpeed;
      positions[i3 + 1] += Math.cos(t * speed + ratio * 10) * 0.02 * moveSpeed;
      positions[i3 + 2] += Math.sin(t * speed * 0.5 + ratio * 5) * 0.01 * moveSpeed;

      if (this.config.beatReactive && beat > 0.3) {
        const dist = Math.sqrt(positions[i3] ** 2 + positions[i3 + 1] ** 2);
        const push = beat * 0.3 * (1 - dist / 50);
        positions[i3] += (positions[i3] / (dist || 1)) * push;
        positions[i3 + 1] += (positions[i3 + 1] / (dist || 1)) * push;
      }

      if (positions[i3] > 50) positions[i3] = -50;
      if (positions[i3] < -50) positions[i3] = 50;
      if (positions[i3 + 1] > 50) positions[i3 + 1] = -50;
      if (positions[i3 + 1] < -50) positions[i3 + 1] = 50;
    }

    this.geometry.attributes.position.needsUpdate = true;

    const camSpeed = 0.1 + bass * 0.05;
    this.camera.position.x = Math.sin(t * speed * camSpeed) * 10;
    this.camera.position.y = Math.cos(t * speed * camSpeed) * 10;
    this.camera.lookAt(0, 0, 0);
  },

  updateMatrixRain(t) {
    const positions = this.geometry.attributes.position.array;
    const count = this.config.particleCount;
    const bass = this.rhythm.bass;
    const speed = this.config.speed;
    const intensity = this.config.intensity;

    const fallSpeed = (0.3 + bass * 0.4) * speed * intensity;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      positions[i3 + 1] -= fallSpeed;

      if (this.beatDetector.isBeat && Math.random() > 0.8) {
        positions[i3 + 1] -= 5 * speed;
      }

      if (positions[i3 + 1] < -50) {
        positions[i3 + 1] = 50;
        positions[i3] = (Math.random() - 0.5) * 80;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;

    this.camera.position.x = 0;
    this.camera.position.y = 0;
    this.camera.position.z = 50;
    this.camera.lookAt(0, 0, 0);
  },

  updateNebula(t) {
    const positions = this.geometry.attributes.position.array;
    const initPos = this.initialPositions;
    const count = this.config.particleCount;
    const beat = this.beatDetector.beatIntensity;
    const intensity = this.config.intensity;
    const speed = this.config.speed;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const initX = initPos[i3];
      const initY = initPos[i3 + 1];
      const initAngle = Math.atan2(initY, initX);
      const initRadius = Math.sqrt(initX * initX + initY * initY);

      // 差異旋轉：內圈快、外圈慢
      const speedFactor = 1 / (1 + initRadius * 0.03);
      const newAngle = initAngle + t * speed * 0.02 * speedFactor * intensity;

      // 呼吸效果
      const breatheAmt = (1 - initRadius / 50) * 0.15 + beat * 0.1;
      const finalRadius = initRadius * (1 + Math.sin(t * speed * 0.8) * breatheAmt);

      positions[i3] = finalRadius * Math.cos(newAngle);
      positions[i3 + 1] = finalRadius * Math.sin(newAngle);
      positions[i3 + 2] = initPos[i3 + 2] * 0.5 + Math.sin(t * speed * 0.4 + initAngle * 2) * 5;
    }

    this.geometry.attributes.position.needsUpdate = true;

    this.camera.position.x = 0;
    this.camera.position.y = 0;
    this.camera.position.z = 60;
    this.camera.lookAt(0, 0, 0);
  },

  updateStorm(t) {
    const positions = this.geometry.attributes.position.array;
    const count = this.config.particleCount;
    const treble = this.rhythm.treble;
    const beat = this.beatDetector.beatIntensity;
    const speed = this.config.speed;
    const intensity = this.config.intensity;

    const chaos = (0.1 + treble * 0.15) * speed * intensity;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      positions[i3] += (Math.random() - 0.5) * chaos;
      positions[i3 + 1] += (Math.random() - 0.5) * chaos;
      positions[i3 + 2] += (Math.random() - 0.5) * chaos * 0.5;

      if (this.beatDetector.isBeat && Math.random() > 0.7) {
        positions[i3] += (Math.random() - 0.5) * beat * 10;
        positions[i3 + 1] += (Math.random() - 0.5) * beat * 10;
        positions[i3 + 2] += (Math.random() - 0.5) * beat * 5;
      }

      if (Math.abs(positions[i3]) > 50) positions[i3] *= -0.9;
      if (Math.abs(positions[i3 + 1]) > 50) positions[i3 + 1] *= -0.9;
      if (Math.abs(positions[i3 + 2]) > 30) positions[i3 + 2] *= -0.9;
    }

    this.geometry.attributes.position.needsUpdate = true;

    this.camera.position.x = Math.sin(t * speed * 2) * 3 * (1 + beat);
    this.camera.position.y = Math.cos(t * speed * 1.5) * 3 * (1 + beat);
    this.camera.position.z = 50;
    this.camera.lookAt(0, 0, 0);
  },

  // --- 更新顏色 ---
  updateColors() {
    if (!this.geometry) return;

    const colors = this.geometry.attributes.color.array;
    const color1 = new THREE.Color(this.config.colorPrimary);
    const color2 = new THREE.Color(this.config.colorSecondary);
    const count = this.config.particleCount;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const mixRatio = (colors[i3] + colors[i3 + 1] + colors[i3 + 2]) / 3;
      const color = color1.clone().lerp(color2, mixRatio);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    this.geometry.attributes.color.needsUpdate = true;
  },

  // --- 視窗大小 ---
  onResize() {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  // --- 更新配置 ---
  updateConfig(key, value) {
    if (key.startsWith('color')) {
      this.config[key] = value;
      this.updateColors();
    } else {
      this.config[key] = value;
    }
  },

  // --- 獲取節奏資料（供其他模組使用） ---
  getRhythm() {
    return {
      bass: this.rhythm.bass,
      mid: this.rhythm.mid,
      treble: this.rhythm.treble,
      overall: this.rhythm.overall,
      isBeat: this.beatDetector.isBeat,
      beatIntensity: this.beatDetector.beatIntensity,
    };
  },
};

// 初始化視覺化
document.addEventListener('DOMContentLoaded', () => {
  if (typeof THREE !== 'undefined') {
    Visualizer.init();
  } else {
    console.warn('[NEONWAVE] Three.js not loaded');
  }
});
