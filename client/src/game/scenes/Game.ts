import { Scene } from 'phaser';
import { Socket } from 'socket.io-client';
import { Card, CardValue } from '../../../../shared/types/card.types';
import { PlayerPublicInfo } from '../../../../shared/types/game.types';
import { SocketEvents } from '../../../../shared/types/events.types';

// Type pour gameState côté client
interface GameStateClient {
  currentPlayerIndex: number;
  direction: 1 | -1;
  lastPlayedCard: Card;
  deckCount: number;
  discardPileCount: number;
}

export class Game extends Scene {
  private socket!: Socket;
  private roomId!: string;
  private playerId!: string;
  private gameState!: GameStateClient;
  private myHand: Card[] = [];
  private players: PlayerPublicInfo[] = [];

  constructor() {
    super('Game');
  }

  init(data: { roomId: string; gameState?: GameStateClient; hand?: Card[]; players?: PlayerPublicInfo[] }) {
    this.roomId = data.roomId;
    
    // Si les données sont passées depuis Lobby, les utiliser directement
    if (data.gameState) {
      this.gameState = data.gameState;
    }
    if (data.hand) {
      this.myHand = data.hand;
    }
    if (data.players) {
      this.players = data.players;
    }
  }

  preload() {
    this.load.image('background', 'assets/GameBG.png');
  }

