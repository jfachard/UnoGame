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

    this.add.image(width / 2, height / 2, 'background');
    this.add.image(width / 2, 150, 'logo').setScale(0.38);

    // === Section CREATE ROOM (gauche) ===
    
    this.add.text(width / 2 - 300, height / 2 - 120, 'Create Room', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2 - 300, height / 2 - 70, 'Your Name:', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.playerNameInput = this.add.dom(width / 2 - 300, height / 2 - 30).createFromHTML(`
      <input 
        type="text" 
        id="playerNameInput"
        placeholder="Enter your name" 
        maxlength="20"
        style="
          width: 280px;
          padding: 10px 15px;
          font-size: 16px;
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

    this.add.text(width / 2 - 300, height / 2 + 20, 'Max Players:', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.maxPlayersSelect = this.add.dom(width / 2 - 300, height / 2 + 60).createFromHTML(`
      <select 
        id="maxPlayersSelect"
        style="
          width: 280px;
          padding: 10px 15px;
          font-size: 16px;
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

    const createButton = this.add.image(
      width / 2 - 300,
      height / 2 + 130,
      'createButton'
    ).setInteractive({ useHandCursor: true }).setScale(1.3);

    createButton.on('pointerover', () => createButton.setTint(0xcccccc));
    createButton.on('pointerout', () => createButton.clearTint());
    createButton.on('pointerdown', () => this.createRoom());

    // === Section JOIN ROOM (droite) ===
    
    this.add.text(width / 2 + 300, height / 2 - 120, 'Join Room', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2 + 300, height / 2 - 70, 'Your Name:', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.dom(width / 2 + 300, height / 2 - 30).createFromHTML(`
      <input 
        type="text" 
        id="playerNameInputJoin"
        placeholder="Enter your name" 
        maxlength="20"
        style="
          width: 280px;
          padding: 10px 15px;
          font-size: 16px;
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
    `).node.querySelector('#playerNameInputJoin')?.addEventListener('input', (e) => {
      this.playerName = (e.target as HTMLInputElement).value;
    });

    this.add.text(width / 2 + 300, height / 2 + 20, 'Room ID:', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.roomIdInput = this.add.dom(width / 2 + 300, height / 2 + 60).createFromHTML(`
      <input 
        type="text" 
        id="roomIdInput"
        placeholder="Enter room ID" 
        maxlength="30"
        style="
          width: 280px;
          padding: 10px 15px;
          font-size: 16px;
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

    const joinButton = this.add.image(
      width / 2 + 300,
      height / 2 + 130,
      'joinButton'
    ).setInteractive({ useHandCursor: true }).setScale(1.3);

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