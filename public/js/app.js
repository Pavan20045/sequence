// ===== SEQUENCE GAME — CLIENT =====
const backendUrl = window.location.hostname.includes('vercel.app') 
  ? 'https://pavanrocks2045-sequence.hf.space' 
  : undefined;
const socket = io(backendUrl);

// ===== CONSTANTS =====
const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_COLORS = { S: 'black', H: 'red', D: 'red', C: 'black' };
const RANK_DISPLAY = { '2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9','T':'10','J':'J','Q':'Q','K':'K','A':'A' };
const TEAM_NAMES = ['Blue', 'Green', 'Red'];
const TEAM_CLASSES = ['team-0', 'team-1', 'team-2'];
const TEAM_COLORS_CSS = ['var(--team-blue)', 'var(--team-green)', 'var(--team-red)'];

// ===== STATE =====
let state = {
  roomCode: null,
  myId: null,
  myTeam: null,
  selectedCardIndex: null,
  board: null,
  hand: [],
  players: [],
  currentPlayerId: null,
  gameOver: false,
  sequences: [],
  numTeams: 2
};

// ===== DOM REFS =====
const $ = id => document.getElementById(id);
const views = {
  lobby: $('lobby-view'),
  waiting: $('waiting-view'),
  game: $('game-view')
};

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  state.myId = socket.id;
  createParticles($('bg-particles'), 30);
  createParticles($('bg-particles-2'), 20);

  // Check URL for room code
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room');
  if (roomParam) {
    $('room-code-input').value = roomParam;
  }

  // Event listeners
  $('create-btn').addEventListener('click', createRoom);
  $('join-btn').addEventListener('click', joinRoom);
  $('player-name').addEventListener('keypress', e => { if (e.key === 'Enter') createRoom(); });
  $('room-code-input').addEventListener('keypress', e => { if (e.key === 'Enter') joinRoom(); });
  $('copy-code-btn').addEventListener('click', () => copyText(state.roomCode));
  $('copy-link-btn').addEventListener('click', () => copyText($('share-link').value));
  $('start-btn').addEventListener('click', () => socket.emit('start-game'));
  $('play-again-btn').addEventListener('click', () => {
    socket.emit('restart-game');
    $('gameover-overlay').classList.remove('active');
  });

  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const team = parseInt(btn.dataset.team);
      state.myTeam = team;
      socket.emit('select-team', { team });
    });
  });
});

socket.on('connect', () => { state.myId = socket.id; });

// ===== VIEW MANAGEMENT =====
function showView(name) {
  Object.values(views).forEach(v => v.classList.remove('active'));
  views[name]?.classList.add('active');
}

// ===== ROOM MANAGEMENT =====
function createRoom() {
  const name = $('player-name').value.trim();
  if (!name) return showToast('Enter your name!', true);
  socket.emit('create-room', { playerName: name });
}

function joinRoom() {
  const name = $('player-name').value.trim();
  const code = $('room-code-input').value.trim();
  if (!name) return showToast('Enter your name!', true);
  if (!code) return showToast('Enter room code!', true);
  socket.emit('join-room', { roomCode: code, playerName: name });
}

socket.on('room-created', ({ roomCode }) => {
  state.roomCode = roomCode;
  $('display-room-code').textContent = roomCode;
  $('share-link').value = `${window.location.origin}?room=${roomCode}`;
  $('game-room-code').textContent = roomCode;
  showView('waiting');
});

socket.on('room-joined', ({ roomCode }) => {
  state.roomCode = roomCode;
  $('display-room-code').textContent = roomCode;
  $('share-link').value = `${window.location.origin}?room=${roomCode}`;
  $('game-room-code').textContent = roomCode;
  showView('waiting');
});

socket.on('room-state', ({ players, started }) => {
  state.players = players;
  renderPlayerList(players);
  // Show start button only for host
  const me = players.find(p => p.id === state.myId);
  if (me) state.myTeam = me.team;
  $('start-btn').style.display = (me?.isHost && !started) ? 'block' : 'none';
  $('player-count').textContent = players.length;

  // Update team button states
  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.classList.toggle('active-team', parseInt(btn.dataset.team) === state.myTeam);
  });
});

