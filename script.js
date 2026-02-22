/* =============================================
   SHADOWGRID CIPHER — script.js
   ============================================= */

// ===================== CONSTANTS =====================

const NUM_TO_LETTER = { '1': 'K', '2': 'R', '3': 'X', '4': 'M', '5': 'Q' };
const LETTER_TO_NUM = { 'K': '1', 'R': '2', 'X': '3', 'M': '4', 'Q': '5' };

// Noise pairs pool — any 2-letter combo not used by real cipher output
const NOISE_PAIRS = [
  'ZZ','AA','BB','CC','DD','EE','FF','GG',
  'HH','II','NN','PP','SS','TT','UU','WW','YY'
];

let noiseIdx = 0;

/** Returns the next noise pair from the pool (cycles if exhausted) */
function getNoisePair() {
  const pair = NOISE_PAIRS[noiseIdx % NOISE_PAIRS.length];
  noiseIdx++;
  return pair;
}


// ===================== GRID =====================

/**
 * Builds the 5×5 cipher grid from a keyword.
 * - Uppercases and replaces J with I
 * - Deduplicates keyword letters
 * - Fills remaining cells with unused alphabet letters (A–Z, no J)
 * @param {string} keyword
 * @returns {{ keyword: string, letters: string }} deduplicated keyword + 25-letter grid string
 */
function buildGrid(keyword) {
  keyword = keyword.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');

  const seen = new Set();
  let kw = '';

  for (const char of keyword) {
    if (!seen.has(char)) { seen.add(char); kw += char; }
  }

  const alphabet = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'; // 25 letters, no J
  let gridStr = kw;

  for (const char of alphabet) {
    if (!seen.has(char)) { seen.add(char); gridStr += char; }
  }

  return { keyword: kw, letters: gridStr.slice(0, 25) };
}

/**
 * Returns row/column (1-indexed) of a letter in the grid.
 * @param {string} letter
 * @param {string} gridLetters  — 25-char grid string
 * @returns {{ row: number, col: number } | null}
 */
function getCoords(letter, gridLetters) {
  letter = letter.toUpperCase();
  if (letter === 'J') letter = 'I';
  const idx = gridLetters.indexOf(letter);
  if (idx === -1) return null;
  return { row: Math.floor(idx / 5) + 1, col: (idx % 5) + 1 };
}

/**
 * Returns the letter at a given row/column in the grid.
 * @param {number} row
 * @param {number} col
 * @param {string} gridLetters
 * @returns {string | null}
 */
function getLetter(row, col, gridLetters) {
  const idx = (row - 1) * 5 + (col - 1);
  return gridLetters[idx] || null;
}


// ===================== RENDER GRID =====================

/**
 * Renders the 5×5 grid into #cipher-grid and updates the sidebar info panel.
 * @param {{ keyword: string, letters: string }} gridData
 * @param {string[]} highlight  — letters to visually highlight (used during encryption)
 */
function renderGrid(gridData, highlight = []) {
  const { keyword, letters } = gridData;
  const container = document.getElementById('cipher-grid');
  container.innerHTML = '';

  // Empty corner cell
  const corner = document.createElement('div');
  corner.className = 'grid-header';
  container.appendChild(corner);

  // Column headers (1–5)
  for (let col = 1; col <= 5; col++) {
    const h = document.createElement('div');
    h.className = 'grid-header';
    h.textContent = col;
    container.appendChild(h);
  }

  // Grid rows
  for (let row = 1; row <= 5; row++) {
    // Row header
    const rh = document.createElement('div');
    rh.className = 'grid-row-header';
    rh.textContent = row;
    container.appendChild(rh);

    // Cells
    for (let col = 1; col <= 5; col++) {
      const idx = (row - 1) * 5 + (col - 1);
      const letter = letters[idx];
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      if (keyword.includes(letter))  cell.classList.add('keyword-letter');
      if (highlight.includes(letter)) cell.classList.add('highlight');
      cell.textContent = letter === 'I' ? 'I/J' : letter;
      container.appendChild(cell);
    }
  }

  // Sidebar info
  const info = document.getElementById('grid-info');
  info.innerHTML = `
    <strong>KEYWORD:</strong> ${keyword.split('').join(' ')}<br>
    <strong>GRID ORDER:</strong><br>
    ${letters.match(/.{1,5}/g)
      .map((rowStr, i) => `<span style="color:var(--dim)">ROW ${i + 1}:</span> ${rowStr.split('').join(' ')}`)
      .join('<br>')}
    <br><br>
    <span style="color:var(--dim-green)">■</span> KEYWORD LETTERS<br>
    <span style="color:var(--dim)">□</span> FILL LETTERS
  `;
}


