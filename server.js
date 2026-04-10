const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const {
  BOARD_LAYOUT, createDeck, getHandSize, createEmptyBoard,
  findCardPositions, isOneEyedJack, isTwoEyedJack, isJack,
  isDeadCard, findNewSequences
} = require('./gameLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getTeamCounts(room) {
  const counts = { 0: 0, 1: 0, 2: 0 };
  room.players.forEach(p => { if (p.team !== null) counts[p.team]++; });
  return counts;
}

function getNumTeams(room) {
  const counts = getTeamCounts(room);
  return Object.values(counts).filter(c => c > 0).length;
}

function broadcastRoomState(room) {
  io.to(room.code).emit('room-state', {
    players: room.players.map(p => ({
      id: p.id, name: p.name, team: p.team, isHost: p.isHost
    })),
    started: room.started
  });
}

function broadcastGameState(room) {
  const boardState = room.board.map(row =>
    row.map(cell => ({ card: cell.card, chip: cell.chip, partOfSequence: cell.partOfSequence }))
  );

  room.players.forEach(p => {
    const sock = io.sockets.sockets.get(p.id);
    if (!sock) return;
    sock.emit('game-state', {
      board: boardState,
      hand: p.hand,
      currentPlayerId: room.players[room.currentPlayerIndex]?.id,
      players: room.players.map(pl => ({
        id: pl.id, name: pl.name, team: pl.team, isHost: pl.isHost,
        cardCount: pl.hand.length
      })),
      sequences: room.sequences,
      teamSequenceCounts: room.teamSequenceCounts,
      numTeams: room.numTeams,
      gameOver: room.gameOver,
      winner: room.winner
    });
  });
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  // Check if URL has room code for auto-join
  socket.on('create-room', ({ playerName }) => {
    const roomCode = generateRoomCode();
    const player = { id: socket.id, name: playerName, team: null, hand: [], isHost: true };
    rooms[roomCode] = {
      code: roomCode, players: [player], board: createEmptyBoard(),
      deck: [], discardPile: [], currentPlayerIndex: 0, started: false,
      sequences: [], sequenceKeys: new Set(),
      teamSequenceCounts: { 0: 0, 1: 0, 2: 0 }, numTeams: 0,
      gameOver: false, winner: null
    };
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.emit('room-created', { roomCode });
    broadcastRoomState(rooms[roomCode]);
  });

  socket.on('join-room', ({ roomCode, playerName }) => {
    const code = roomCode.toUpperCase().trim();
    const room = rooms[code];
    if (!room) return socket.emit('error-msg', { message: 'Room not found!' });
    if (room.started) return socket.emit('error-msg', { message: 'Game already started!' });
    if (room.players.length >= 12) return socket.emit('error-msg', { message: 'Room is full!' });
    if (room.players.find(p => p.id === socket.id)) return;

    const player = { id: socket.id, name: playerName, team: null, hand: [], isHost: false };
    room.players.push(player);
    socket.join(code);
    socket.roomCode = code;
    socket.emit('room-joined', { roomCode: code });
    broadcastRoomState(room);
  });

  socket.on('select-team', ({ team }) => {
    const room = rooms[socket.roomCode];
    if (!room || room.started) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    if (team < 0 || team > 2) return;
    player.team = team;
    broadcastRoomState(room);
  });

  socket.on('start-game', () => {
    const room = rooms[socket.roomCode];
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) return;

    // Validate: all players must have a team, at least 2 teams
    const unassigned = room.players.filter(p => p.team === null);
    if (unassigned.length > 0) return socket.emit('error-msg', { message: 'All players must choose a team!' });
    const numTeams = getNumTeams(room);
    if (numTeams < 2) return socket.emit('error-msg', { message: 'Need at least 2 teams!' });

    room.numTeams = numTeams;
    room.started = true;
    room.board = createEmptyBoard();
    room.deck = createDeck();
    room.discardPile = [];
    room.currentPlayerIndex = 0;
    room.sequences = [];
    room.sequenceKeys = new Set();
    room.teamSequenceCounts = { 0: 0, 1: 0, 2: 0 };
    room.gameOver = false;
    room.winner = null;

    // Deal cards
    const handSize = getHandSize(room.players.length);
    room.players.forEach(p => {
      p.hand = room.deck.splice(0, handSize);
    });

    io.to(room.code).emit('game-starting');
    setTimeout(() => broadcastGameState(room), 4200);
  });

  socket.on('play-card', ({ cardIndex, row, col }) => {
    const room = rooms[socket.roomCode];
    if (!room || !room.started || room.gameOver) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    if (room.players[room.currentPlayerIndex].id !== socket.id) {
      return socket.emit('error-msg', { message: "It's not your turn!" });
    }

    const card = player.hand[cardIndex];
    if (!card) return socket.emit('error-msg', { message: 'Invalid card!' });

    const cell = room.board[row]?.[col];
    if (!cell) return socket.emit('error-msg', { message: 'Invalid position!' });

    // Handle two-eyed jack (wild - place anywhere empty)
    if (isTwoEyedJack(card)) {
      if (cell.chip !== null) return socket.emit('error-msg', { message: 'Space is occupied!' });
      if (cell.card === 'FR') return socket.emit('error-msg', { message: 'Cannot place on corner!' });
      cell.chip = player.team;
    }
    // Handle one-eyed jack (remove opponent chip)
    else if (isOneEyedJack(card)) {
      if (cell.chip === null || cell.chip === 'FREE') return socket.emit('error-msg', { message: 'No chip to remove!' });
      if (cell.chip === player.team) return socket.emit('error-msg', { message: "Can't remove your own chip!" });
      if (cell.partOfSequence) return socket.emit('error-msg', { message: "Can't remove chip from completed sequence!" });
      cell.chip = null;
    }
    // Normal card
    else {
      if (cell.card !== card) return socket.emit('error-msg', { message: 'Card does not match this space!' });
      if (cell.chip !== null) return socket.emit('error-msg', { message: 'Space is already occupied!' });
      cell.chip = player.team;
    }

    // Remove card from hand, add to discard, draw new card
    player.hand.splice(cardIndex, 1);
    room.discardPile.push(card);

    if (room.deck.length === 0 && room.discardPile.length > 0) {
      room.deck = [...room.discardPile];
      room.discardPile = [];
      for (let i = room.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [room.deck[i], room.deck[j]] = [room.deck[j], room.deck[i]];
      }
    }
    if (room.deck.length > 0) {
      player.hand.push(room.deck.pop());
    }

    // Check for new sequences
    const newSeqs = findNewSequences(room.board, room.sequenceKeys);
    newSeqs.forEach(seq => {
      room.sequences.push(seq);
      room.sequenceKeys.add(seq.key);
      room.teamSequenceCounts[seq.team]++;
      seq.cells.forEach(([r, c]) => { room.board[r][c].partOfSequence = true; });
    });

    // Check win condition
    const requiredSequences = room.numTeams === 2 ? 2 : 1;
    for (let t = 0; t < 3; t++) {
      if (room.teamSequenceCounts[t] >= requiredSequences) {
        room.gameOver = true;
        room.winner = t;
        break;
      }
    }

    // Send log event
    const teamNames = ['Blue', 'Green', 'Red'];
    io.to(room.code).emit('game-log', {
      player: player.name,
      team: player.team,
      card: card,
      action: isOneEyedJack(card) ? 'removed a chip' : 'placed a chip',
      row, col,
      newSequences: newSeqs.length,
      gameOver: room.gameOver,
      winner: room.winner !== null ? teamNames[room.winner] : null
    });

    // Next turn
    if (!room.gameOver) {
      room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;

      // Handle dead cards for next player
      const nextPlayer = room.players[room.currentPlayerIndex];
      let deadCardFound = true;
      while (deadCardFound) {
        deadCardFound = false;
        for (let i = nextPlayer.hand.length - 1; i >= 0; i--) {
          if (isDeadCard(nextPlayer.hand[i], room.board)) {
            room.discardPile.push(nextPlayer.hand[i]);
            nextPlayer.hand.splice(i, 1);
            if (room.deck.length > 0) nextPlayer.hand.push(room.deck.pop());
            deadCardFound = true;
          }
        }
      }
    }

    broadcastGameState(room);
  });

  socket.on('restart-game', () => {
    const room = rooms[socket.roomCode];
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) return;

    room.started = false;
    room.gameOver = false;
    room.winner = null;
    room.board = createEmptyBoard();
    room.sequences = [];
    room.sequenceKeys = new Set();
    room.teamSequenceCounts = { 0: 0, 1: 0, 2: 0 };
    room.players.forEach(p => { p.hand = []; });

    broadcastRoomState(room);
    io.to(room.code).emit('game-reset');
  });

  socket.on('disconnect', () => {
    const room = rooms[socket.roomCode];
    if (!room) return;
    const idx = room.players.findIndex(p => p.id === socket.id);
    if (idx === -1) return;

    const wasCurrentTurn = room.currentPlayerIndex === idx;
    room.players.splice(idx, 1);

    if (room.players.length === 0) {
      delete rooms[socket.roomCode];
      return;
    }

    // Transfer host
    if (!room.players.some(p => p.isHost)) {
      room.players[0].isHost = true;
    }

    if (room.started && wasCurrentTurn) {
      room.currentPlayerIndex = room.currentPlayerIndex % room.players.length;
    } else if (room.started && room.currentPlayerIndex > idx) {
      room.currentPlayerIndex--;
    }

    if (room.started) broadcastGameState(room);
    else broadcastRoomState(room);

    io.to(room.code).emit('player-left', { message: `A player left the game` });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sequence game running on http://localhost:${PORT}`));