function renderPlayerList(players) {
  const list = $('player-list');
  list.innerHTML = '';
  players.forEach(p => {
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'player-dot';
    if (p.team !== null) {
      const colors = ['var(--team-blue)', 'var(--team-green)', 'var(--team-red)'];
      dot.style.background = colors[p.team];
      dot.style.boxShadow = `0 0 8px ${colors[p.team]}`;
    } else {
      dot.style.background = 'var(--text-muted)';
    }
    li.appendChild(dot);
    li.appendChild(document.createTextNode(p.name));
    if (p.isHost) {
      const badge = document.createElement('span');
      badge.className = 'player-host';
      badge.textContent = '👑 Host';
      li.appendChild(badge);
    }
    if (p.id === state.myId) {
      const youBadge = document.createElement('span');
      youBadge.style.cssText = 'margin-left:auto;font-size:11px;color:var(--accent-purple);';
      youBadge.textContent = '(You)';
      li.appendChild(youBadge);
    }
    list.appendChild(li);
  });
}

// ===== GAME START & SHUFFLE =====
socket.on('game-starting', () => {
  playShuffleAnimation();
});

function playShuffleAnimation() {
  const overlay = $('shuffle-overlay');
  const container = $('shuffle-container');
  const textEl = $('shuffle-text');

  overlay.classList.add('active');
  container.innerHTML = '';
  textEl.className = '';
  textEl.textContent = '';

  const numCards = 18;
  const cards = [];
  for (let i = 0; i < numCards; i++) {
    const card = document.createElement('div');
    card.className = 'shuffle-card';
    card.style.zIndex = i;
    card.style.transform = `translate(-50%, -50%) translateY(${-i * 2}px)`;
    container.appendChild(card);
    cards.push(card);
  }

  // Phase 1: Fan out (after 400ms)
  setTimeout(() => {
    cards.forEach((card, i) => {
      const angle = (i - numCards / 2) * 12;
      const x = Math.sin(angle * Math.PI / 180) * 120;
      const y = Math.cos(angle * Math.PI / 180) * -30 + 20;
      card.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${angle}deg)`;
    });
  }, 400);

  // Phase 2: Collect back (shuffle)
  setTimeout(() => {
    cards.forEach((card, i) => {
      const offset = (i % 2 === 0 ? -1 : 1) * 30;
      card.style.transform = `translate(calc(-50% + ${offset}px), -50%)`;
      card.style.transition = 'all 0.3s ease';
    });
  }, 1400);

  // Phase 3: Interleave shuffle
  setTimeout(() => {
    cards.forEach((card, i) => {
      card.style.transform = `translate(-50%, -50%) translateY(${-i * 1.5}px)`;
      card.style.transition = 'all 0.4s ease';
    });
  }, 1900);

  // Phase 4: Deal out
  setTimeout(() => {
    cards.forEach((card, i) => {
      const angle = (i / numCards) * 360;
      const dist = 200;
      const x = Math.cos(angle * Math.PI / 180) * dist;
      const y = Math.sin(angle * Math.PI / 180) * dist;
      card.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${angle + 180}deg)`;
      card.style.opacity = '0';
      card.style.transition = `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.04}s`;
    });
  }, 2500);

  // Phase 5: Show text
  setTimeout(() => {
    textEl.textContent = '🎴 Cards Dealt!';
    textEl.classList.add('show');
  }, 3200);

  // Phase 6: Fade out
  setTimeout(() => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      overlay.classList.remove('active');
      overlay.style.opacity = '';
      overlay.style.transition = '';
      container.innerHTML = '';
      textEl.className = '';
      textEl.textContent = '';
      showView('game');
    }, 500);
  }, 3900);
}

// ===== GAME STATE =====
socket.on('game-state', (data) => {
  state.board = data.board;
  state.hand = data.hand;
  state.currentPlayerId = data.currentPlayerId;
  state.players = data.players;
  state.sequences = data.sequences;
  state.numTeams = data.numTeams;
  state.gameOver = data.gameOver;

  if (!views.game.classList.contains('active')) showView('game');
  renderBoard();
  renderHand();
  renderGameSidebar();
  updateTurnIndicator();

  if (data.gameOver && data.winner !== null) {
    showGameOver(data.winner);
  }
});

