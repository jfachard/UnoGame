import { Scene } from "phaser";
import { Socket } from "socket.io-client";
import { PlayerPublicInfo } from "../../../../shared/types/game.types";
import { SocketEvents } from "../../../../shared/types/events.types";

export class Lobby extends Scene {
  private socket!: Socket;
  private roomId!: string;
  private playerId!: string;
  private players: PlayerPublicInfo[] = [];
  private playerElements: Map<string, Phaser.GameObjects.Container> = new Map();
  private maxPlayers: number = 4;
  private hostId!: string;
  //private readyButton!: Phaser.GameObjects.Image;
  private startButton!: Phaser.GameObjects.Image;
  private isReady: boolean = false;
  private roomTitleText!: Phaser.GameObjects.Text;

  constructor() {
    super("Lobby");
  }

  init(data: {
    roomId: string;
    playerId: string;
    hostId: string;
    maxPlayers: number;
  }) {
    this.roomId = data.roomId;
    this.playerId = data.playerId;
    this.hostId = data.hostId;
    this.maxPlayers = data.maxPlayers;
  }

  preload() {
    this.load.setPath("assets");

    for (let i = 1; i <= 9; i++) {
      this.load.image(`profile_pic${i}`, `Profile_pic/profile_pic${i}.png`);
    }

    this.load.image("readyButton", "buttons/ReadyButton.png");
    this.load.image("leaveButton", "buttons/LeaveButton.png");
    this.load.image("startButton", "buttons/StartButton.png");
  }

