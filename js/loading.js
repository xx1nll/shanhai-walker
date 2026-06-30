/** Yield to browser so loading UI can paint between heavy steps */
export function yieldFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

export class LoadingScreen {
  constructor() {
    this.el = document.getElementById('loading-screen');
    this.fill = this.el?.querySelector('.loading-fill');
    this.status = this.el?.querySelector('.loading-status');
    this.percent = this.el?.querySelector('.loading-percent');
  }

  setProgress(fraction, message) {
    const pct = Math.round(fraction * 100);
    if (this.fill) this.fill.style.width = `${pct}%`;
    if (this.status) this.status.textContent = message;
    if (this.percent) this.percent.textContent = `${pct}%`;
  }

  async hide() {
    if (!this.el) return;
    this.el.classList.add('fade-out');
    await new Promise((r) => setTimeout(r, 500));
    this.el.classList.add('hidden');
  }
}

/** Run fn in slices, calling onProgress after each slice */
export async function runInSlices(total, sliceSize, fn, onSliceDone) {
  for (let i = 0; i < total; i += sliceSize) {
    const end = Math.min(i + sliceSize, total);
    fn(i, end);
    onSliceDone(end / total);
    await yieldFrame();
  }
}
