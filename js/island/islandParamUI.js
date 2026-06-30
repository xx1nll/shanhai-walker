import {
  ISLAND_FIELD_GROUPS,
  WORLD_FIELDS,
  MOUNTAIN_FIELDS,
  HILL_FIELDS,
  CRESCENT_FIELDS,
  HOLE_FIELDS,
  CLEARING_FIELDS,
  PRESETS,
  PRESET_DEFAULT,
  cloneWorld,
  sanitizeWorld,
  createDefaultIsland,
  createDefaultWorld,
} from './islandParams.js';
import { parseWorldImport } from './worldIO.js';

const LIVE_UPDATE_MS = 400;

const FEATURE_HINTS = {
  mountains: '山峰 — 高而陡，可尖可平；頂形控制山顶形状，顶宽控制平顶范围',
  hills: '丘陵 — 矮而广的柔和隆起，始终圆形；适合起伏田园感',
  crescents: '新月咬痕 — 从岛边缘切出缺口，可叠加多个',
  holes: '坑洞 — 倒过来的山峰（默认圆底盆形）；注水=1 灌水',
  clearings: '平地 — 压平到固定高度，支持多边形/星形/环形轮廓',
};

function fieldHelpText(field) {
  return field.desc ?? field.hint ?? '';
}

let fieldTooltipEl = null;

function getFieldTooltipEl() {
  if (!fieldTooltipEl) {
    fieldTooltipEl = document.createElement('div');
    fieldTooltipEl.className = 'island-field-tooltip';
    fieldTooltipEl.setAttribute('role', 'tooltip');
    fieldTooltipEl.hidden = true;
    document.body.appendChild(fieldTooltipEl);
  }
  return fieldTooltipEl;
}

function positionFieldTooltip(anchor, tip) {
  const pad = 8;
  const gap = 6;
  const rect = anchor.getBoundingClientRect();
  tip.style.left = '0';
  tip.style.top = '0';
  tip.hidden = false;

  let left = rect.left;
  let top = rect.bottom + gap;
  const tipRect = tip.getBoundingClientRect();

  if (left + tipRect.width > window.innerWidth - pad) {
    left = window.innerWidth - tipRect.width - pad;
  }
  if (left < pad) left = pad;

  if (top + tipRect.height > window.innerHeight - pad) {
    top = rect.top - tipRect.height - gap;
  }
  if (top < pad) top = pad;

  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function hideFieldTooltip() {
  if (fieldTooltipEl) fieldTooltipEl.hidden = true;
}

function appendFieldHelp(labelEl, field) {
  const text = fieldHelpText(field);
  if (!text) return;
  const help = document.createElement('span');
  help.className = 'island-field-help';
  help.textContent = '?';
  help.setAttribute('aria-label', text);
  help.tabIndex = 0;

  const show = () => {
    const tip = getFieldTooltipEl();
    tip.textContent = text;
    positionFieldTooltip(help, tip);
  };

  help.addEventListener('mouseenter', show);
  help.addEventListener('mouseleave', hideFieldTooltip);
  help.addEventListener('focus', show);
  help.addEventListener('blur', hideFieldTooltip);
  labelEl.appendChild(help);
}

function clampNumber(value, field) {
  const n = Number(value);
  if (Number.isNaN(n)) return field.default;
  return Math.min(field.max, Math.max(field.min, n));
}

function makeNumberInput(field, value, onChange, onLive) {
  const row = document.createElement('label');
  row.className = 'island-field';
  const label = document.createElement('span');
  label.className = 'island-field-label';
  label.textContent = field.label;
  appendFieldHelp(label, field);
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'island-input';
  input.min = String(field.min);
  input.max = String(field.max);
  input.step = String(field.step);
  input.value = String(clampNumber(value ?? field.default, field));
  const fire = () => {
    const n = clampNumber(input.value, field);
    input.value = String(n);
    onChange(n);
    onLive?.();
  };
  input.addEventListener('change', fire);
  input.addEventListener('input', fire);
  row.append(label, input);
  return { row, input };
}

function makeFieldInput(field, value, onChange, onLive) {
  if (field.type === 'select') {
    const row = document.createElement('label');
    row.className = 'island-field';
    const label = document.createElement('span');
    label.className = 'island-field-label';
    label.textContent = field.label;
    appendFieldHelp(label, field);
    const select = document.createElement('select');
    select.className = 'island-select';
    for (const opt of field.options ?? []) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      select.appendChild(o);
    }
    select.value = value ?? field.default;
    select.addEventListener('change', () => {
      onChange(select.value);
      onLive?.();
    });
    row.append(label, select);
    return { row, input: select };
  }
  if (field.type === 'color') {
    const row = document.createElement('label');
    row.className = 'island-field';
    const label = document.createElement('span');
    label.className = 'island-field-label';
    label.textContent = field.label;
    appendFieldHelp(label, field);
    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'island-color-input';
    const raw = value ?? field.default;
    input.value = String(raw).startsWith('#') ? raw : `#${raw}`;
    input.addEventListener('input', () => {
      onChange(input.value);
      onLive?.();
    });
    row.append(label, input);
    return { row, input };
  }
  return makeNumberInput(field, value, onChange, onLive);
}

