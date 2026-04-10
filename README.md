# 🎴 Sequence — Online Multiplayer Board Game

Play the classic **Sequence** board game online with friends! Create a room, share the link, and enjoy real-time multiplayer gameplay.

![Sequence Game](https://img.shields.io/badge/Game-Sequence-purple?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-blue?style=for-the-badge)

## ✨ Features

- **Real-time Multiplayer** — Play with friends via shareable room links
- **Up to 3 Teams** — Blue, Green, and Red teams with neon-glow chips
- **Private Hands** — Each player only sees their own cards
- **Full Board Visibility** — See all placed chips on the 10×10 board
- **No Turn Timer** — Play at your own pace
- **Card Shuffle Animation** — Gorgeous deck-shuffling animation on game start
- **Premium Dark UI** — Glassmorphism design with dark theme
- **Jack Mechanics** — Two-eyed jacks (wild) and one-eyed jacks (remove)
- **Sequence Detection** — Automatic win detection for 5-in-a-row

## 🚀 Quick Start (Local)

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/sequence-game.git
cd sequence-game

# Install dependencies
npm install

# Start the server
npm start
```

Open `http://localhost:3000` in your browser. Share the room code with friends!

## 🎯 How to Play

1. **Create a Game** — Enter your name and click "Create Game"
2. **Share the Room Code** — Send the code or link to friends
3. **Choose Teams** — Each player selects Blue, Green, or Red
4. **Start** — Host clicks "Start Game"
5. **Play Cards** — Select a card from your hand, click the matching board space
6. **Make Sequences** — Get 5 chips in a row (horizontal, vertical, or diagonal)
7. **Win!** — First team to complete the required sequences wins!

### Special Cards
- **Two-Eyed Jacks (J♦, J♣)** — Wild! Place your chip on any empty space
- **One-Eyed Jacks (J♠, J♥)** — Remove an opponent's chip from the board
- **Corner Spaces** — Free for all teams (count toward any sequence)

## 📦 Deployment

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

> **Note:** Vercel uses serverless functions. WebSocket support requires special configuration. For full real-time multiplayer, use a platform that supports persistent WebSocket connections (like Hugging Face Spaces, Railway, or Render).

### Hugging Face Spaces (Docker)

1. Create a new Space on [Hugging Face](https://huggingface.co/new-space)
2. Select **Docker** as the SDK
3. Push this repo to the Space:

```bash
# Add HF remote
git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/sequence-game

# Push
git push hf main
```

The Dockerfile is pre-configured to use port 7860 (HF Spaces default).

### Railway / Render

Simply connect your GitHub repo — both platforms auto-detect Node.js projects.

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Server | Node.js + Express |
| Real-time | Socket.IO |
| Frontend | Vanilla HTML/CSS/JS |
| Styling | Custom CSS (Dark Glassmorphism) |
| Font | [Outfit](https://fonts.google.com/specimen/Outfit) |

## 📁 Project Structure

```
sequence-game/
├── server.js          # Express + Socket.IO server
├── gameLogic.js       # Core game logic (board, deck, sequences)
├── Dockerfile         # Docker config for HF Spaces
├── vercel.json        # Vercel deployment config
├── package.json
└── public/
    ├── index.html     # Single-page app
    ├── css/
    │   └── style.css  # Premium dark theme
    └── js/
        └── app.js     # Client-side game logic
```

## 📜 License

MIT — Feel free to fork and modify!
