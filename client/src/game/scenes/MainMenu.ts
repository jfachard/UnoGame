// src/game/scenes/MainMenu.ts
import { Scene } from 'phaser';
import { Socket } from 'socket.io-client';

export class MainMenu extends Scene {
  private socket!: Socket;

  constructor() {
    super('MainMenu');
  }

  create() {
    const { width, height } = this.scale;

    // 1. Récupérer socket depuis le registry
    this.socket = this.registry.get('socket');

    if (!this.socket) {
      console.error('Socket not found in registry!');
      return;
    }

    console.log('Socket ID in MainMenu:', this.socket.id);

    // 2. Background
    this.add.image(width / 2, height / 2, 'background');

    // 3. Logo Carta (en haut)
    this.add.image(width / 2, 150, 'logo').setScale(0.38);

    // 4. Afficher l'ID du socket (pour tester)
    this.add.text(width / 2, 280, `Socket ID: ${this.socket.id}`, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0.7);

    // 5. Bouton "Test Create Room"
    this.createButton(
      width / 2,
      height / 2 + 50,
      'Test Create Room',
      () => this.testCreateRoom()
    );

    // 6. Bouton "Test Join Room"
    this.createButton(
      width / 2,
      height / 2 + 150,
      'Test Join Room',
      () => this.testJoinRoom()
    );

    // 7. Écouter les events du serveur
    this.setupSocketListeners();
  }

  createButton(x: number, y: number, text: string, callback: () => void) {
    // Background du bouton
    const bg = this.add.rectangle(x, y, 300, 60, 0x3498db)
      .setInteractive()
      .on('pointerover', () => bg.setFillStyle(0x2980b9))
      .on('pointerout', () => bg.setFillStyle(0x3498db))
      .on('pointerdown', callback);

    // Texte du bouton
    this.add.text(x, y, text, {
      fontSize: '24px',
      color: '#fff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    return bg;
  }

  setupSocketListeners() {
    // Écouter la réponse de create_room
    this.socket.on('create_room_success', (data) => {
      console.log('✅ Room created:', data);
      alert(`Room created! ID: ${data.room.id}`);
    });

    this.socket.on('create_room_error', (data) => {
      console.error('❌ Create room error:', data);
      alert(`Error: ${data.message}`);
    });

    // Écouter la réponse de join_room
    this.socket.on('player_joined', (data) => {
      console.log('✅ Player joined:', data);
      alert(`Joined room! Players: ${data.room.players.length}`);
    });

    this.socket.on('join_room_error', (data) => {
      console.error('❌ Join room error:', data);
      alert(`Error: ${data.message}`);
    });
  }

  testCreateRoom() {
    const roomId = 'test-room-' + Math.floor(Math.random() * 1000);
    const playerName = 'Player' + Math.floor(Math.random() * 100);

    console.log('📤 Emitting create_room:', { roomId, playerName });

    this.socket.emit('create_room', {
      roomId,
      playerName,
      maxPlayers: 4
    });
  }

  testJoinRoom() {
    const roomId = prompt('Enter room ID:');
    if (!roomId) return;

    const playerName = 'Player' + Math.floor(Math.random() * 100);

    console.log('📤 Emitting join_room:', { roomId, playerName });

    this.socket.emit('join_room', {
      roomId,
      playerName
    });
  }

  // Nettoyer les listeners quand on quitte la scène
  shutdown() {
    this.socket.off('create_room_success');
    this.socket.off('create_room_error');
    this.socket.off('player_joined');
    this.socket.off('join_room_error');
  }
}