function makeFeatureCard(title, fields, data, index, onChange, onRemove, onLive) {
  const card = document.createElement('div');
  card.className = 'island-feature-card';
  const head = document.createElement('div');
  head.className = 'island-feature-head';
  head.innerHTML = `<span>${title} ${index + 1}</span>`;
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'island-btn small';
  removeBtn.textContent = '删';
  removeBtn.addEventListener('click', () => {
    onRemove();
    onLive?.();
  });
  head.appendChild(removeBtn);
  card.appendChild(head);
  for (const field of fields) {
    const { row } = makeFieldInput(field, data[field.key], (v) => onChange(index, field.key, v), onLive);
    card.appendChild(row);
  }
  return card;
}

export class IslandParamUI {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.world = cloneWorld(PRESET_DEFAULT);
    this.visible = false;
    this.isUpdating = false;
    this._pendingUpdate = false;
    this._updateTimer = null;
    this._suppressLiveUpdate = true;
    this.root = document.getElementById('island-panel');
    this.worldInputs = {};
    this.presetSelect = null;
    this.islandsContainer = null;
    this.paintStatusEl = null;
    this.liveStatusEl = null;
    this.jsonImportEl = null;
    this._build();
    this._renderIslands();
    this._suppressLiveUpdate = false;
  }

  /** Pull live brush deltas from terrain editor into world params */
  syncPaintFromEditor(editor) {
    if (!editor) return;
    if (editor.hasPaintEdits()) {
      this.world.paintDeltas = editor.exportEdits();
    } else {
      delete this.world.paintDeltas;
    }
    this._updatePaintStatus(editor);
  }

  _updatePaintStatus(editor) {
    if (!this.paintStatusEl) return;
    const cells = editor?.countPaintCells?.() ?? 0;
    if (cells > 0) {
      this.paintStatusEl.textContent = `手绘层: ${cells} 处修改 (实时保留 · 含在 JSON 中)`;
      this.paintStatusEl.classList.add('active');
    } else {
      this.paintStatusEl.textContent = '手绘层: 无';
      this.paintStatusEl.classList.remove('active');
    }
  }

  _setLiveStatus(text) {
    if (this.liveStatusEl) this.liveStatusEl.textContent = text;
  }

  _onLive = () => this._scheduleLiveUpdate();

  _scheduleLiveUpdate({ immediate = false, keepPaint = true } = {}) {
    if (this._suppressLiveUpdate) return;
    clearTimeout(this._updateTimer);
    const delay = immediate ? 0 : LIVE_UPDATE_MS;
    this._updateTimer = setTimeout(() => {
      this._applyWorld({ keepPaint });
    }, delay);
  }

  async _applyWorld({ keepPaint = true } = {}) {
    if (this.isUpdating) {
      this._pendingUpdate = { keepPaint };
      return;
    }
    this.isUpdating = true;
    this._setLiveStatus('地形更新中…');
    this.callbacks.onSyncPaint?.();
    this.world = sanitizeWorld(this.world);
    this._syncWorldInputs();
    try {
      await this.callbacks.onWorldChange?.(this.world, { keepPaint });
    } catch (e) {
      console.warn('[Island] live update failed', e);
      this._setLiveStatus('更新失败');
      this.isUpdating = false;
      return;
    }
    this.isUpdating = false;
    this._setLiveStatus('地形实时同步');
    if (this._pendingUpdate) {
      const opts = this._pendingUpdate;
      this._pendingUpdate = false;
      this._applyWorld(opts);
    }
  }

  async _importWorld(raw) {
    try {
      const world = typeof raw === 'string' ? parseWorldImport(raw) : raw;
      this._suppressLiveUpdate = true;
      this.setWorld(world);
      this._suppressLiveUpdate = false;
      await this._applyWorld({ keepPaint: false });
    } catch (e) {
      console.warn('[Island] import failed', e);
      if (e?.errors?.length) {
        alert(`JSON 参数超出允许范围：\n\n${e.errors.slice(0, 12).join('\n')}${e.errors.length > 12 ? `\n…共 ${e.errors.length} 项` : ''}`);
      } else if (e instanceof SyntaxError) {
        alert('JSON 格式无效，请检查后重试');
      } else {
        alert(e?.message || 'JSON 导入失败');
      }
    }
  }

  async _importFromTextarea() {
    if (this.isUpdating || !this.jsonImportEl) return;
    const text = this.jsonImportEl.value.trim();
    if (!text) {
      alert('请先在下方粘贴 JSON');
      return;
    }
    await this._importWorld(text);
  }

  _build() {
    if (!this.root) return;

    const presetRow = document.createElement('div');
    presetRow.className = 'island-preset-row';
    this.presetSelect = document.createElement('select');
    this.presetSelect.className = 'island-select';
    for (const [key, preset] of Object.entries(PRESETS)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = preset.label;
      this.presetSelect.appendChild(opt);
    }
    this.presetSelect.addEventListener('change', () => {
      this.world = cloneWorld(PRESETS[this.presetSelect.value].params);
      delete this.world.paintDeltas;
      this._syncWorldInputs();
      this._renderIslands();
      this.callbacks.onReset?.();
      this._scheduleLiveUpdate({ immediate: true, keepPaint: false });
    });
    presetRow.append(document.createTextNode('预设'), this.presetSelect);
    this.root.appendChild(presetRow);

    const scroll = document.createElement('div');
    scroll.className = 'island-scroll';
    scroll.addEventListener('scroll', hideFieldTooltip, { passive: true });
    this.root.appendChild(scroll);

    const worldSection = document.createElement('section');
    worldSection.className = 'island-section';
    worldSection.innerHTML = '<h3>世界</h3>';
    for (const field of WORLD_FIELDS) {
      const { row, input } = makeFieldInput(field, this.world[field.key], (v) => {
        this.world[field.key] = v;
      }, this._onLive);
      this.worldInputs[field.key] = input;
      worldSection.appendChild(row);
    }
    scroll.appendChild(worldSection);

    this.paintStatusEl = document.createElement('p');
    this.paintStatusEl.className = 'island-paint-status';
    this.paintStatusEl.textContent = '手绘层: 无';
    scroll.appendChild(this.paintStatusEl);

    this.liveStatusEl = document.createElement('p');
    this.liveStatusEl.className = 'island-live-status';
    this.liveStatusEl.textContent = '地形实时同步';
    scroll.appendChild(this.liveStatusEl);

    const islandsHead = document.createElement('div');
    islandsHead.className = 'island-section-head';
    islandsHead.innerHTML = '<h3>岛屿列表</h3>';
    const addIslandBtn = document.createElement('button');
    addIslandBtn.type = 'button';
    addIslandBtn.className = 'island-btn small';
    addIslandBtn.textContent = '添加岛屿';
    addIslandBtn.addEventListener('click', () => {
      this.world.islands.push(createDefaultIsland());
      this._renderIslands();
      this._scheduleLiveUpdate({ immediate: true });
    });
    islandsHead.appendChild(addIslandBtn);
    scroll.appendChild(islandsHead);

    this.islandsContainer = document.createElement('div');
    this.islandsContainer.className = 'island-list';
    scroll.appendChild(this.islandsContainer);

    const importSection = document.createElement('section');
    importSection.className = 'island-section island-import-section';
    importSection.innerHTML = '<h3>导入 JSON</h3>';

    this.jsonImportEl = document.createElement('textarea');
    this.jsonImportEl.className = 'island-json-input';
    this.jsonImportEl.rows = 7;
    this.jsonImportEl.spellcheck = false;
    this.jsonImportEl.placeholder = '在此粘贴世界 JSON…';
    importSection.appendChild(this.jsonImportEl);

    const importRow = document.createElement('div');
    importRow.className = 'island-import-actions';

    const applyJsonBtn = document.createElement('button');
    applyJsonBtn.type = 'button';
    applyJsonBtn.className = 'island-btn primary wide';
    applyJsonBtn.textContent = '应用 JSON';
    applyJsonBtn.addEventListener('click', () => this._importFromTextarea());

    const clipFillBtn = document.createElement('button');
    clipFillBtn.type = 'button';
    clipFillBtn.className = 'island-btn wide';
    clipFillBtn.textContent = '从剪贴板填入';
    clipFillBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (this.jsonImportEl) this.jsonImportEl.value = text;
      } catch {
        alert('无法读取剪贴板');
      }
    });

    const clearJsonBtn = document.createElement('button');
    clearJsonBtn.type = 'button';
    clearJsonBtn.className = 'island-btn wide';
    clearJsonBtn.textContent = '清空';
    clearJsonBtn.addEventListener('click', () => {
      if (this.jsonImportEl) this.jsonImportEl.value = '';
    });

    importRow.append(applyJsonBtn, clipFillBtn, clearJsonBtn);
    importSection.appendChild(importRow);
    scroll.appendChild(importSection);

    const actions = document.createElement('div');
    actions.className = 'island-actions';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'island-btn wide';
    resetBtn.textContent = '恢复默认';
    resetBtn.addEventListener('click', () => {
      this.world = cloneWorld(PRESET_DEFAULT);
      delete this.world.paintDeltas;
      if (this.presetSelect) this.presetSelect.value = 'default';
      this._syncWorldInputs();
      this._renderIslands();
      this.callbacks.onReset?.();
      this._updatePaintStatus(null);
      this._scheduleLiveUpdate({ immediate: true, keepPaint: false });
    });

    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'island-btn wide';
    exportBtn.textContent = '复制 JSON';
    exportBtn.addEventListener('click', () => {
      this.callbacks.onSyncPaint?.();
      const json = this.callbacks.onExportJSON?.()
        ?? JSON.stringify(sanitizeWorld(this.world), null, 2);
      navigator.clipboard?.writeText(json);
      if (this.jsonImportEl) this.jsonImportEl.value = json;
    });

    const tutorialBtn = document.createElement('button');
    tutorialBtn.type = 'button';
    tutorialBtn.id = 'tutorial-btn-island';
    tutorialBtn.className = 'island-btn wide tutorial-link-btn';
    tutorialBtn.textContent = '使用教程';

    actions.append(resetBtn, exportBtn, tutorialBtn);
    this.root.appendChild(actions);

    const foot = document.createElement('p');
    foot.className = 'island-foot';
    foot.innerHTML = '按 <kbd>P</kbd> 关闭 · <kbd>H</kbd> 教程 · 参数实时更新';
    this.root.appendChild(foot);
  }

  _renderIslands() {
    if (!this.islandsContainer) return;
    this.islandsContainer.innerHTML = '';

    this.world.islands.forEach((island, islandIdx) => {
      const card = document.createElement('div');
      card.className = 'island-card';

      const head = document.createElement('div');
      head.className = 'island-card-head';
      head.innerHTML = `<strong>岛屿 ${islandIdx + 1}</strong>`;
      if (this.world.islands.length > 1) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'island-btn small';
        del.textContent = '删除岛';
        del.addEventListener('click', () => {
          this.world.islands.splice(islandIdx, 1);
          this._renderIslands();
          this._scheduleLiveUpdate({ immediate: true });
        });
        head.appendChild(del);
      }
      card.appendChild(head);

      for (const group of ISLAND_FIELD_GROUPS) {
        const sub = document.createElement('div');
        sub.className = 'island-subsection';
        sub.innerHTML = `<h4>${group.label}</h4>`;
        for (const field of group.fields) {
          const { row } = makeFieldInput(field, island[field.key], (v) => {
            this.world.islands[islandIdx][field.key] = v;
          }, this._onLive);
          sub.appendChild(row);
        }
        card.appendChild(sub);
      }

      this._addIslandFeatures(card, islandIdx, 'crescents', '新月咬痕', CRESCENT_FIELDS, '添加新月');
      this._addIslandFeatures(card, islandIdx, 'mountains', '山峰', MOUNTAIN_FIELDS, '添加山峰');
      this._addIslandFeatures(card, islandIdx, 'hills', '丘陵', HILL_FIELDS, '添加丘陵');
      this._addIslandFeatures(card, islandIdx, 'holes', '坑洞', HOLE_FIELDS, '添加坑洞');
      this._addIslandFeatures(card, islandIdx, 'clearings', '平地', CLEARING_FIELDS, '添加平地');

      this.islandsContainer.appendChild(card);
    });
  }

  _addIslandFeatures(card, islandIdx, key, label, fields, addLabel) {
    const wrap = document.createElement('div');
    wrap.className = 'island-subsection';
    const head = document.createElement('div');
    head.className = 'island-section-head';
    const title = document.createElement('h4');
    title.textContent = label;
    title.title = FEATURE_HINTS[key] ?? '';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'island-btn small';
    addBtn.textContent = addLabel;
    addBtn.addEventListener('click', () => {
      const d = {};
      for (const f of fields) d[f.key] = f.default;
      this.world.islands[islandIdx][key].push(d);
      this._renderIslands();
      this._scheduleLiveUpdate({ immediate: true });
    });
    head.append(title, addBtn);
    wrap.appendChild(head);

    if (FEATURE_HINTS[key]) {
      const hint = document.createElement('p');
      hint.className = 'island-feature-hint';
      hint.textContent = FEATURE_HINTS[key];
      wrap.appendChild(hint);
    }

    const list = document.createElement('div');
    list.className = 'island-features';
    this.world.islands[islandIdx][key].forEach((item, fi) => {
      list.appendChild(makeFeatureCard(
        label,
        fields,
        item,
        fi,
        (i, fk, v) => { this.world.islands[islandIdx][key][i][fk] = v; },
        () => {
          this.world.islands[islandIdx][key].splice(fi, 1);
          this._renderIslands();
        },
        this._onLive
      ));
    });
    wrap.appendChild(list);
    card.appendChild(wrap);
  }

  _syncWorldInputs() {
    for (const field of WORLD_FIELDS) {
      const input = this.worldInputs[field.key];
      if (input) input.value = String(this.world[field.key]);
    }
  }

  getWorld() {
    return sanitizeWorld(this.world);
  }

  setWorld(world) {
    this.world = sanitizeWorld(world);
    this._syncWorldInputs();
    this._renderIslands();
  }

  toggle() {
    this.visible = !this.visible;
    this.root?.classList.toggle('visible', this.visible);
    if (this.visible) this.callbacks.onPanelOpen?.();
    return this.visible;
  }

  hide() {
    this.visible = false;
    this.root?.classList.remove('visible');
    hideFieldTooltip();
  }
}

export { createDefaultWorld, PRESETS, sanitizeWorld as sanitizeParams };
