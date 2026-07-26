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
  initialPositions: null,

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

    // 儲存初始位置
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

    if (this.particles) {
      const preset = this.presets[this.currentPreset];
      if (preset && preset.update) {
        preset.update(elapsed);
      }
      this.material.size = 0.5 * this.config.size;
    }

    this.renderer.render(this.scene, this.camera);
  },

  // --- 霓虹螺旋：粒子沿螺旋線旋轉移動 ---
  updateSpiral(t) {
    const positions = this.geometry.attributes.position.array;
    const initPos = this.initialPositions;
    const count = this.config.particleCount;
    const intensity = this.config.intensity;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const ratio = i / count;

      // 基於初始位置 + 時間偏移
      const angle = t * 0.5 + ratio * Math.PI * 2;
      const spiralRadius = 10 + ratio * 30;

      positions[i3] = initPos[i3] + Math.sin(angle) * spiralRadius * 0.3 * intensity;
      positions[i3 + 1] = initPos[i3 + 1] + Math.cos(angle) * spiralRadius * 0.3 * intensity;
      positions[i3 + 2] = initPos[i3 + 2] + Math.sin(t * 0.3 + ratio * 5) * 5 * intensity;
    }

    this.geometry.attributes.position.needsUpdate = true;

    this.camera.position.x = Math.sin(t * 0.1) * 10;
    this.camera.position.y = Math.cos(t * 0.1) * 10;
    this.camera.lookAt(0, 0, 0);
  },

  // --- 矩陣雨：粒子從上往下流動 ---
  updateMatrixRain(t) {
    const positions = this.geometry.attributes.position.array;
    const initPos = this.initialPositions;
    const count = this.config.particleCount;
    const intensity = this.config.intensity;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // 從初始 Y 位置向下流動，循環重複
      const fallOffset = (t * 30 * intensity) % 100;
      let newY = initPos[i3 + 1] - fallOffset;

      // 循環：低於 -50 時回到上方
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

  // --- 星雲漩渦：粒子繞中心旋轉 ---
  updateNebula(t) {
    const positions = this.geometry.attributes.position.array;
    const initPos = this.initialPositions;
    const count = this.config.particleCount;
    const intensity = this.config.intensity;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // 從初始位置計算極座標
      const initX = initPos[i3];
      const initY = initPos[i3 + 1];
      const initAngle = Math.atan2(initY, initX);
      const initRadius = Math.sqrt(initX * initX + initY * initY);

      // 旋轉：內圈快、外圈慢
      const speedFactor = 1 / (1 + initRadius * 0.02);
      const newAngle = initAngle + t * 0.5 * speedFactor * intensity;

      // 呼吸效果
      const breathe = 1 + Math.sin(t * 0.5) * 0.1;
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

  // --- 粒子風暴：粒子隨機亂舞 ---
  updateStorm(t) {
    const positions = this.geometry.attributes.position.array;
    const initPos = this.initialPositions;
    const count = this.config.particleCount;
    const intensity = this.config.intensity;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // 基於初始位置 + 時間驅動的隨機偏移
      const offsetX = Math.sin(t * 2.1 + i * 0.1) * 15 * intensity;
      const offsetY = Math.cos(t * 1.7 + i * 0.13) * 15 * intensity;
      const offsetZ = Math.sin(t * 1.3 + i * 0.17) * 10 * intensity;

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