// ===================== KEYWORD INPUT =====================

document.getElementById('keyword').addEventListener('input', function () {
  const kw = this.value;

  if (!kw.trim()) {
    document.getElementById('keyword-clean').value = '';
    document.getElementById('cipher-grid').innerHTML = '';
    document.getElementById('grid-info').innerHTML = 'Build a keyword to generate the grid.';
    return;
  }

  const gridData = buildGrid(kw);
  document.getElementById('keyword-clean').value = gridData.keyword;
  renderGrid(gridData);
});


// ===================== ENCRYPT =====================

function encrypt() {
  const kw  = document.getElementById('keyword').value.trim();
  const msg = document.getElementById('plaintext').value.trim();

  if (!kw) {
    document.getElementById('keyword-error').classList.add('visible');
    return;
  }
  document.getElementById('keyword-error').classList.remove('visible');
  if (!msg) return;

  const gridData = buildGrid(kw);
  const letters  = gridData.letters;

  // Step 1 — Strip non-alpha and uppercase
  const clean = msg.toUpperCase().replace(/[^A-Z]/g, '');

  // Step 2 — Replace J with I
  const noJ = clean.replace(/J/g, 'I');

  // Step 3 — Convert letters to grid coordinates
  const coords = [];
  for (const char of noJ) {
    const co = getCoords(char, letters);
    if (co) coords.push(`${co.row}${co.col}`);
  }

  // Step 4 — Convert coordinate digits to letter pairs
  const letterPairs = coords.map(pair => NUM_TO_LETTER[pair[0]] + NUM_TO_LETTER[pair[1]]);

  // Step 5 — Insert noise: after every 2 real pairs, add 1 noise pair
  noiseIdx = 0;
  const withNoise = [];
  let realCount = 0;

  for (let i = 0; i < letterPairs.length; i++) {
    withNoise.push({ pair: letterPairs[i], noise: false });
    realCount++;

    if (realCount === 2) {
      withNoise.push({ pair: getNoisePair(), noise: true });
      realCount = 0;
    }
  }

  // Step 6 — Join into final string
  const finalStr = withNoise.map(x => x.pair).join('');

  // --- Update Steps Trace ---
  document.getElementById('steps-enc').innerHTML = `
    <div class="step-row">
      <div class="step-label">STEP 1 — CLEAN</div>
      <div class="step-value">${clean}</div>
    </div>
    <div class="step-row">
      <div class="step-label">STEP 2 — J→I</div>
      <div class="step-value">${noJ}</div>
    </div>
    <div class="step-row">
      <div class="step-label">STEP 3 — COORDS</div>
      <div class="step-value">${coords.join(' ')}</div>
    </div>
    <div class="step-row">
      <div class="step-label">STEP 4 — PAIRS</div>
      <div class="step-value">${letterPairs.join(' ')}</div>
    </div>
    <div class="step-row">
      <div class="step-label">STEP 5 — NOISE</div>
      <div class="step-value">
        ${withNoise.map(x =>
          x.noise
            ? `<span class="noise-pair">${x.pair}</span>`
            : `<span class="real-pair">${x.pair}</span>`
        ).join(' ')}
      </div>
    </div>
    <div class="step-row">
      <div class="step-label">STEP 6 — OUTPUT</div>
      <div class="step-value" style="color:var(--green);letter-spacing:2px;">${finalStr}</div>
    </div>
  `;

  // --- Update Output Box ---
  const outEl = document.getElementById('output-enc');
  outEl.classList.remove('empty');
  outEl.innerHTML = finalStr + `<button class="copy-btn" onclick="copyOutput('output-enc')">COPY</button>`;

  // Highlight used letters in the grid
  renderGrid(gridData, [...new Set(noJ.split(''))]);
}


// ===================== DECRYPT =====================

