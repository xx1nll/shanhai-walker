/** In-game tutorials for hand brush (T) and island params (P). */

const SECTIONS = {
  overview: {
    title: '快速入门',
    html: `
      <p>山海行有两种改地形的方式，可以单独用，也可以叠加：</p>
      <ul>
        <li><strong>手绘画笔</strong>（<kbd>T</kbd>）— 像雕塑一样局部抬高/降低地面</li>
        <li><strong>岛屿参数</strong>（<kbd>P</kbd>）— 用数值生成整座岛的山峰、丘陵、坑洞等</li>
      </ul>
      <p>手绘画笔的修改会保存在世界 JSON 的 <code>paintDeltas</code> 里，与 P 面板的岛屿参数一起导出。</p>
      <p class="tutorial-tip">按 <kbd>H</kbd> 或点右下角 <strong>?</strong> 随时打开本教程。</p>
    `,
  },
  brush: {
    title: '手绘画笔 · T',
    html: `
      <h4>进入 / 退出</h4>
      <ul>
        <li>按 <kbd>T</kbd> 进入地形编辑模式（再按一次退出）</li>
        <li>编辑时鼠标会解锁，可在地面上直接涂抹</li>
        <li>打开 P 面板时会自动退出画笔模式</li>
      </ul>
      <h4>涂抹操作</h4>
      <ul>
        <li><strong>左键按住拖拽</strong> — 抬高地形</li>
        <li><strong>右键按住拖拽</strong> — 降低地形</li>
        <li>蓝色圆环 = 当前笔刷范围</li>
      </ul>
      <h4>笔刷调节</h4>
      <ul>
        <li><kbd>[</kbd> / <kbd>]</kbd> — 缩小 / 放大笔刷（仅在非 P 面板时）</li>
        <li>左侧面板的 <strong>力度 ±</strong> — 每次涂抹的强度</li>
        <li>左侧面板实时显示笔刷大小与力度数值</li>
      </ul>
      <h4>保存与导出</h4>
      <ul>
        <li>手绘修改<strong>自动保存</strong>到浏览器，并写入导出的 JSON</li>
        <li><strong>复制世界 JSON</strong> — 复制完整世界（含手绘层）</li>
        <li><strong>重置地形</strong> — 仅清除手绘层，恢复为当前 P 面板参数生成的地形</li>
      </ul>
      <p class="tutorial-tip">适合：修整海岸线、挖小路、填平落脚平台、微调山峰细节。</p>
    `,
  },
  params: {
    title: '岛屿参数 · P',
    html: `
      <h4>打开面板</h4>
      <ul>
        <li>按 <kbd>P</kbd> 打开 / 关闭右侧岛屿参数面板</li>
        <li>改参数后约 0.4 秒自动重建地形（实时同步）</li>
        <li>每个参数旁的 <strong>?</strong> 悬停可查看说明</li>
      </ul>
      <h4>面板结构</h4>
      <ul>
        <li><strong>世界</strong> — 水深、出生点、海水颜色</li>
        <li><strong>岛屿列表</strong> — 可添加多座岛（最多 8 座）</li>
        <li><strong>形状</strong> — 半径、轮廓类型（圆/多边形/星形/环形）、拉伸与旋转</li>
        <li><strong>地势 / 海岸</strong> — 基准高度、起伏、海向、崖线等</li>
        <li><strong>特征</strong> — 山峰、丘陵、坑洞、平地、新月咬痕</li>
      </ul>
      <h4>特征速查</h4>
      <ul>
        <li><strong>山峰</strong> — 高而陡；頂形 0=尖頭，1=圓頭平地</li>
        <li><strong>丘陵</strong> — 矮而广的柔和圆丘（不是尖峰）</li>
        <li><strong>坑洞</strong> — 倒过来的山峰；底形控制盆底圆/尖；注水=1 可灌水</li>
        <li><strong>平地</strong> — 压平到固定高度，支持多边形轮廓</li>
      </ul>
      <h4>JSON 导入 / 导出</h4>
      <ul>
        <li><strong>复制 JSON</strong> — 导出当前世界（含手绘层）</li>
        <li>在下方文本框粘贴 JSON → <strong>应用 JSON</strong></li>
        <li>超出允许范围的数值会报错，不会静默截断</li>
        <li>可用 AI（见 <code>docs/deepseek-island-prompt.md</code>）生成 JSON 再粘贴导入</li>
      </ul>
      <p class="tutorial-tip">适合：整体换岛形、批量加山峰/湖泊、用预设或 AI 快速搭岛。</p>
    `,
  },
};

export class TutorialUI {
  constructor() {
    this.visible = false;
    this.section = 'overview';
    this.overlay = document.getElementById('tutorial-overlay');
    this.body = document.getElementById('tutorial-body');
    this.tabs = this.overlay?.querySelector('.tutorial-tabs');
    this._bind();
  }

  _bind() {
    if (!this.overlay) return;

    this.overlay.querySelector('.tutorial-backdrop')?.addEventListener('click', () => this.hide());
    this.overlay.querySelector('.tutorial-close')?.addEventListener('click', () => this.hide());

    this.tabs?.querySelectorAll('[data-section]').forEach((btn) => {
      btn.addEventListener('click', () => this.show(btn.dataset.section));
    });

    document.getElementById('tutorial-btn-hud')?.addEventListener('click', () => this.toggle());
    document.getElementById('tutorial-btn-editor')?.addEventListener('click', () => this.show('brush'));
    document.getElementById('tutorial-btn-island')?.addEventListener('click', () => this.show('params'));

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH' && !e.repeat && !this._typingInInput()) {
        e.preventDefault();
        this.toggle();
      }
      if (e.code === 'Escape' && this.visible) this.hide();
    });
  }

  _typingInInput() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  show(section = 'overview') {
    if (!this.overlay || !this.body) return;
    this.section = SECTIONS[section] ? section : 'overview';
    this.body.innerHTML = SECTIONS[this.section].html;

    this.tabs?.querySelectorAll('[data-section]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.section === this.section);
    });

    this.overlay.classList.add('visible');
    this.visible = true;
  }

  hide() {
    this.overlay?.classList.remove('visible');
    this.visible = false;
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show(this.section);
  }
}