  create() {
    this.socket = this.registry.get("socket");

    if (!this.socket) {
      console.error("Socket not found in registry!");
      return;
    }

    const { width, height } = this.scale;

    this.add.image(width / 2, height / 2, "background");

    this.roomTitleText = this.add
      .text(width / 2, 80, "", {
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 140, "Waiting for players...", {
        fontSize: "24px",
        color: "#ffffff",
        fontStyle: "italic",
      })
      .setOrigin(0.5)
      .setAlpha(0.8);

    // Bouton Ready (tous les joueurs)
    const readyButton = this.add
      .image(width / 2 - 250, height - 100, "readyButton")
      .setScale(1.2)
      .setInteractive({ useHandCursor: true });

    readyButton.on("pointerover", () => readyButton.setTint(0xcccccc));
    readyButton.on("pointerout", () => readyButton.clearTint());
    readyButton.on("pointerdown", () => this.toggleReady());

    // Bouton Leave (centre)
    const leaveButton = this.add
      .image(width / 2, height - 100, "leaveButton")
      .setScale(1.2)
      .setInteractive({ useHandCursor: true });

    leaveButton.on("pointerover", () => leaveButton.setTint(0xcccccc));
    leaveButton.on("pointerout", () => leaveButton.clearTint());
    leaveButton.on("pointerdown", () => this.leaveRoom());

    // Bouton Start (seulement l'hôte)
    this.startButton = this.add
      .image(width / 2 + 250, height - 100, "startButton")
      .setScale(1.2)
      .setInteractive({ useHandCursor: true })
      .setVisible(this.playerId === this.hostId);

    this.startButton.on("pointerover", () => this.startButton.setTint(0xcccccc));
    this.startButton.on("pointerout", () => this.startButton.clearTint());
    this.startButton.on("pointerdown", () => this.startGame());

    this.setupSocketListeners();

    this.socket.emit("get_room_state", { roomId: this.roomId });
  }

  setupSocketListeners() {
    this.socket.on(SocketEvents.PLAYER_JOINED, (data) => {
      console.log("Player joined:", data);
      this.updatePlayerList(data.room.players);
    });

    this.socket.on(SocketEvents.PLAYER_READY_CHANGED, (data) => {
      console.log("Player ready update:", data);
      this.updatePlayerReadyState(data.playerId, data.isReady);
    });

    this.socket.on(SocketEvents.PLAYER_LEFT, (data) => {
      console.log("Player left:", data);
      this.updatePlayerList(data.room.players);
    });

    this.socket.on(SocketEvents.GAME_STARTED, (data) => {
      console.log("Game started!", data);
      this.scene.start("Game", {
        roomId: this.roomId,
        gameState: data.gameState,
        hand: data.hand,
        players: data.players
      });
    });

    this.socket.on("room_state", (data) => {
      console.log("Room state:", data);
      this.updatePlayerList(data.room.players);
    });
  }

  updatePlayerList(players: any[]) {
    this.playerElements.forEach((container) => container.destroy());
    this.playerElements.clear();

    this.players = players.map((p) => ({
      id: p.id,
      name: p.name,
      isReady: p.isReady,
      cardsCount: p.cardsCount || 0,
      profilePic: p.profilePic || this.getPlayerProfilePic(p.id),
    }));

    this.roomTitleText.setText(
      `Room: ${this.roomId} (${this.players.length}/${this.maxPlayers})`,
    );

    const { width, height } = this.scale;
    const spacingX = 300;
    const spacingY = 250;
    const cols = 4;
    const rows = Math.ceil(this.players.length / cols);

    const gridWidth = Math.min(this.players.length, cols) * spacingX;
    const gridHeight = rows * spacingY;
    const startX = (width - gridWidth) / 2 + spacingX / 2;
    const startY = (height - gridHeight) / 2 + 50;

    this.players.forEach((player, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      this.createPlayerCard(player, x, y);
    });
  }

  createPlayerCard(player: PlayerPublicInfo, x: number, y: number) {
    const container = this.add.container(x, y);

    const bg = this.add
      .rectangle(0, 0, 240, 200, 0x2c3e50, 0.8)
      .setStrokeStyle(4, player.isReady ? 0x2ecc71 : 0x95a5a6);
    container.add(bg);

    const profilePic = this.add
      .image(0, -40, `profile_pic${player.profilePic}`)
      .setScale(0.25);
    container.add(profilePic);

    const nameText = this.add
      .text(0, 40, player.name, {
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add(nameText);

    const readyText = this.add
      .text(0, 70, player.isReady ? "✓ Ready" : "Not Ready", {
        fontSize: "16px",
        color: player.isReady ? "#2ecc71" : "#e74c3c",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add(readyText);

    if (player.id === this.hostId) {
      const hostBadge = this.add
        .text(0, -85, "👑 HOST", {
          fontSize: "14px",
          color: "#f39c12",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      container.add(hostBadge);
    }

    this.playerElements.set(player.id, container);
  }

  updatePlayerReadyState(playerId: string, isReady: boolean) {
    const player = this.players.find((p) => p.id === playerId);
    if (player) {
      player.isReady = isReady;

      const container = this.playerElements.get(playerId);
      if (container) {
        container.destroy();
        const playerData = this.players.find((p) => p.id === playerId);
        if (playerData) {
          const index = this.players.findIndex((p) => p.id === playerId);
          
          // Utiliser les MÊMES calculs que updatePlayerList
          const { width, height } = this.scale;
          const spacingX = 300;
          const spacingY = 250;
          const cols = 4;
          const rows = Math.ceil(this.players.length / cols);
          
          const gridWidth = Math.min(this.players.length, cols) * spacingX;
          const gridHeight = rows * spacingY;
          const startX = (width - gridWidth) / 2 + spacingX / 2;
          const startY = (height - gridHeight) / 2 + 50;
          
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = startX + col * spacingX;
          const y = startY + row * spacingY;

          this.createPlayerCard(playerData, x, y);
        }
      }
    }

    if (playerId === this.playerId) {
      this.isReady = isReady;
    }
  }

  toggleReady() {
    this.socket.emit(SocketEvents.PLAYER_READY, {
      roomId: this.roomId,
      isReady: !this.isReady,
    });
  }

  startGame() {
    const allReady = this.players.every((p) => p.isReady);
    const minPlayers = 2;

    if (this.players.length < minPlayers) {
      alert(`Need at least ${minPlayers} players to start!`);
      return;
    }

    if (!allReady) {
      alert("All players must be ready!");
      return;
    }

    this.socket.emit(SocketEvents.START_GAME, { roomId: this.roomId });
  }

  getPlayerProfilePic(playerId: string): number {
    if (!this.registry.has(`profilePic_${playerId}`)) {
      const randomPic = Math.floor(Math.random() * 9) + 1;
      this.registry.set(`profilePic_${playerId}`, randomPic);
    }
    return this.registry.get(`profilePic_${playerId}`);
  }

  shutdown() {
    this.socket.off("player_joined");
    this.socket.off("player_ready_update");
    this.socket.off("player_left");
    this.socket.off("game_started");
    this.socket.off("room_state");
  }

  leaveRoom() {
    this.socket.emit(SocketEvents.LEAVE_ROOM, { roomId: this.roomId });
    this.scene.start("MainMenu");
  }
}