function decrypt() {
  const kw  = document.getElementById('keyword').value.trim();
  const raw = document.getElementById('ciphertext').value.trim().toUpperCase().replace(/[^A-Z]/g, '');

  if (!kw) {
    document.getElementById('keyword-error').classList.add('visible');
    return;
  }
  document.getElementById('keyword-error').classList.remove('visible');
  if (!raw) return;

  const gridData = buildGrid(kw);
  const letters  = gridData.letters;

  // Step 1 — Split into 2-letter pairs
  const allPairs = raw.match(/.{1,2}/g) || [];

  // Step 2 — Remove noise: every 3rd pair (index 2, 5, 8...) is fake
  const realPairs = [];
  const annotated = allPairs.map((pair, idx) => {
    const isNoise = (idx + 1) % 3 === 0;
    if (!isNoise) realPairs.push(pair);
    return { pair, noise: isNoise };
  });

  // Step 3 — Convert letter pairs back to coordinate numbers
  const numPairs = realPairs.map(pair => {
    const d1 = LETTER_TO_NUM[pair[0]];
    const d2 = LETTER_TO_NUM[pair[1]];
    if (!d1 || !d2) return null;
    return `${d1}${d2}`;
  }).filter(Boolean);

  // Step 4 — Look up letters from grid coordinates
  const decoded = numPairs.map(pair => {
    return getLetter(parseInt(pair[0]), parseInt(pair[1]), letters) || '?';
  }).join('');

  // --- Update Steps Trace ---
  document.getElementById('steps-dec').innerHTML = `
    <div class="step-row">
      <div class="step-label">STEP 1 — SPLIT</div>
      <div class="step-value">${allPairs.join(' ')}</div>
    </div>
    <div class="step-row">
      <div class="step-label">STEP 2 — DE-NOISE</div>
      <div class="step-value">
        ${annotated.map(x =>
          x.noise
            ? `<span class="noise-pair">${x.pair}</span>`
            : `<span class="real-pair">${x.pair}</span>`
        ).join(' ')}
      </div>
    </div>
    <div class="step-row">
      <div class="step-label">STEP 3 — NUMBERS</div>
      <div class="step-value">${numPairs.join(' ')}</div>
    </div>
    <div class="step-row">
      <div class="step-label">STEP 4 — DECODED</div>
      <div class="step-value" style="color:var(--green);letter-spacing:2px;">${decoded}</div>
    </div>
  `;

  // --- Update Output Box ---
  const outEl = document.getElementById('output-dec');
  outEl.classList.remove('empty');
  outEl.textContent = decoded;

  renderGrid(gridData);
}


// ===================== UI HELPERS =====================

/** Switch between Encrypt and Decrypt tabs */
function switchTab(mode) {
  document.getElementById('section-enc').style.display = mode === 'enc' ? '' : 'none';
  document.getElementById('section-dec').style.display = mode === 'dec' ? '' : 'none';
  document.getElementById('tab-enc').classList.toggle('active', mode === 'enc');
  document.getElementById('tab-dec').classList.toggle('active', mode === 'dec');
}

// Track toggle state per mode
const showSteps = { enc: false, dec: false };

/** Toggle the step trace panel visibility */
function toggleSteps(mode) {
  showSteps[mode] = !showSteps[mode];
  document.getElementById(`toggle-${mode}`).classList.toggle('on', showSteps[mode]);
  document.getElementById(`steps-${mode}`).classList.toggle('visible', showSteps[mode]);
}

/** Clear input and output for a given mode */
function clearAll(mode) {
  if (mode === 'enc') {
    document.getElementById('plaintext').value = '';
    const o = document.getElementById('output-enc');
    o.classList.add('empty');
    o.innerHTML = `— AWAITING INPUT —<button class="copy-btn" onclick="copyOutput('output-enc')" style="display:none">COPY</button>`;
    document.getElementById('steps-enc').innerHTML = '';
  } else {
    document.getElementById('ciphertext').value = '';
    const o = document.getElementById('output-dec');
    o.classList.add('empty');
    o.textContent = '— AWAITING INPUT —';
    document.getElementById('steps-dec').innerHTML = '';
  }
}

/** Copy the text content of an output box to clipboard */
function copyOutput(id) {
  const el   = document.getElementById(id);
  const text = el.textContent.replace('COPY', '').trim();
  navigator.clipboard.writeText(text).then(() => {
    const btn = el.querySelector('.copy-btn');
    if (btn) {
      btn.textContent = 'COPIED!';
      setTimeout(() => btn.textContent = 'COPY', 1500);
    }
  });
}

/** Live clock in the header status bar */
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent =
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
}

setInterval(updateClock, 1000);
updateClock();


// ===================== INIT =====================

window.addEventListener('load', () => {
  const kw = document.getElementById('keyword').value;
  if (kw) {
    const gridData = buildGrid(kw);
    document.getElementById('keyword-clean').value = gridData.keyword;
    renderGrid(gridData);
  }
});
