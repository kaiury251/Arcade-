const W = 800, H = 600;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const keys = {};
const norm = k => (k.length === 1 ? k.toLowerCase() : k);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let scene;

function setScene(s) { scene = s; if (s.init) s.init(); }

function txt(s, x, y, size, color, align) {
  ctx.fillStyle = color || '#fff';
  ctx.font = 'bold ' + size + 'px system-ui, sans-serif';
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function best(name, v) {
  try {
    const cur = +localStorage.getItem(name) || 0;
    if (v !== undefined && v > cur) { localStorage.setItem(name, v); return v; }
    return cur;
  } catch (e) { return v || 0; }
}

addEventListener('keydown', e => {
  const k = norm(e.key);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();
  keys[k] = true;
  if (k === 'Escape' && scene !== menu) { setScene(menu); return; }
  if (scene.key) scene.key(k, e.repeat);
});
addEventListener('keyup', e => { keys[norm(e.key)] = false; });
cv.addEventListener('pointerdown', () => { if (scene.key) scene.key(' ', false); });

/* ---------------- FLAPPY BIRD ---------------- */
const flappy = {
  init() {
    this.y = H / 2; this.vy = 0; this.pipes = []; this.t = 0;
    this.score = 0; this.state = 'ready'; this.gx = 0; this.deadT = 0;
  },
  key(k, rep) {
    if (rep) return;
    if (k === ' ' || k === 'ArrowUp' || k === 'w') {
      if (this.state === 'ready') this.state = 'play';
      if (this.state === 'play') this.vy = -420;
      else if (this.state === 'dead' && this.deadT > 0.4) this.init();
    }
  },
  die() {
    this.state = 'dead'; this.deadT = 0;
    best('flappy', this.score);
  },
  update(dt) {
    const R = 14, GROUND = H - 60, GAP = 160;
    if (this.state === 'ready') { this.y = H / 2 + Math.sin(performance.now() / 200) * 8; this.gx = (this.gx + dt * 160) % 40; return; }
    if (this.state === 'dead') {
      this.deadT += dt;
      this.vy += 1500 * dt;
      this.y = Math.min(this.y + this.vy * dt, GROUND - R);
      return;
    }
    this.gx = (this.gx + dt * 160) % 40;
    this.vy += 1500 * dt;
    this.y += this.vy * dt;
    this.t += dt;
    if (this.t > 1.5) {
      this.t = 0;
      this.pipes.push({ x: W, gy: 70 + Math.random() * (GROUND - 140 - GAP), passed: false });
    }
    for (const p of this.pipes) {
      p.x -= 160 * dt;
      if (!p.passed && p.x + 70 < 130) { p.passed = true; this.score++; }
      if (130 + R > p.x && 130 - R < p.x + 70 && (this.y - R < p.gy || this.y + R > p.gy + GAP)) this.die();
    }
    this.pipes = this.pipes.filter(p => p.x > -80);
    if (this.y + R >= GROUND) { this.y = GROUND - R; this.die(); }
    if (this.y - R < 0) { this.y = R; this.vy = 0; }
  },
  draw() {
    const GROUND = H - 60, GAP = 160;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#4ec0ca'); g.addColorStop(1, '#bfe9ee');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const p of this.pipes) {
      ctx.fillStyle = '#5ab52c';
      ctx.fillRect(p.x, 0, 70, p.gy);
      ctx.fillRect(p.x, p.gy + GAP, 70, GROUND - p.gy - GAP);
      ctx.fillStyle = '#3f8a1c';
      ctx.fillRect(p.x - 4, p.gy - 24, 78, 24);
      ctx.fillRect(p.x - 4, p.gy + GAP, 78, 24);
    }
    ctx.fillStyle = '#ded895'; ctx.fillRect(0, GROUND, W, 60);
    ctx.fillStyle = '#73bf2e'; ctx.fillRect(0, GROUND, W, 14);
    ctx.fillStyle = '#5a9a22';
    for (let x = -this.gx; x < W; x += 40) ctx.fillRect(x, GROUND, 20, 14);
    // pássaro
    ctx.save();
    ctx.translate(130, this.y);
    ctx.rotate(clamp(this.vy / 700, -0.5, 1.2));
    ctx.fillStyle = '#fbd000';
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(5, -5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(7, -5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7541e'; ctx.fillRect(8, 2, 12, 6);
    ctx.restore();
    txt(String(this.score), W / 2, 70, 64, '#fff');
    if (this.state === 'ready') {
      txt('FLAPPY BIRD', W / 2, 200, 48, '#fff');
      txt('Espaço, seta cima ou clique para voar', W / 2, 260, 22, '#fff');
    }
    if (this.state === 'dead') {
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H);
      txt('Fim de jogo', W / 2, 230, 52);
      txt('Pontos: ' + this.score + '   Recorde: ' + best('flappy'), W / 2, 295, 26);
      txt('Espaço para jogar de novo  •  Esc = menu', W / 2, 345, 20);
    }
  }
};

/* ---------------- PONG ---------------- */
const pong = {
  PH: 90,
  init() {
    this.p = H / 2; this.a = H / 2; this.ps = 0; this.as = 0;
    this.state = 'serve'; this.dir = 1; this.resetBall();
  },
  resetBall() { this.bx = W / 2; this.by = H / 2; this.bvx = 0; this.bvy = 0; },
  key(k, rep) {
    if (rep) return;
    if (k === ' ' || k === 'Enter') {
      if (this.state === 'serve') {
        const ang = (Math.random() - 0.5) * 0.8;
        this.bvx = Math.cos(ang) * 320 * this.dir;
        this.bvy = Math.sin(ang) * 320;
        this.state = 'play';
      } else if (this.state === 'over') this.init();
    }
  },
  bounce(py, dirx, nx) {
    const off = (this.by - py) / (this.PH / 2);
    const sp = Math.min(Math.hypot(this.bvx, this.bvy) * 1.06, 720);
    const ang = off * 0.9;
    this.bvx = Math.cos(ang) * sp * dirx;
    this.bvy = Math.sin(ang) * sp;
    this.bx = nx;
  },
  point(playerScored) {
    if (playerScored) { this.ps++; this.dir = 1; } else { this.as++; this.dir = -1; }
    if (this.ps >= 7 || this.as >= 7) { this.state = 'over'; best('pong', this.ps >= 7 ? 1 : 0); }
    else this.state = 'serve';
    this.resetBall();
  },
  update(dt) {
    const PH = this.PH;
    if (keys.ArrowUp || keys.w) this.p -= 440 * dt;
    if (keys.ArrowDown || keys.s) this.p += 440 * dt;
    this.p = clamp(this.p, PH / 2, H - PH / 2);
    const target = this.state === 'play' && this.bvx > 0 ? this.by : H / 2;
    this.a += clamp(target - this.a, -330 * dt, 330 * dt);
    this.a = clamp(this.a, PH / 2, H - PH / 2);
    if (this.state !== 'play') return;
    this.bx += this.bvx * dt; this.by += this.bvy * dt;
    if (this.by < 6) { this.by = 6; this.bvy = Math.abs(this.bvy); }
    if (this.by > H - 6) { this.by = H - 6; this.bvy = -Math.abs(this.bvy); }
    if (this.bvx < 0 && this.bx - 6 < 42 && this.bx - 6 > 20 && Math.abs(this.by - this.p) < PH / 2 + 6) this.bounce(this.p, 1, 48);
    if (this.bvx > 0 && this.bx + 6 > W - 42 && this.bx + 6 < W - 20 && Math.abs(this.by - this.a) < PH / 2 + 6) this.bounce(this.a, -1, W - 48);
    if (this.bx < -20) this.point(false);
    else if (this.bx > W + 20) this.point(true);
  },
  draw() {
    ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#26324f';
    for (let y = 10; y < H; y += 40) ctx.fillRect(W / 2 - 2, y, 4, 20);
    ctx.fillStyle = '#e8eefc';
    ctx.fillRect(30, this.p - this.PH / 2, 12, this.PH);
    ctx.fillRect(W - 42, this.a - this.PH / 2, 12, this.PH);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(this.bx - 6, this.by - 6, 12, 12);
    txt(String(this.ps), W / 2 - 80, 60, 56, '#7c8db5');
    txt(String(this.as), W / 2 + 80, 60, 56, '#7c8db5');
    if (this.state === 'serve') txt('Espaço para sacar  •  W/S ou setas para mover', W / 2, H - 40, 20, '#7c8db5');
    if (this.state === 'over') {
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
      txt(this.ps >= 7 ? 'Você venceu!' : 'Você perdeu', W / 2, 250, 54);
      txt('Espaço para jogar de novo  •  Esc = menu', W / 2, 320, 22);
    }
  }
};

/* ---------------- TETRIS ---------------- */
const PIECES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
};
const COL = { I: '#22d3ee', O: '#facc15', T: '#a855f7', S: '#22c55e', Z: '#ef4444', J: '#3b82f6', L: '#f97316' };

