const CFG = {
  3: { walk: 60, w: 1, ms: 450, fs: '2.2rem' },
  4: { walk: 45, w: 2, ms: 300, fs: '1.8rem' },
  5: { walk: 55, w: 3, ms: 220, fs: '1.4rem' }
};

let N = 3, SOLVED, board, moves, start, timer, done;
let hintOn = false, hintPos = -1, path = null;
let auto = false, botUsed = false, tiles = {}, gid = 0;

const $ = (id) => document.getElementById(id);
const boardEl = $('board');

/* ---------- Utilitas ---------- */
function nbrs(z) {
  const r = [], x = z % N, y = (z / N) | 0;
  if (y > 0) r.push(z - N);
  if (y < N - 1) r.push(z + N);
  if (x > 0) r.push(z - 1);
  if (x < N - 1) r.push(z + 1);
  return r;
}

const key = (b) => b.map((v) => String.fromCharCode(65 + v)).join('');

function fmt(s) {
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function getBest() {
  try { return +localStorage.getItem('best_' + N) || 0; } catch (e) { return 0; }
}

function setBest(v) {
  try { localStorage.setItem('best_' + N, v); } catch (e) {}
}

function setMsg(t, win) {
  const m = $('msg');
  m.textContent = t;
  m.className = win ? 'win' : '';
}

/* Warna tombol: menyala sesuai status */
function updateButtons() {
  $('hintBtn').textContent = hintOn ? 'Hide Hint' : 'Show Hint';
  $('autoBtn').textContent = auto ? 'Stop' : 'Auto Play';
}

/* ---------- Papan ---------- */
function buildBoard() {
  boardEl.innerHTML = '';
  tiles = {};
  boardEl.style.setProperty('--fs', CFG[N].fs);
  for (let n = 1; n < N * N; n++) {
    const t = document.createElement('div');
    t.className = 'tile';
    t.style.width = t.style.height = 100 / N + '%';
    t.innerHTML = '<div>' + n + '</div>';
    t.addEventListener('click', () => tryMove(board.indexOf(n)));
    boardEl.appendChild(t);
    tiles[n] = t;
  }
}

function shuffle() {
  const b = SOLVED.slice();
  let z = N * N - 1, prev = -1;
  for (let i = 0; i < CFG[N].walk; i++) {
    const o = nbrs(z).filter((p) => p !== prev);
    const p = o[Math.floor(Math.random() * o.length)];
    b[z] = b[p];
    b[p] = 0;
    prev = z;
    z = p;
  }
  return key(b) === key(SOLVED) ? shuffle() : b;
}

function render() {
  for (let i = 0; i < N * N; i++) {
    const n = board[i];
    if (!n) continue;
    const t = tiles[n];
    t.style.left = ((i % N) * 100) / N + '%';
    t.style.top = (((i / N) | 0) * 100) / N + '%';
    t.classList.toggle('hint', hintOn && !done && i === hintPos);
  }
  $('moves').textContent = moves;
  const b = getBest();
  $('best').textContent = b ? fmt(b) : '–';
}

function newGame() {
  stopAuto();
  gid++;
  path = null;
  botUsed = false;
  hintPos = -1;
  board = shuffle();
  moves = 0;
  done = false;
  start = 0;
  clearInterval(timer);
  $('time').textContent = '0:00';
  setMsg('');
  render();
  updateHint();
}

function setLevel(n) {
  N = n;
  SOLVED = [...Array(N * N - 1).keys()].map((i) => i + 1).concat(0);
  document.querySelectorAll('#levels button').forEach((b) =>
    b.classList.toggle('on', +b.dataset.n === n)
  );
  buildBoard();
  newGame();
}

function tryMove(i, bot) {
  if (done) return;
  const z = board.indexOf(0);
  if (!nbrs(z).includes(i)) return;
  if (!bot) stopAuto();

  if (!start) {
    start = Date.now();
    timer = setInterval(() => {
      $('time').textContent = fmt(Math.floor((Date.now() - start) / 1000));
    }, 250);
  }

  if (path && path[0] === i) path.shift();
  else path = null;

  board[z] = board[i];
  board[i] = 0;
  moves++;
  hintPos = -1;

  /* Hint sekali pakai: mati otomatis setelah 1 langkah */
  if (hintOn) {
    hintOn = false;
    updateButtons();
    if (!auto) setMsg('');
  }

  if (key(board) === key(SOLVED)) {
    done = true;
    stopAuto();
    clearInterval(timer);
    const s = Math.floor((Date.now() - start) / 1000);
    $('time').textContent = fmt(s);
    if (botUsed) {
      setMsg('🤖 Bot menyelesaikan puzzle dalam ' + moves + ' langkah, ' + fmt(s) + '.', true);
    } else {
      const b = getBest();
      if (!b || s < b) setBest(s);
      setMsg('🎉 Selesai dalam ' + moves + ' langkah, ' + fmt(s) + '!', true);
    }
  } else {
    updateHint();
  }
  render();
}

document.addEventListener('keydown', (e) => {
  const d = { ArrowUp: N, ArrowDown: -N, ArrowLeft: 1, ArrowRight: -1 }[e.key];
  if (!d) return;
  e.preventDefault();
  const z = board.indexOf(0), i = z + d;
  if (i < 0 || i >= N * N) return;
  if (Math.abs(d) === 1 && ((i / N) | 0) !== ((z / N) | 0)) return;
  tryMove(i);
});

/* ---------- A* (Manhattan Distance + min-heap) ---------- */
function manh(b) {
  let h = 0;
  for (let i = 0; i < N * N; i++) {
    const v = b[i];
    if (v) {
      const g = v - 1;
      h += Math.abs((i % N) - (g % N)) + Math.abs(((i / N) | 0) - ((g / N) | 0));
    }
  }
  return h;
}

class Heap {
  constructor() { this.a = []; }

  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }

  pop() {
    const a = this.a, top = a[0], l = a.pop();
    if (a.length) {
      a[0] = l;
      let i = 0;
      for (;;) {
        let m = i;
        const L = 2 * i + 1, R = L + 1;
        if (L < a.length && a[L][0] < a[m][0]) m = L;
        if (R < a.length && a[R][0] < a[m][0]) m = R;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }

  get size() { return this.a.length; }
}

function astar(b0, w, cap) {
  const goal = key(SOLVED), heap = new Heap(), seen = new Map();
  const nodes = [{ b: b0, par: -1, pos: -1 }];
  heap.push([w * manh(b0), 0, 0]);
  seen.set(key(b0), 0);
  let exp = 0;

  while (heap.size) {
    const [, g, id] = heap.pop();
    const b = nodes[id].b, k = key(b);

    if (k === goal) {
      const p = [];
      for (let i = id; nodes[i].par >= 0; i = nodes[i].par) p.push(nodes[i].pos);
      return p.reverse();
    }
    if (g > seen.get(k)) continue;
    if (++exp > cap) return null;

    const z = b.indexOf(0);
    for (const p of nbrs(z)) {
      const nb = b.slice();
      nb[z] = nb[p];
      nb[p] = 0;
      const nk = key(nb), ng = g + 1;
      if (!seen.has(nk) || ng < seen.get(nk)) {
        seen.set(nk, ng);
        nodes.push({ b: nb, par: id, pos: p });
        heap.push([ng + w * manh(nb), ng, nodes.length - 1]);
      }
    }
  }
  return null;
}

function solve(b0) {
  for (const w of [CFG[N].w, 4, 12]) {
    const r = astar(b0, w, N === 3 ? 1e7 : 120000);
    if (r) return r;
  }
  return null;
}

function ensurePath(cb) {
  if (path) return cb();
  const g = gid, m = moves;
  setMsg('⏳ Bot sedang berpikir...');
  setTimeout(() => {
    if (g !== gid || m !== moves) return;
    path = solve(board.slice());
    if (path) cb();
    else setMsg('Bot tidak menemukan solusi, coba game baru.');
  }, 30);
}

/* ---------- Hint & Auto Play ---------- */
function updateHint() {
  hintPos = -1;
  if (done || !hintOn) return;
  ensurePath(() => {
    hintPos = path[0];
    setMsg('💡 Geser tile ' + board[hintPos] + '. Sisa ' + (N === 3 ? 'minimal ' : 'sekitar ') + path.length + ' langkah.');
    render();
  });
}

function stopAuto() {
  auto = false;
  updateButtons();
}

function startAuto() {
  if (done) return;
  auto = true;
  botUsed = true;
  updateButtons();
  (function step() {
    if (!auto || done) return;
    ensurePath(() => {
      if (!auto || done) return;
      setMsg('🤖 Bot bermain otomatis...');
      tryMove(path[0], true);
      setTimeout(step, CFG[N].ms);
    });
  })();
}

/* ---------- Event tombol ---------- */
$('hintBtn').addEventListener('click', () => {
  hintOn = !hintOn;
  updateButtons();
  if (!hintOn && !done && !auto) setMsg('');
  updateHint();
  render();
});

$('autoBtn').addEventListener('click', () => {
  if (auto) {
    stopAuto();
    setMsg('');
  } else {
    startAuto();
  }
});

$('newBtn').addEventListener('click', newGame);


const tombol = document.querySelectorAll('.btns button');
tombol.forEach((btn) => {
  btn.addEventListener('click', () => {
    tombol.forEach((b) => b.classList.remove('aktif'));
    btn.classList.add('aktif');
  });
});

document.querySelectorAll('#levels button').forEach((b) =>
  b.addEventListener('click', () => setLevel(+b.dataset.n))
);

setLevel(3);