// ===== BOARD RENDERING =====
function renderBoard() {
  const grid = $('game-board');
  grid.innerHTML = '';

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const cell = state.board[r][c];
      const div = document.createElement('div');
      div.className = 'board-cell';
      div.dataset.row = r;
      div.dataset.col = c;

      if (cell.card === 'FR') {
        div.classList.add('free-corner');
        div.innerHTML = `<span class="cell-suit">★</span><span class="cell-rank">FREE</span>`;
      } else {
        const rank = cell.card[0];
        const suit = cell.card[1];
        const colorClass = SUIT_COLORS[suit];
        div.innerHTML = `
          <span class="cell-rank ${colorClass}">${RANK_DISPLAY[rank]}</span>
          <span class="cell-suit ${colorClass}">${SUIT_SYMBOLS[suit]}</span>
        `;
      }

      // Chip overlay
      if (cell.chip !== null && cell.chip !== 'FREE') {
        const chipDiv = document.createElement('div');
        chipDiv.className = `chip-overlay team-${cell.chip}`;
        if (cell.partOfSequence) chipDiv.classList.add('sequence-chip');
        div.appendChild(chipDiv);
      }

      // Highlight valid moves
      if (state.selectedCardIndex !== null && !state.gameOver && state.currentPlayerId === state.myId) {
        const selectedCard = state.hand[state.selectedCardIndex];
        if (selectedCard) {
          if (isOneEyedJack(selectedCard)) {
            if (cell.chip !== null && cell.chip !== 'FREE' && cell.chip !== state.myTeam && !cell.partOfSequence) {
              div.classList.add('removable');
            }
          } else if (isTwoEyedJack(selectedCard)) {
            if (cell.chip === null && cell.card !== 'FR') {
              div.classList.add('valid-move');
            }
          } else {
            if (cell.card === selectedCard && cell.chip === null) {
              div.classList.add('valid-move');
            }
          }
        }
      }

      div.addEventListener('click', () => onBoardClick(r, c));
      grid.appendChild(div);
    }
  }
}

function onBoardClick(row, col) {
  if (state.selectedCardIndex === null) return showToast('Select a card from your hand first!');
  if (state.currentPlayerId !== state.myId) return showToast("It's not your turn!");
  if (state.gameOver) return;

  socket.emit('play-card', {
    cardIndex: state.selectedCardIndex,
    row, col
  });
  state.selectedCardIndex = null;
}

// ===== HAND RENDERING =====
function renderHand() {
  const container = $('player-hand');
  container.innerHTML = '';
  const hint = $('hand-hint');

  state.hand.forEach((card, i) => {
    const rank = card[0];
    const suit = card[1];
    const colorClass = SUIT_COLORS[suit];

    const div = document.createElement('div');
    div.className = 'hand-card';
    if (i === state.selectedCardIndex) div.classList.add('selected');

    div.innerHTML = `
      <div class="card-corner top-left">
        <span class="${colorClass}">${RANK_DISPLAY[rank]}</span>
        <span class="mini-suit ${colorClass}">${SUIT_SYMBOLS[suit]}</span>
      </div>
      <span class="card-rank ${colorClass}">${RANK_DISPLAY[rank]}</span>
      <span class="card-suit ${colorClass}">${SUIT_SYMBOLS[suit]}</span>
      <div class="card-corner bottom-right">
        <span class="${colorClass}">${RANK_DISPLAY[rank]}</span>
        <span class="mini-suit ${colorClass}">${SUIT_SYMBOLS[suit]}</span>
      </div>
    `;

    div.addEventListener('click', () => {
      state.selectedCardIndex = (state.selectedCardIndex === i) ? null : i;
      renderHand();
      renderBoard(); // Re-render to update valid move highlights
      updateHandHint();
    });

    container.appendChild(div);
  });

  updateHandHint();
}

function updateHandHint() {
  const hint = $('hand-hint');
  if (state.currentPlayerId !== state.myId) {
    hint.textContent = "Waiting for opponent's turn...";
  } else if (state.selectedCardIndex !== null) {
    const card = state.hand[state.selectedCardIndex];
    if (isOneEyedJack(card)) hint.textContent = '🃏 One-Eyed Jack — Click an opponent\'s chip to remove it';
    else if (isTwoEyedJack(card)) hint.textContent = '🃏 Two-Eyed Jack — Click any empty space to place your chip';
    else hint.textContent = 'Click a highlighted space on the board to place your chip';
  } else {
    hint.textContent = '👆 Select a card from your hand';
  }
}