function cell(x, y, s, col) {
  ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 1, y + 1, s - 2, 4);
}

const tetris = {
  init() {
    this.b = Array.from({ length: 20 }, () => Array(10).fill(null));
    this.score = 0; this.lines = 0; this.level = 1;
    this.over = false; this.paused = false; this.bag = []; this.t = 0;
    this.next = this.pull(); this.spawn();
  },
  pull() {
    if (!this.bag.length) this.bag = Object.keys(PIECES).sort(() => Math.random() - 0.5);
    const k = this.bag.pop();
    return { k, m: PIECES[k].map(r => [...r]) };
  },
  spawn() {
    this.cur = this.next; this.next = this.pull();
    this.x = Math.floor((10 - this.cur.m[0].length) / 2); this.y = 0;
    if (this.hit(this.cur.m, this.x, this.y)) { this.over = true; best('tetris', this.score); }
  },
  hit(m, x, y) {
    for (let r = 0; r < m.length; r++)
      for (let c = 0; c < m[r].length; c++)
        if (m[r][c]) {
          const nx = x + c, ny = y + r;
          if (nx < 0 || nx >= 10 || ny >= 20) return true;
          if (ny >= 0 && this.b[ny][nx]) return true;
        }
    return false;
  },
  tryRot() {
    const m = this.cur.m[0].map((_, c) => this.cur.m.map(r => r[c]).reverse());
    for (const dx of [0, -1, 1, -2, 2])
      if (!this.hit(m, this.x + dx, this.y)) { this.cur.m = m; this.x += dx; return; }
  },
  move(dx) { if (!this.hit(this.cur.m, this.x + dx, this.y)) this.x += dx; },
  drop() {
    if (!this.hit(this.cur.m, this.x, this.y + 1)) { this.y++; return true; }
    this.lock(); return false;
  },
  lock() {
    const m = this.cur.m;
    for (let r = 0; r < m.length; r++)
      for (let c = 0; c < m[r].length; c++)
        if (m[r][c] && this.y + r >= 0) this.b[this.y + r][this.x + c] = this.cur.k;
    const keep = this.b.filter(row => row.some(v => !v));
    const n = 20 - keep.length;
    if (n) {
      this.b = [...Array.from({ length: n }, () => Array(10).fill(null)), ...keep];
      this.lines += n;
      this.score += [0, 100, 300, 500, 800][n] * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
    }
    this.spawn();
  },
  key(k) {
    if (this.over) { if (k === ' ' || k === 'Enter') this.init(); return; }
    if (k === 'p') { this.paused = !this.paused; return; }
    if (this.paused) return;
    if (k === 'ArrowLeft' || k === 'a') this.move(-1);
    else if (k === 'ArrowRight' || k === 'd') this.move(1);
    else if (k === 'ArrowUp' || k === 'w') this.tryRot();
    else if (k === ' ') { let d = 0; while (this.y >= 0 && !this.hit(this.cur.m, this.x, this.y + 1)) { this.y++; d++; } this.score += d * 2; this.lock(); }
  },
  update(dt) {
    if (this.over || this.paused) return;
    let interval = Math.max(0.08, 0.8 - (this.level - 1) * 0.07);
    const soft = keys.ArrowDown || keys.s;
    if (soft) interval = Math.min(interval, 0.04);
    this.t += dt;
    while (this.t >= interval && !this.over) {
      this.t -= interval;
      if (this.drop() && soft) this.score += 1;
    }
  },
  draw() {
    const X = 250;
    ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#111a33'; ctx.fillRect(X, 0, 300, 600);
    ctx.strokeStyle = '#18233f'; ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(X + i * 30, 0); ctx.lineTo(X + i * 30, 600); ctx.stroke(); }
    for (let i = 1; i < 20; i++) { ctx.beginPath(); ctx.moveTo(X, i * 30); ctx.lineTo(X + 300, i * 30); ctx.stroke(); }
    for (let r = 0; r < 20; r++)
      for (let c = 0; c < 10; c++)
        if (this.b[r][c]) cell(X + c * 30, r * 30, 30, COL[this.b[r][c]]);
    if (!this.over) {
      let gy = this.y;
      while (!this.hit(this.cur.m, this.x, gy + 1)) gy++;
      const m = this.cur.m;
      for (let r = 0; r < m.length; r++)
        for (let c = 0; c < m[r].length; c++)
          if (m[r][c]) {
            ctx.globalAlpha = 0.2; cell(X + (this.x + c) * 30, (gy + r) * 30, 30, COL[this.cur.k]);
            ctx.globalAlpha = 1; cell(X + (this.x + c) * 30, (this.y + r) * 30, 30, COL[this.cur.k]);
          }
    }
    txt('PONTOS', 125, 90, 18, '#7c8db5'); txt(String(this.score), 125, 125, 34);
    txt('NÍVEL', 125, 200, 18, '#7c8db5'); txt(String(this.level), 125, 235, 34);
    txt('LINHAS', 125, 310, 18, '#7c8db5'); txt(String(this.lines), 125, 345, 34);
    txt('RECORDE', 125, 420, 18, '#7c8db5'); txt(String(best('tetris')), 125, 455, 28);
    txt('PRÓXIMA', 675, 90, 18, '#7c8db5');
    const nm = this.next.m, off = 675 - (nm[0].length * 24) / 2;
    for (let r = 0; r < nm.length; r++)
      for (let c = 0; c < nm[r].length; c++)
        if (nm[r][c]) cell(off + c * 24, 130 + r * 24, 24, COL[this.next.k]);
    txt('P = pausa  •  Esc = menu', 675, 560, 15, '#4a5a80');
    if (this.paused || this.over) {
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(X, 0, 300, 600);
      txt(this.over ? 'Fim de jogo' : 'Pausado', 400, 270, 36);
      if (this.over) txt('Espaço para reiniciar', 400, 320, 20);
    }
  }
};

