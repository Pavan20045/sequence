// === Sequence Board Game - Core Logic ===

// Official Sequence board layout (10x10)
// FR = Free corner, cards use Rank+Suit notation (e.g. 2S = 2 of Spades)
const BOARD_LAYOUT = [
  ['FR','2S','3S','4S','5S','6S','7S','8S','9S','FR'],
  ['6C','5C','4C','3C','2C','AH','KH','QH','TH','TS'],
  ['7C','AS','2D','3D','4D','5D','6D','7D','9H','QS'],
  ['8C','KS','6C','5C','4C','3C','2C','8D','8H','KS'],
  ['9C','QS','7C','6H','5H','4H','AH','9D','7H','AS'],
  ['TC','TS','8C','7H','2H','3H','KH','TD','6H','2D'],
  ['QC','9S','9C','8H','9H','TH','QH','QD','5H','3D'],
  ['KC','8S','TC','QC','KC','AC','AD','KD','4H','4D'],
  ['AC','7S','6S','5S','4S','3S','2S','2H','3H','5D'],
  ['FR','AD','KD','QD','TD','9D','8D','7D','6D','FR']
];

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['S','H','D','C'];

function createDeck() {
  const deck = [];
  for (let d = 0; d < 2; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push(rank + suit);
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function getHandSize(playerCount) {
  if (playerCount <= 2) return 7;
  if (playerCount <= 4) return 6;
  if (playerCount <= 6) return 5;
  if (playerCount <= 10) return 4;
  return 3;
}

function createEmptyBoard() {
  const board = [];
  for (let r = 0; r < 10; r++) {
    const row = [];
    for (let c = 0; c < 10; c++) {
      row.push({
        card: BOARD_LAYOUT[r][c],
        chip: BOARD_LAYOUT[r][c] === 'FR' ? 'FREE' : null,
        partOfSequence: false
      });
    }
    board.push(row);
  }
  return board;
}

function findCardPositions(card) {
  const positions = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (BOARD_LAYOUT[r][c] === card) {
        positions.push({ row: r, col: c });
      }
    }
  }
  return positions;
}

function isOneEyedJack(card) {
  return card === 'JS' || card === 'JH';
}

function isTwoEyedJack(card) {
  return card === 'JD' || card === 'JC';
}

function isJack(card) {
  return card && card[0] === 'J';
}

function isDeadCard(card, board) {
  if (isJack(card)) return false;
  const positions = findCardPositions(card);
  return positions.every(pos => board[pos.row][pos.col].chip !== null);
}

// Find all sequences of 5 on the board
function findAllSequences(board) {
  const sequences = [];
  const directions = [
    [0, 1],  // horizontal
    [1, 0],  // vertical
    [1, 1],  // diagonal down-right
    [1, -1]  // diagonal down-left
  ];

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      for (const [dr, dc] of directions) {
        const endRow = row + 4 * dr;
        const endCol = col + 4 * dc;
        if (endRow < 0 || endRow >= 10 || endCol < 0 || endCol >= 10) continue;

        let team = null;
        let valid = true;
        const cells = [];

        for (let i = 0; i < 5; i++) {
          const r = row + i * dr;
          const c = col + i * dc;
          const cell = board[r][c];

          if (cell.chip === 'FREE') {
            cells.push([r, c]);
            continue;
          }

          if (cell.chip === null) {
            valid = false;
            break;
          }

          if (team === null) {
            team = cell.chip;
          } else if (cell.chip !== team) {
            valid = false;
            break;
          }
          cells.push([r, c]);
        }

        if (valid && team !== null) {
          const key = cells.map(c => `${c[0]},${c[1]}`).sort().join('|');
          sequences.push({ team, cells, key });
        }
      }
    }
  }

  // Deduplicate by key
  const seen = new Set();
  return sequences.filter(s => {
    if (seen.has(s.key)) return false;
    seen.add(s.key);
    return true;
  });
}

function findNewSequences(board, existingKeys) {
  const all = findAllSequences(board);
  return all.filter(s => !existingKeys.has(s.key));
}

module.exports = {
  BOARD_LAYOUT,
  createDeck,
  getHandSize,
  createEmptyBoard,
  findCardPositions,
  isOneEyedJack,
  isTwoEyedJack,
  isJack,
  isDeadCard,
  findAllSequences,
  findNewSequences
};
