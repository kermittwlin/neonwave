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
  currentPreset: 'neonSpiral',

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

    // 初始化預設
    this.initPresets();

    // 建立粒子
    this.createParticles(this.currentPreset);

    // 事件
    window.addEventListener('resize', () => this.onResize());

    // 開始渲染
    this.animate();
  },

  // --- 粒子系統 ---
  createParticles(preset) {
    // 移除舊粒子
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

    const color1 = new THREE.Color(this.config.colorPrimary);
    const color2 = new THREE.Color(this.config.colorSecondary);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // 根據預設設定初始位置
      const pos = this.getInitialPosition(preset, i, count);
      positions[i3] = pos.x;
      positions[i3 + 1] = pos.y;
      positions[i3 + 2] = pos.z;

      // 隨機顏色
      const mixRatio = Math.random();
      const color = color1.clone().lerp(color2, mixRatio);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // 大小
      sizes[i] = Math.random() * 2 + 0.5;

      // 速度
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.userData = { velocities };

    // 材質
    this.material = new THREE.PointsMaterial({
      size: 0.5 * this.config.size,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    // 粒子系統
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

    // 渲染預設按鈕
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
    const delta = this.clock.getDelta();

    if (this.particles) {
      // 執行當前預設的更新
      const preset = this.presets[this.currentPreset];
      if (preset && preset.update) {
        preset.update(elapsed);
      }

      // 更新粒子大小
      this.material.size = 0.5 * this.config.size;
    }

    this.renderer.render(this.scene, this.camera);
  },

  // --- 預設更新函數 ---
  updateSpiral(t) {
    const positions = this.geometry.attributes.position.array;
    const count = this.config.particleCount;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const ratio = i / count;

      positions[i3] += Math.sin(t + ratio * 10) * 0.02 * this.config.intensity;
      positions[i3 + 1] += Math.cos(t + ratio * 10) * 0.02 * this.config.intensity;
      positions[i3 + 2] += Math.sin(t * 0.5 + ratio * 5) * 0.01 * this.config.intensity;

      // 邊界循環
      if (positions[i3] > 50) positions[i3] = -50;
      if (positions[i3] < -50) positions[i3] = 50;
      if (positions[i3 + 1] > 50) positions[i3 + 1] = -50;
      if (positions[i3 + 1] < -50) positions[i3 + 1] = 50;
    }

    this.geometry.attributes.position.needsUpdate = true;

    // 相機旋轉
    this.camera.position.x = Math.sin(t * 0.1) * 10;
    this.camera.position.y = Math.cos(t * 0.1) * 10;
    this.camera.lookAt(0, 0, 0);
  },

  updateMatrixRain(t) {
    const positions = this.geometry.attributes.position.array;
    const count = this.config.particleCount;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // 向下流動
      positions[i3 + 1] -= 0.3 * this.config.intensity;

      // 隨機重置
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
    const count = this.config.particleCount;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const angle = Math.atan2(positions[i3 + 1], positions[i3]);
      const radius = Math.sqrt(positions[i3] ** 2 + positions[i3 + 1] ** 2);

      // 旋轉
      const newAngle = angle + 0.005 * this.config.intensity;
      positions[i3] = radius * Math.cos(newAngle);
      positions[i3 + 1] = radius * Math.sin(newAngle);

      // 呼吸效果
      const breathe = Math.sin(t * 0.5) * 0.02 + 1;
      positions[i3] *= breathe;
      positions[i3 + 1] *= breathe;

      // Z 軸波動
      positions[i3 + 2] += Math.sin(t + i * 0.01) * 0.02 * this.config.intensity;
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

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // 隨機亂流
      positions[i3] += (Math.random() - 0.5) * 0.1 * this.config.intensity;
      positions[i3 + 1] += (Math.random() - 0.5) * 0.1 * this.config.intensity;
      positions[i3 + 2] += (Math.random() - 0.5) * 0.05 * this.config.intensity;

      // 邊界循環
      if (Math.abs(positions[i3]) > 50) positions[i3] *= -0.9;
      if (Math.abs(positions[i3 + 1]) > 50) positions[i3 + 1] *= -0.9;
      if (Math.abs(positions[i3 + 2]) > 30) positions[i3 + 2] *= -0.9;
    }

    this.geometry.attributes.position.needsUpdate = true;

    // 相機晃動
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
  // 等 Three.js 載入
  if (typeof THREE !== 'undefined') {
    Visualizer.init();
  } else {
    console.warn('[NEONWAVE] Three.js not loaded');
  }
});
