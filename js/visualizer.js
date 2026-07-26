/* ============================================
   NEONWAVE — Three.js Visualizer Module
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
  currentPreset: 'nebulaSwirl',
  initialPositions: null,

  // 節奏數據
  rhythm: {
    bass: 0,
    mid: 0,
    treble: 0,
  },

  // 音訊擷取
  audioCapture: {
    active: false,
    audioContext: null,
    analyser: null,
    dataArray: null,
    source: null,
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

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 50;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.clock = new THREE.Clock();
    this.initPresets();
    this.createParticles(this.currentPreset);

    window.addEventListener('resize', () => this.onResize());
    this.animate();
  },

  // --- 節奏更新 ---
  updateRhythm(t) {
    if (this.audioCapture.active && this.audioCapture.analyser) {
      this.analyzeAudio();
    } else {
      const wave1 = Math.sin(t * 2.1) * 0.5 + 0.5;
      const wave2 = Math.sin(t * 3.7) * 0.3 + 0.3;
      const wave3 = Math.sin(t * 5.3) * 0.2 + 0.2;

      this.rhythm.bass = wave1;
      this.rhythm.mid = wave2;
      this.rhythm.treble = wave3;
    }
  },

  // --- 分析真實音訊 ---
  analyzeAudio() {
    const { analyser, dataArray } = this.audioCapture;
    if (!analyser || !dataArray) return;

    analyser.getByteFrequencyData(dataArray);

    const len = dataArray.length;
    let bassSum = 0, midSum = 0, trebleSum = 0;

    for (let i = 0; i < len; i++) {
      const val = dataArray[i] / 255;
      if (i < len * 0.15) {
        bassSum += val;
      } else if (i < len * 0.5) {
        midSum += val;
      } else {
        trebleSum += val;
      }
    }

    this.rhythm.bass = bassSum / (len * 0.15);
    this.rhythm.mid = midSum / (len * 0.35);
    this.rhythm.treble = trebleSum / (len * 0.5);
  },

  // --- 啟動音訊擷取 ---
  async startAudioCapture() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: true,
      });

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);

      this.audioCapture = {
        active: true,
        audioContext,
        analyser,
        dataArray: new Uint8Array(analyser.frequencyBinCount),
        source,
        stream,
      };

      stream.getAudioTracks()[0].onended = () => this.stopAudioCapture();

      App.toast('音訊感應已啟動');
      this.updateCaptureBtn(true);
      console.log('[NEONWAVE] Audio capture started');

    } catch (err) {
      console.warn('[NEONWAVE] Audio capture failed:', err);
      App.toast('音訊擷取被取消或不支援');
    }
  },

  // --- 停止音訊擷取 ---
  stopAudioCapture() {
    if (this.audioCapture.stream) {
      this.audioCapture.stream.getTracks().forEach(t => t.stop());
    }
    if (this.audioCapture.audioContext) {
      this.audioCapture.audioContext.close();
    }
    this.audioCapture = {
      active: false,
      audioContext: null,
      analyser: null,
      dataArray: null,
      source: null,
    };
    App.toast('音訊感應已關閉');
    this.updateCaptureBtn(false);
  },

  // --- 切換音訊擷取 ---
  toggleAudioCapture() {
    if (this.audioCapture.active) {
      this.stopAudioCapture();
    } else {
      this.startAudioCapture();
    }
  },

  // --- 更新擷取按鈕狀態 ---
  updateCaptureBtn(active) {
    const btn = document.getElementById('btn-audio-capture');
    if (btn) {
      btn.classList.toggle('active', active);
      btn.title = active ? '關閉音訊感應' : '啟動音訊感應';
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

    this.initialPositions = new Float32Array(count * 3);

    const color1 = new THREE.Color(this.config.colorPrimary);
    const color2 = new THREE.Color(this.config.colorSecondary);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const pos = this.getInitialPosition(preset, i, count);

      positions[i3] = pos.x;
      positions[i3 + 1] = pos.y;
      positions[i3 + 2] = pos.z;

      this.initialPositions[i3] = pos.x;
      this.initialPositions[i3 + 1] = pos.y;
      this.initialPositions[i3 + 2] = pos.z;

      const mixRatio = Math.random();
      const color = color1.clone().lerp(color2, mixRatio);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = Math.random() * 2 + 0.5;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

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

    const elapsed = this.clock.getElapsedTime() * this.config.speed;

    // 更新節奏數據
    this.updateRhythm(elapsed);

    if (this.particles) {
      const preset = this.presets[this.currentPreset];
      if (preset && preset.update) {
        preset.update(elapsed);
      }
      this.material.size = 0.5 * this.config.size;
    }

    this.renderer.render(this.scene, this.camera);
  },

  // --- 霓虹螺旋：bass 加速旋轉，treble 增大螺旋幅度 ---
  updateSpiral(t) {
    const positions = this.geometry.attributes.position.array;
    const initPos = this.initialPositions;
    const count = this.config.particleCount;
    const intensity = this.config.intensity;
    const { bass, treble } = this.rhythm;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const ratio = i / count;

      // 基礎旋轉，bass 微調速度
      const angle = t * 0.5 * (1 + bass * 0.3) + ratio * Math.PI * 2;
      // treble 微調螺旋半徑
      const spiralRadius = (10 + ratio * 30) * (1 + treble * 0.2);

      positions[i3] = initPos[i3] + Math.sin(angle) * spiralRadius * 0.3 * intensity;
      positions[i3 + 1] = initPos[i3 + 1] + Math.cos(angle) * spiralRadius * 0.3 * intensity;
      positions[i3 + 2] = initPos[i3 + 2] + Math.sin(t * 0.3 + ratio * 5) * 5 * intensity;
    }

    this.geometry.attributes.position.needsUpdate = true;

    this.camera.position.x = Math.sin(t * 0.1) * 10;
    this.camera.position.y = Math.cos(t * 0.1) * 10;
    this.camera.lookAt(0, 0, 0);
  },

  // --- 矩陣雨：bass 加速下落 ---
  updateMatrixRain(t) {
    const positions = this.geometry.attributes.position.array;
    const initPos = this.initialPositions;
    const count = this.config.particleCount;
    const intensity = this.config.intensity;
    const { bass } = this.rhythm;

    // bass 加速下落
    const fallSpeed = 30 * (1 + bass * 0.5);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const fallOffset = (t * fallSpeed * intensity) % 100;
      let newY = initPos[i3 + 1] - fallOffset;

      if (newY < -50) {
        newY += 100;
      }

      positions[i3] = initPos[i3];
      positions[i3 + 1] = newY;
      positions[i3 + 2] = initPos[i3 + 2];
    }

    this.geometry.attributes.position.needsUpdate = true;

    this.camera.position.x = 0;
    this.camera.position.y = 0;
    this.camera.position.z = 50;
    this.camera.lookAt(0, 0, 0);
  },

  // --- 星雲漩渦：bass 呼吸，mid 旋轉 ---
  updateNebula(t) {
    const positions = this.geometry.attributes.position.array;
    const initPos = this.initialPositions;
    const count = this.config.particleCount;
    const intensity = this.config.intensity;
    const { bass, mid } = this.rhythm;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const initX = initPos[i3];
      const initY = initPos[i3 + 1];
      const initAngle = Math.atan2(initY, initX);
      const initRadius = Math.sqrt(initX * initX + initY * initY);

      // mid 微調旋轉速度
      const speedFactor = 1 / (1 + initRadius * 0.02);
      const newAngle = initAngle + t * 0.5 * speedFactor * intensity * (1 + mid * 0.3);

      // bass 微調呼吸幅度
      const breathe = 1 + Math.sin(t * 0.5) * (0.1 + bass * 0.15);
      const finalRadius = initRadius * breathe;

      positions[i3] = finalRadius * Math.cos(newAngle);
      positions[i3 + 1] = finalRadius * Math.sin(newAngle);
      positions[i3 + 2] = initPos[i3 + 2] + Math.sin(t * 0.3 + initAngle) * 3;
    }

    this.geometry.attributes.position.needsUpdate = true;

    this.camera.position.x = 0;
    this.camera.position.y = 0;
    this.camera.position.z = 60;
    this.camera.lookAt(0, 0, 0);
  },

  // --- 粒子風暴：mid 增加混亂度，treble 增加跳動 ---
  updateStorm(t) {
    const positions = this.geometry.attributes.position.array;
    const initPos = this.initialPositions;
    const count = this.config.particleCount;
    const intensity = this.config.intensity;
    const { mid, treble } = this.rhythm;

    // mid 增加混亂幅度，treble 增加跳動頻率
    const chaos = 1 + mid * 0.5;
    const jitter = 1 + treble * 0.4;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const offsetX = Math.sin(t * 2.1 * jitter + i * 0.1) * 15 * intensity * chaos;
      const offsetY = Math.cos(t * 1.7 * jitter + i * 0.13) * 15 * intensity * chaos;
      const offsetZ = Math.sin(t * 1.3 * jitter + i * 0.17) * 10 * intensity * chaos;

      positions[i3] = initPos[i3] + offsetX;
      positions[i3 + 1] = initPos[i3 + 1] + offsetY;
      positions[i3 + 2] = initPos[i3 + 2] + offsetZ;
    }

    this.geometry.attributes.position.needsUpdate = true;

    this.camera.position.x = Math.sin(t * 2) * 3;
    this.camera.position.y = Math.cos(t * 1.5) * 3;
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
};

// 初始化視覺化
document.addEventListener('DOMContentLoaded', () => {
  if (typeof THREE !== 'undefined') {
    Visualizer.init();
  } else {
    console.warn('[NEONWAVE] Three.js not loaded');
  }
});
