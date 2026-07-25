/* ============================================
   NEONWAVE — Visual Controls Module
   ============================================ */

const Controls = {
  init() {
    this.initSliders();
    this.initColorPickers();
    this.initToggles();
    this.initResetButton();
  },

  // --- 滑桿控制 ---
  initSliders() {
    // 粒子強度
    this.bindSlider('fx-intensity', (value) => {
      Visualizer.updateConfig('intensity', value);
    });

    // 速度
    this.bindSlider('fx-speed', (value) => {
      Visualizer.updateConfig('speed', value);
    });

    // 粒子大小
    this.bindSlider('fx-size', (value) => {
      Visualizer.updateConfig('size', value);
    });

    // 發光強度
    this.bindSlider('fx-glow', (value) => {
      Visualizer.updateConfig('glow', value);
      document.body.style.setProperty('--glow-intensity', value);
    });
  },

  bindSlider(id, callback) {
    const slider = document.getElementById(id);
    const output = slider?.parentElement?.querySelector('output');
    if (!slider) return;

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      if (output) output.textContent = value.toFixed(2);
      callback(value);
    });

    // 初始化
    const initialValue = parseFloat(slider.value);
    if (output) output.textContent = initialValue.toFixed(2);
  },

  // --- 顏色選擇器 ---
  initColorPickers() {
    this.bindColorPicker('color-primary', '#color-primary-hex', (color) => {
      Visualizer.updateConfig('colorPrimary', color);
      Visualizer.updateColors();
    });

    this.bindColorPicker('color-secondary', '#color-secondary-hex', (color) => {
      Visualizer.updateConfig('colorSecondary', color);
      Visualizer.updateColors();
    });

    this.bindColorPicker('color-bg', '#color-bg-hex', (color) => {
      Visualizer.updateConfig('colorBg', color);
      document.body.style.setProperty('--bg-primary', color);
    });
  },

  bindColorPicker(inputId, hexId, callback) {
    const input = document.getElementById(inputId);
    const hex = document.getElementById(hexId);
    if (!input) return;

    input.addEventListener('input', () => {
      const color = input.value;
      if (hex) hex.textContent = color.toUpperCase();
      callback(color);
    });
  },

  // --- 開關控制 ---
  initToggles() {
    this.bindToggle('t-scanlines', 'effects.scanlines', (active) => {
      document.body.classList.toggle('scanlines-on', active);
    });

    this.bindToggle('t-chromatic', 'effects.chromatic', (active) => {
      document.body.classList.toggle('chromatic-on', active);
    });

    this.bindToggle('t-bloom', 'effects.bloom', (active) => {
      // TODO: 實作溢光效果
    });

    this.bindToggle('t-grid', 'effects.grid', (active) => {
      const grid = document.getElementById('bg-grid');
      if (grid) grid.style.opacity = active ? '1' : '0';
    });
  },

  bindToggle(id, configKey, callback) {
    const toggle = document.getElementById(id);
    if (!toggle) return;

    // 初始化狀態
    const isActive = toggle.classList.contains('active');

    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      const active = toggle.classList.contains('active');

      // 更新配置
      const keys = configKey.split('.');
      let obj = Visualizer.config;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = active;

      callback(active);
    });

    // 初始化
    callback(isActive);
  },

  // --- 恢復默認 ---
  initResetButton() {
    const resetBtn = document.getElementById('btn-reset-fx');
    if (!resetBtn) return;

    resetBtn.addEventListener('click', () => {
      // 重置配置
      Visualizer.config = {
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
      };

      // 重置 UI
      this.resetUI();

      // 重建粒子
      Visualizer.createParticles(Visualizer.currentPreset);

      App.toast('已恢復默認設定');
    });
  },

  resetUI() {
    // 重置滑桿
    document.getElementById('fx-intensity').value = 1;
    document.getElementById('fx-speed').value = 1;
    document.getElementById('fx-size').value = 1;
    document.getElementById('fx-glow').value = 1;

    // 更新輸出值
    document.querySelectorAll('.slider-row output').forEach((output, index) => {
      const sliders = [1, 1, 1, 1];
      output.textContent = sliders[index].toFixed(2);
    });

    // 重置顏色
    document.getElementById('color-primary').value = '#FF2D7B';
    document.getElementById('color-secondary').value = '#B026FF';
    document.getElementById('color-bg').value = '#0A0A0F';
    document.getElementById('color-primary-hex').textContent = '#FF2D7B';
    document.getElementById('color-secondary-hex').textContent = '#B026FF';
    document.getElementById('color-bg-hex').textContent = '#0A0A0F';

    // 重置開關
    document.getElementById('t-scanlines').classList.remove('active');
    document.getElementById('t-chromatic').classList.remove('active');
    document.getElementById('t-bloom').classList.add('active');
    document.getElementById('t-grid').classList.add('active');

    // 重置背景
    document.body.classList.remove('scanlines-on', 'chromatic-on');
    document.body.style.setProperty('--bg-primary', '#0A0A0F');
    document.getElementById('bg-grid').style.opacity = '1';
  },
};

// 初始化控制
document.addEventListener('DOMContentLoaded', () => Controls.init());