/* ---------------- MENU ---------------- */
const menu = {
  items: [['Flappy Bird', () => flappy], ['Pong', () => pong], ['Tetris', () => tetris]],
  sel: 0,
  key(k) {
    if (k === 'ArrowUp') this.sel = (this.sel + 2) % 3;
    else if (k === 'ArrowDown') this.sel = (this.sel + 1) % 3;
    else if (k === '1' || k === '2' || k === '3') setScene(this.items[+k - 1][1]());
    else if (k === 'Enter' || k === ' ') setScene(this.items[this.sel][1]());
  },
  update() {},
  draw() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b1020'); g.addColorStop(1, '#1a1040');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    txt('ARCADE 3 EM 1', W / 2, 130, 56, '#fff');
    this.items.forEach((it, i) => {
      const y = 260 + i * 80, on = i === this.sel;
      ctx.fillStyle = on ? '#22c55e' : '#16213f';
      ctx.beginPath(); ctx.roundRect(W / 2 - 180, y - 28, 360, 56, 14); ctx.fill();
      txt((i + 1) + '  ' + it[0], W / 2, y, 28, on ? '#04210f' : '#c9d4f0');
    });
    txt('Setas + Enter, ou teclas 1 / 2 / 3  •  F11 = tela cheia', W / 2, H - 40, 18, '#7c8db5');
  }
};

let last = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  scene.update(dt);
  scene.draw();
  requestAnimationFrame(loop);
}
setScene(menu);
requestAnimationFrame(loop);