// ===== SIDEBAR =====
function renderGameSidebar() {
  // Team scores
  const scoresDiv = $('team-scores');
  scoresDiv.innerHTML = '';
  const teamColors = ['var(--team-blue)', 'var(--team-green)', 'var(--team-red)'];
  const usedTeams = [...new Set(state.players.map(p => p.team))].sort();

  usedTeams.forEach(t => {
    const required = state.numTeams === 2 ? 2 : 1;
    const count = state.sequences.filter(s => s.team === t).length;
    const row = document.createElement('div');
    row.className = 'team-score-row';
    row.innerHTML = `
      <span class="team-score-dot" style="background:${teamColors[t]};box-shadow:0 0 8px ${teamColors[t]}"></span>
      <span class="team-score-name">${TEAM_NAMES[t]}</span>
      <span class="team-score-count" style="color:${teamColors[t]}">${count}/${required}</span>
    `;
    scoresDiv.appendChild(row);
  });

  // Players
  const list = $('game-player-list');
  list.innerHTML = '';
  state.players.forEach(p => {
    const li = document.createElement('li');
    if (p.id === state.currentPlayerId) li.classList.add('player-current');
    const dot = document.createElement('span');
    dot.className = 'player-dot';
    dot.style.background = teamColors[p.team];
    dot.style.boxShadow = `0 0 6px ${teamColors[p.team]}`;
    li.appendChild(dot);
    const nameSpan = document.createElement('span');
    nameSpan.textContent = p.name + (p.id === state.myId ? ' (You)' : '');
    li.appendChild(nameSpan);
    const cardCount = document.createElement('span');
    cardCount.style.cssText = 'margin-left:auto;font-size:11px;color:var(--text-muted)';
    cardCount.textContent = `${p.cardCount} cards`;
    li.appendChild(cardCount);
    list.appendChild(li);
  });
}

function updateTurnIndicator() {
  const indicator = $('turn-indicator');
  const text = $('turn-text');
  const current = state.players.find(p => p.id === state.currentPlayerId);

  if (state.gameOver) {
    text.textContent = 'Game Over!';
    indicator.classList.remove('your-turn');
  } else if (current) {
    const isMyTurn = current.id === state.myId;
    text.textContent = isMyTurn ? "⚡ Your Turn!" : `${current.name}'s turn`;
    indicator.classList.toggle('your-turn', isMyTurn);
  }
}

// ===== GAME LOG =====
socket.on('game-log', (data) => {
  const log = $('game-log');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  const cardDisplay = formatCard(data.card);
  entry.innerHTML = `<strong style="color:${TEAM_COLORS_CSS[data.team]}">${data.player}</strong> ${data.action} (${cardDisplay})`;
  if (data.newSequences > 0) {
    entry.innerHTML += ` — <strong style="color:var(--accent-gold)">SEQUENCE!</strong>`;
  }
  log.prepend(entry);
});

// ===== GAME OVER =====
function showGameOver(winner) {
  const overlay = $('gameover-overlay');
  $('winner-text').textContent = `🎉 ${TEAM_NAMES[winner]} Team Wins! 🎉`;
  $('winner-text').style.color = TEAM_COLORS_CSS[winner].replace('var(', '').replace(')', '');
  const teamColorMap = { 0: '#4a9eff', 1: '#4aff8b', 2: '#ff4a6e' };
  $('winner-text').style.color = teamColorMap[winner];
  const req = state.numTeams === 2 ? 2 : 1;
  $('winner-detail').textContent = `Completed ${req} sequence${req > 1 ? 's' : ''} to claim victory!`;

  // Confetti
  const confettiEl = $('confetti');
  confettiEl.innerHTML = '';
  const confettiColors = ['#ff4a6e', '#4a9eff', '#4aff8b', '#ffd700', '#8b5cf6', '#ff8c00'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.top = '-20px';
    piece.style.background = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    piece.style.animationDelay = Math.random() * 2 + 's';
    piece.style.animationDuration = (2 + Math.random() * 2) + 's';
    confettiEl.appendChild(piece);
  }

  overlay.classList.add('active');
}

socket.on('game-reset', () => {
  $('gameover-overlay').classList.remove('active');
  state.selectedCardIndex = null;
  state.gameOver = false;
  showView('waiting');
});

// ===== ERROR & TOAST =====
socket.on('error-msg', ({ message }) => showToast(message, true));
socket.on('player-left', ({ message }) => showToast(message));

function showToast(msg, isError = false) {
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3100);
}

// ===== UTILITIES =====
function isOneEyedJack(card) { return card === 'JS' || card === 'JH'; }
function isTwoEyedJack(card) { return card === 'JD' || card === 'JC'; }

function formatCard(card) {
  if (!card) return '';
  const rank = card[0];
  const suit = card[1];
  return RANK_DISPLAY[rank] + SUIT_SYMBOLS[suit];
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied!')).catch(() => {});
}

function createParticles(container, count) {
  if (!container) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = Math.random() * 100 + '%';
    p.style.animationDelay = Math.random() * 12 + 's';
    p.style.animationDuration = (8 + Math.random() * 8) + 's';
    container.appendChild(p);
  }
}