  create() {
    this.socket = this.registry.get('socket');
    if (!this.socket || !this.socket.id) {
      console.error('Socket not found in registry!');
      return;
    }
    this.playerId = this.socket.id;

    // Si on a déjà les données du jeu (passées par Lobby), dessiner directement
    if (this.gameState && this.myHand.length > 0) {
      console.log('Drawing game board with initial data');
      this.drawGameBoard();
    } else {
      // Sinon, afficher le loading
      const { width, height } = this.scale;
      
      this.add.image(width / 2, height / 2, 'background');
      
      this.add.text(width / 2, 30, `Room: ${this.roomId}`, {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const loadingText = this.add.text(width / 2, height / 2, 'Starting game...', {
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      let dots = 0;
      const loadingTimer = this.time.addEvent({
        delay: 500,
        callback: () => {
          dots = (dots + 1) % 4;
          loadingText.setText('Starting game' + '.'.repeat(dots));
        },
        loop: true
      });

      this.registry.set('loadingTimer', loadingTimer);
    }

    this.setupSocketListeners();
  }

  drawGameBoard() {
    // Arrêter l'animation de chargement
    const loadingTimer = this.registry.get('loadingTimer');
    if (loadingTimer) {
      loadingTimer.remove();
      this.registry.remove('loadingTimer');
    }

    // Clear previous game objects
    this.children.removeAll();

    const { width, height } = this.scale;

    // Background
    this.add.image(width / 2, height / 2, 'background');

    // Titre de la room
    this.add.text(width / 2, 30, `Room: ${this.roomId}`, {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Zone centrale : Pioche + Carte jouée
    const centerX = width / 2;
    const centerY = height / 2;

    // Pioche (deck) à gauche
    const deckX = centerX - 150;
    const deckBg = this.add.rectangle(deckX, centerY, 100, 140, 0x2c3e50)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(3, 0xffffff);

    this.add.text(deckX, centerY - 60, 'DECK', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(deckX, centerY, `${this.gameState.deckCount || 0}`, {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    deckBg.on('pointerdown', () => this.drawCard());

    // Dernière carte jouée à droite
    const discardX = centerX + 150;
    const lastCard = this.gameState.lastPlayedCard;
    
    const cardColor = lastCard.activeColor || lastCard.color;
    this.add.rectangle(discardX, centerY, 100, 140, this.getCardColor(cardColor || 'black'))
      .setStrokeStyle(3, 0x000000);

    this.add.text(discardX, centerY, lastCard.value.toUpperCase(), {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
      wordWrap: { width: 90 }
    }).setOrigin(0.5);

    // Indicateur de direction
    const directionText = this.gameState.direction === 1 ? '→' : '←';
    this.add.text(centerX, centerY - 120, `Direction: ${directionText}`, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Afficher le joueur actuel
    const currentPlayer = this.players[this.gameState.currentPlayerIndex];
    if (currentPlayer) {
      const isMyTurn = currentPlayer.id === this.playerId;
      this.add.text(centerX, 80, `Current: ${currentPlayer.name} ${isMyTurn ? '(YOUR TURN)' : ''}`, {
        fontSize: '22px',
        color: isMyTurn ? '#2ecc71' : '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    // Zone du bas : Main du joueur
    this.drawPlayerHand();

    // Afficher les autres joueurs
    this.drawOtherPlayers();

    // Bouton UNO
    const unoButton = this.add.rectangle(width - 100, height - 100, 120, 60, 0xe74c3c)
      .setInteractive({ useHandCursor: true });

    this.add.text(width - 100, height - 100, 'UNO!', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    unoButton.on('pointerover', () => unoButton.setFillStyle(0xc0392b));
    unoButton.on('pointerout', () => unoButton.setFillStyle(0xe74c3c));
    unoButton.on('pointerdown', () => this.sayUno());
  }

  drawPlayerHand() {
    // Vérification de sécurité
    if (!this.myHand || this.myHand.length === 0) {
      console.warn('No cards in hand to display');
      return;
    }

    const { width, height } = this.scale;
    const handY = height - 150;
    const cardSpacing = 110;
    const startX = (width - (this.myHand.length * cardSpacing)) / 2 + 50;

    this.myHand.forEach((card, index) => {
      const cardX = startX + index * cardSpacing;

      const displayColor = card.activeColor || card.color;
      const cardBg = this.add.rectangle(cardX, handY, 90, 130, this.getCardColor(displayColor || 'black'))
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(3, 0x000000);

      const cardText = this.add.text(cardX, handY, card.value.toUpperCase(), {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
        wordWrap: { width: 80 }
      }).setOrigin(0.5);

      // Effet hover
      cardBg.on('pointerover', () => {
        cardBg.setY(handY - 20);
        cardText.setY(handY - 20);
      });

      cardBg.on('pointerout', () => {
        cardBg.setY(handY);
        cardText.setY(handY);
      });

      cardBg.on('pointerdown', () => this.playCard(card));
    });
  }

  drawOtherPlayers() {
    const { width } = this.scale;
    
    // Afficher les autres joueurs en haut
    let otherPlayers = this.players.filter(p => p.id !== this.playerId);
    const spacing = 200;
    const startX = (width - (otherPlayers.length * spacing)) / 2 + spacing / 2;

    otherPlayers.forEach((player, index) => {
      const x = startX + index * spacing;
      const y = 150;

      // Container pour chaque joueur
      this.add.rectangle(x, y, 180, 120, 0x34495e, 0.8)
        .setStrokeStyle(2, 0xffffff);

      // Photo de profil
      if (player.profilePic) {
        this.add.image(x, y - 30, `profile_pic${player.profilePic}`)
          .setScale(0.15);
      }

      // Nom du joueur
      this.add.text(x, y + 20, player.name, {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      // Nombre de cartes
      this.add.text(x, y + 45, `${player.cardsCount} cards`, {
        fontSize: '14px',
        color: '#ecf0f1'
      }).setOrigin(0.5);
    });
  }

  setupSocketListeners() {
    this.socket.on(SocketEvents.GAME_STATE_UPDATE, (data) => {
      console.log('Game state update:', data);
      this.gameState = data.gameState;
      
      if (data.hand) {
        this.myHand = data.hand;
      }
      
      if (data.players) {
        this.players = data.players;
      }
      
      this.drawGameBoard();
    });

    this.socket.on(SocketEvents.GAME_OVER, (data) => {
      console.log('Game over:', data);
      alert(`🏆 ${data.winnerName} won the game!`);
      this.scene.start('MainMenu');
    });

    this.socket.on(SocketEvents.INVALID_MOVE, (data) => {
      console.error('Invalid move:', data);
      alert(`❌ Invalid move: ${data.message}`);
    });
  }

  playCard(card: Card) {
    console.log('Playing card:', card);
    
    // Si c'est un wild, demander la couleur
    if (card.value === CardValue.WILD || card.value === CardValue.WILD_DRAW_FOUR) {
      // TODO: Afficher un sélecteur de couleur
      const chosenColor = 'red'; // Temporaire
      this.socket.emit(SocketEvents.PLAY_CARD, {
        roomId: this.roomId,
        cardId: card.id,
        chosenColor
      });
    } else {
      this.socket.emit(SocketEvents.PLAY_CARD, {
        roomId: this.roomId,
        cardId: card.id
      });
    }
  }

  drawCard() {
    console.log('Drawing card');
    this.socket.emit(SocketEvents.DRAW_CARD, {
      roomId: this.roomId
    });
  }

  sayUno() {
    console.log('Saying UNO!');
    this.socket.emit(SocketEvents.SAY_UNO, {
      roomId: this.roomId
    });
  }

  getCardColor(color: string): number {
    const colors: { [key: string]: number } = {
      red: 0xe74c3c,
      blue: 0x3498db,
      green: 0x2ecc71,
      yellow: 0xf1c40f,
      black: 0x2c3e50
    };
    return colors[color] || 0x95a5a6;
  }

  shutdown() {
    this.socket.off(SocketEvents.GAME_STATE_UPDATE);
    this.socket.off(SocketEvents.GAME_OVER);
    this.socket.off(SocketEvents.INVALID_MOVE);
  }
}
