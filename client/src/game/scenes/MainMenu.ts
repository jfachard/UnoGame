import { Scene } from 'phaser';
import { Socket } from 'socket.io-client';

export class MainMenu extends Scene {
  private socket!: Socket;
  private playerNameInput!: Phaser.GameObjects.DOMElement;
  private playerName: string = '';

  constructor() {
    super('MainMenu');
  }

  preload() {
    this.load.setPath('assets');

    this.load.image('logo', 'Carta_logo.png');
    this.load.image('createButton', 'buttons/CreateButton.png');
    this.load.image('joinButton', 'buttons/JoinButton.png');
  }

  create() {
    const { width, height } = this.scale;

    this.socket = this.registry.get('socket');

    if (!this.socket) {
      console.error('Socket not found in registry!');
      return;
    }

    console.log('Socket ID in MainMenu:', this.socket.id);

    this.add.image(width / 2, height / 2, 'background');

    this.add.image(width / 2, 150, 'logo').setScale(0.38);

    // Label pour l'input
    this.add.text(width / 2, height / 2 - 80, 'Your Name:', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Input HTML pour le nom du joueur
    this.playerNameInput = this.add.dom(width / 2, height / 2 - 30).createFromHTML(`
      <input 
        type="text" 
        id="playerNameInput"
        placeholder="Enter your name" 
        maxlength="20"
        style="
          width: 300px;
          padding: 12px 20px;
          font-size: 18px;
          border: 3px solid #4169e1;
          border-radius: 8px;
          text-align: center;
          background: rgba(255, 255, 255, 0.95);
          color: #333;
          font-family: Arial, sans-serif;
          font-weight: bold;
          outline: none;
        "
      />
    `);

    // Récupérer la valeur de l'input
    const input = this.playerNameInput.node.querySelector('#playerNameInput') as HTMLInputElement;
    input.addEventListener('input', (e) => {
      this.playerName = (e.target as HTMLInputElement).value;
    });

    const createButton = this.add.image(
      width / 2,
      height / 2 + 80,
      'createButton'
    ).setInteractive({ useHandCursor: true }).setScale(1.5);

    createButton.on('pointerover', () => createButton.setTint(0xcccccc));
    createButton.on('pointerout', () => createButton.clearTint());
    createButton.on('pointerdown', () => this.testCreateRoom());

    const joinButton = this.add.image(
      width / 2,
      height / 2 + 180,
      'joinButton'
    ).setInteractive({ useHandCursor: true }).setScale(1.5);

    joinButton.on('pointerover', () => joinButton.setTint(0xcccccc));
    joinButton.on('pointerout', () => joinButton.clearTint());
    joinButton.on('pointerdown', () => this.testJoinRoom());

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('create_room_success', (data) => {
      console.log('✅ Room created:', data);
      alert(`Room created! ID: ${data.room.id}`);
    });

    this.socket.on('create_room_error', (data) => {
      console.error('❌ Create room error:', data);
      alert(`Error: ${data.message}`);
    });

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
    const playerName = this.playerName.trim() || 'Player' + Math.floor(Math.random() * 100);
    const roomId = 'test-room-' + Math.floor(Math.random() * 1000);

    console.log('📤 Emitting create_room:', { roomId, playerName });

    this.socket.emit('create_room', {
      roomId,
      playerName,
      maxPlayers: 4
    });
  }

  testJoinRoom() {
    const playerName = this.playerName.trim() || 'Player' + Math.floor(Math.random() * 100);
    const roomId = prompt('Enter room ID:');
    if (!roomId) return;

    console.log('📤 Emitting join_room:', { roomId, playerName });

    this.socket.emit('join_room', {
      roomId,
      playerName
    });
  }

  shutdown() {
    this.socket.off('create_room_success');
    this.socket.off('create_room_error');
    this.socket.off('player_joined');
    this.socket.off('join_room_error');
  }
}