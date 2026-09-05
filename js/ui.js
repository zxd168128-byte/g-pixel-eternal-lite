/** DOM helpers & shared UI widgets */
window.UI = {
  $(sel, root) { return (root || document).querySelector(sel); },
  $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); },

  toast(msg) {
    let el = this.$('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.getElementById('app').appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('show'), 1800);
  },

  pixel(unit, size) {
    if (!unit) return '<div class="pixel-unit ' + (size || '') + '" style="background:#333">?</div>';
    const cls = 'pixel-unit ' + (size || '');
    let src = null;
    try {
      if (window.Sprites && Sprites.generate) src = Sprites.generate(unit);
    } catch (e) { src = null; }
    if (src) {
      return '<div class="' + cls + '" title="' + (unit.name || '') + '"><img src="' + src + '" alt="' + (unit.letter || '') + '"/></div>';
    }
    return '<div class="' + cls + '" style="background:' + (unit.color || '#333') + '">' + (unit.letter || '?') + '</div>';
  },

  stars(n) {
    return '★'.repeat(n || 0) + '☆'.repeat(Math.max(0, 3 - (n || 0)));
  },

  rarityBadge(r) {
    return '<span class="rarity-' + r + '">' + r + '</span>';
  },

  updateTopbar() {
    GameState.regenAp();
    const d = GameState.data;
    const el = this.$('#res-line');
    if (el) {
      el.innerHTML =
        '<span>💎 ' + d.diamonds + '</span>' +
        '<span class="ap">AP ' + d.ap + '/' + d.apMax + '</span>' +
        '<span style="color:#8b949e">材 ' + d.mats + '</span>';
    }
  },

  showModal(html, opts) {
    opts = opts || {};
    this.hideModal();
    const bg = document.createElement('div');
    bg.className = 'modal-bg' + (opts.center ? ' center' : '');
    bg.id = 'modal-bg';
    bg.innerHTML = '<div class="modal">' + html + '</div>';
    bg.addEventListener('click', (e) => {
      if (e.target === bg && !opts.sticky) this.hideModal();
    });
    document.getElementById('app').appendChild(bg);
    return bg;
  },

  hideModal() {
    const bg = this.$('#modal-bg');
    if (bg) bg.remove();
  },

  confirm(msg, onYes) {
    this.showModal(
      '<h2>确认</h2><p class="hint">' + msg + '</p>' +
      '<div class="actions">' +
      '<button class="btn ghost" id="m-no">取消</button>' +
      '<button class="btn" id="m-yes">确定</button></div>',
      { center: true }
    );
    this.$('#m-no').onclick = () => this.hideModal();
    this.$('#m-yes').onclick = () => { this.hideModal(); onYes && onYes(); };
  },
};
