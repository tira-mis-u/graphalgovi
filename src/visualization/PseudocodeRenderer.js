/**
 * PseudocodeRenderer — renders an algorithm's pseudocode lines and highlights
 * the line matching the currently executing event (event.line).
 */
export default class PseudocodeRenderer {
  constructor(root) {
    this.root = root;
    this.lines = [];
    this.currentLine = -1;
    this._lineEls = [];
  }

  /** @param {string[]} lines */
  setLines(lines) {
    if (!lines || !lines.length) {
      this.clear();
      return;
    }
    // avoid rebuilding identical content
    if (lines.join('\n') === this.lines.join('\n')) return;
    this.lines = lines;
    this.currentLine = -1;
    this._lineEls = [];
    this.root.innerHTML = '';
    lines.forEach((code, i) => {
      const el = document.createElement('div');
      el.className = 'code-line';
      const num = document.createElement('span');
      num.className = 'code-num';
      num.textContent = String(i + 1).padStart(2, '0');
      const txt = document.createElement('span');
      txt.className = 'code-text';
      txt.textContent = code;
      el.appendChild(num);
      el.appendChild(txt);
      this.root.appendChild(el);
      this._lineEls.push(el);
    });
  }

  highlight(n) {
    const idx = n ? n - 1 : -1;
    if (idx === this.currentLine) return;
    if (this.currentLine >= 0 && this._lineEls[this.currentLine]) {
      this._lineEls[this.currentLine].classList.remove('active');
    }
    this.currentLine = idx;
    if (idx >= 0 && this._lineEls[idx]) {
      this._lineEls[idx].classList.add('active');
    }
  }

  clear() {
    this.lines = [];
    this.highlight(null);
    this.root.innerHTML = '';
    this._lineEls = [];
  }
}
