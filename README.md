# 🎴 Carta - Multiplayer Card Game

> **⚠️ DISCLAIMER**  
> This is a **personal learning project** created for fun and educational purposes.  
> This project is **not affiliated with, endorsed by, or associated with Mattel Inc. or the UNO® brand**.  
> UNO® is a registered trademark of Mattel Inc. This is a fan-made recreation with original assets and code.  
> **This project is not for commercial use.**

---

## 📖 About

**Carta** is a multiplayer card game inspired by classic card games, built with modern web technologies. The goal of this project is to learn and experiment with real-time multiplayer game development using Phaser 3, TypeScript, and Socket.io.

### 🎯 Learning Goals
- Real-time multiplayer with Socket.io
- Game state management on the server
- Phaser 3 game development
- TypeScript across client and server
- Shared types between frontend and backend

---

## 🎮 Game Rules (v1 - Simplified)

**Objective:** Be the first player to get rid of all your cards.

**Setup:**
- 2-4 players
- Each player receives 7 cards
- One card is placed on the discard pile

**How to Play:**
- Play a card that matches the **color** OR **value** of the top card
- Special cards: Skip, Reverse, +2
- Wild cards: Change the color
- If you can't play, draw a card

**Direction:** Clockwise (can be reversed with Reverse card)

---

## 🛠️ Tech Stack

### Frontend
- **Phaser 3** - HTML5 game framework
- **TypeScript** - Type safety
- **Vite** - Fast bundler
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js** + **Express** - Server
- **Socket.io** - WebSocket management
- **TypeScript** - Type safety

### Shared
- **TypeScript interfaces** - Shared types between client and server

---

## 📂 Project Structure

```
carta/
├── client/                 # Phaser frontend
│   ├── public/
│   │   └── assets/        # Game assets (cards, sounds)
│   └── src/
│       ├── scenes/        # Phaser scenes
│       ├── objects/       # Game objects (Card, Deck, Player)
│       └── utils/         # Socket.io config
│
├── server/                # Node.js backend
│   └── src/
│       ├── game/          # Game logic (GameRoom, Deck)
│       └── socket/        # Socket.io handlers
│
└── shared/                # Shared TypeScript types
    └── types/
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/your-username/carta.git
cd carta
```

**2. Install dependencies**

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

**3. Run the project**

```bash
# Terminal 1 - Run the server
cd server
npm run dev

# Terminal 2 - Run the client
cd client
npm run dev
```

**4. Open your browser**
- Client: `http://localhost:5173`
- Server: `http://localhost:3000`

---

## 🎨 Design & Assets

### Color Palette (Retro/Vintage)
- **Bordeaux:** `#5C1F2A` `#8B303D` `#B84855`
- **Blue Night:** `#1F3A52` `#2E5A7D` `#4080AD`
- **Olive:** `#3A4A28` `#5F7B3E` `#8BAD5E`
- **Ochre:** `#6B4825` `#A06A34` `#D49548`

### Assets
- **Card Assets:** Pixel art (50x66 pixels)
- **Credits:** Original card assets by [IvoryRed on itch.io](https://ivoryred.itch.io/pixel-uno-cards) (modified)

---

<!-- ## 🧪 Development Phases

- [x] Phase 1: Project setup
- [ ] Phase 2: Server with Express + Socket.io
- [ ] Phase 3: Client Socket.io integration
- [ ] Phase 4: Game logic (Deck, Card validation, GameRoom)
- [ ] Phase 5: Phaser scenes (Menu, Game)
- [ ] Phase 6: Card interactions (drag & drop)
- [ ] Phase 7: Animations & polish

---

## 🎯 Features (Planned)

### v1.0 (MVP)
- [x] Project structure
- [ ] Room creation and joining
- [ ] 2-4 player support
- [ ] Card dealing
- [ ] Basic card playing (color/value matching)
- [ ] Special cards (Skip, Reverse, +2)
- [ ] Wild cards
- [ ] Turn management
- [ ] Winner detection

### v2.0 (Future)
- [ ] Wild +4 cards
- [ ] Card animations
- [ ] Sound effects
- [ ] Chat system
- [ ] Player statistics
- [ ] Game replay
- [ ] Mobile optimization -->

---

## 🤝 Contributing

This is a personal learning project, but feedback and suggestions are welcome!  
Feel free to open an issue if you find bugs or have ideas.

---

## 📄 License

This project is open-source under the **MIT License**.  
See [LICENSE](LICENSE) for details.

---

## 👤 Author

**Jean-Francis Achard**
- Portfolio: [jfachard.vercel.app](https://jfachard.vercel.app)
- GitHub: [@jfachard](https://github.com/jfachard)

---

## 🙏 Acknowledgments

- **Phaser 3** - Amazing game framework
- **Socket.io** - Seamless real-time communication
- **IvoryRed** - Original pixel art card assets
- Inspired by classic card games and the countless hours of fun they provide

---

## ⚖️ Legal Note

This project is a **non-commercial, educational fan project**.  
UNO® is a registered trademark of Mattel Inc.  
All rights to the UNO® brand and game mechanics belong to Mattel Inc.  
This project does not claim any ownership or affiliation with the UNO® brand.

If you are a representative of Mattel Inc. and have concerns about this project, please contact me directly.

---

**Made with ❤️ for learning and fun**