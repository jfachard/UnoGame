import { Scene } from 'phaser';
import { Socket } from 'socket.io-client';

export class MainMenu extends Scene {
  private socket!: Socket;
  private playerNameInput!: Phaser.GameObjects.DOMElement;
  private roomIdInput!: Phaser.GameObjects.DOMElement;
  private maxPlayersSelect!: Phaser.GameObjects.DOMElement;
  private playerName: string = '';
  private roomIdToJoin: string = '';
  private maxPlayers: number = 4;

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

    // Background
    this.add.image(width / 2, height / 2, 'background');
    
    // Logo centré en haut
    this.add.image(width / 2, 120, 'logo').setScale(0.38);

    const centerX = width / 2;
    const startY = 260; // Position fixe au lieu de height/2 - 120

    this.add.text(centerX, startY, 'Your Name:', {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Pour playerNameInput
    this.playerNameInput = this.add.dom(centerX, startY + 45).createFromHTML(`
      <input 
        type="text" 
        id="playerNameInput"
        placeholder="Enter your name" 
        maxlength="20"
        style="
          display: block;
          margin: 0 auto;
          width: 320px;
          padding: 12px 15px;
          font-size: 18px;
          border: 3px solid #B84855;
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

    const nameInput = this.playerNameInput.node.querySelector('#playerNameInput') as HTMLInputElement;
    nameInput.addEventListener('input', (e) => {
      this.playerName = (e.target as HTMLInputElement).value;
    });

    this.add.text(centerX, startY + 110, 'Max Players:', {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Pour maxPlayersSelect
    this.maxPlayersSelect = this.add.dom(centerX, startY + 155).createFromHTML(`
      <select 
        id="maxPlayersSelect"
        style="
          display: block;
          margin: 0 auto;
          width: 320px;
          padding: 12px 15px;
          font-size: 18px;
          border: 3px solid #B84855;
          border-radius: 8px;
          text-align: center;
          background: rgba(255, 255, 255, 0.95);
          color: #333;
          font-family: Arial, sans-serif;
          font-weight: bold;
          outline: none;
          cursor: pointer;
        "
      >
        <option value="2">2 Players</option>
        <option value="3">3 Players</option>
        <option value="4" selected>4 Players</option>
        <option value="5">5 Players</option>
        <option value="6">6 Players</option>
        <option value="7">7 Players</option>
        <option value="8">8 Players</option>
      </select>
    `);

    const selectElement = this.maxPlayersSelect.node.querySelector('#maxPlayersSelect') as HTMLSelectElement;
    selectElement.addEventListener('change', (e) => {
      this.maxPlayers = parseInt((e.target as HTMLSelectElement).value);
    });

    this.add.text(centerX, startY + 220, 'Room ID :', {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Pour roomIdInput
    this.roomIdInput = this.add.dom(centerX, startY + 265).createFromHTML(`
      <input 
        type="text" 
        id="roomIdInput"
        placeholder="Enter room ID to join" 
        maxlength="30"
        style="
          display: block;
          margin: 0 auto;
          width: 320px;
          padding: 12px 15px;
          font-size: 18px;
          border: 3px solid #B84855;
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

    const roomIdInputElement = this.roomIdInput.node.querySelector('#roomIdInput') as HTMLInputElement;
    roomIdInputElement.addEventListener('input', (e) => {
      this.roomIdToJoin = (e.target as HTMLInputElement).value;
    });

    // Boutons CREATE et JOIN
    const createButton = this.add.image(centerX - 140, startY + 360, 'createButton')
      .setInteractive({ useHandCursor: true })
      .setScale(1.3);

    createButton.on('pointerover', () => createButton.setTint(0xcccccc));
    createButton.on('pointerout', () => createButton.clearTint());
    createButton.on('pointerdown', () => this.createRoom());

    const joinButton = this.add.image(centerX + 140, startY + 360, 'joinButton')
      .setInteractive({ useHandCursor: true })
      .setScale(1.3);

    joinButton.on('pointerover', () => joinButton.setTint(0xcccccc));
    joinButton.on('pointerout', () => joinButton.clearTint());
    joinButton.on('pointerdown', () => this.joinRoom());

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('create_room_success', (data) => {
      console.log('✅ Room created:', data);
      
      const profilePic = Math.floor(Math.random() * 9) + 1;
      this.registry.set(`profilePic_${this.socket.id}`, profilePic);
      
      this.scene.start('Lobby', {
        roomId: data.room.id,
        playerId: this.socket.id,
        hostId: data.room.hostId,
        maxPlayers: data.room.maxPlayers
      });
    });

    this.socket.on('create_room_error', (data) => {
      console.error('❌ Create room error:', data);
      alert(`Error: ${data.message}`);
    });

    this.socket.on('player_joined', (data) => {
      console.log('✅ Player joined:', data);
      
      const profilePic = Math.floor(Math.random() * 9) + 1;
      this.registry.set(`profilePic_${this.socket.id}`, profilePic);
      
      this.scene.start('Lobby', {
        roomId: data.room.id,
        playerId: this.socket.id,
        hostId: data.room.hostId,
        maxPlayers: data.room.maxPlayers
      });
    });

    this.socket.on('join_room_error', (data) => {
      console.error('❌ Join room error:', data);
      alert(`Error: ${data.message}`);
    });
  }

  createRoom() {
    const playerName = this.playerName.trim() || 'Player' + Math.floor(Math.random() * 100);
    const roomId = 'room-' + Math.floor(Math.random() * 1000);

    console.log('📤 Emitting create_room:', { roomId, playerName, maxPlayers: this.maxPlayers });

    this.socket.emit('create_room', {
      roomId,
      playerName,
      maxPlayers: this.maxPlayers
    });
  }

  joinRoom() {
    const playerName = this.playerName.trim() || 'Player' + Math.floor(Math.random() * 100);
    const roomId = this.roomIdToJoin.trim();
    
    if (!roomId) {
      alert('Please enter a Room ID!');
      return;
    }

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