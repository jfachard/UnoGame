import { Scene } from 'phaser';
import { Socket } from 'socket.io-client';
import { Card, CardValue, CardColor } from '../../../../shared/types/card.types';
import { PlayerPublicInfo } from '../../../../shared/types/game.types';
import { SocketEvents } from '../../../../shared/types/events.types';

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
  private colorSelector: Phaser.GameObjects.Container | null = null;
  private pendingWildCard: Card | null = null;

  constructor() {
    super('Game');
  }

  init(data: { roomId: string; gameState?: GameStateClient; hand?: Card[]; players?: PlayerPublicInfo[] }) {
    this.roomId = data.roomId;
    
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
    this.load.image('gameBackground', 'assets/GameBG.png');
    this.load.image('cardBack', 'assets/UnoCardSheet/others/cardBack.png');
    
    const colors = ['red', 'blue', 'green', 'yellow'];
    colors.forEach(color => {
      for (let i = 0; i <= 9; i++) {
        this.load.image(`${color}_${i}`, `assets/UnoCardSheet/numbers/${color}_${i}.png`);
      }
      
      this.load.image(`${color}_skip`, `assets/UnoCardSheet/action/${color}_skip.png`);
      this.load.image(`${color}_reverse`, `assets/UnoCardSheet/action/${color}_reverse.png`);
      this.load.image(`${color}_+2`, `assets/UnoCardSheet/action/${color}_+2.png`);
    });
    
    this.load.image('wild', 'assets/UnoCardSheet/action/wild.png');
    this.load.image('wild_+4', 'assets/UnoCardSheet/action/wild_+4.png');
  }

  create() {
    this.socket = this.registry.get('socket');
    if (!this.socket || !this.socket.id) {
      console.error('Socket not found in registry!');
      return;
    }
    this.playerId = this.socket.id;

    if (this.gameState && this.myHand.length > 0) {
      console.log('Drawing game board with initial data');
      this.drawGameBoard();
    } else {
      const { width, height } = this.scale;
      
      this.add.image(width / 2, height / 2, 'gameBackground');
      
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
    const loadingTimer = this.registry.get('loadingTimer');
    if (loadingTimer) {
      loadingTimer.remove();
      this.registry.remove('loadingTimer');
    }

    this.children.removeAll();

    const { width, height } = this.scale;

    this.add.image(width / 2, height / 2, 'gameBackground');

    this.add.text(width / 2, 30, `Room: ${this.roomId}`, {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const centerX = width / 2;
    const centerY = height / 2;

    const deckX = centerX - 280;
    const deckCard = this.add.image(deckX, centerY, 'cardBack')
      .setScale(1.7)
      .setInteractive({ useHandCursor: true });

    this.add.text(deckX, centerY + 145, `${this.gameState.deckCount || 0} cards`, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5);

    deckCard.on('pointerdown', () => this.drawCard());

    const discardX = centerX + 280;
    const lastCard = this.gameState.lastPlayedCard;
    const cardKey = this.getCardImageKey(lastCard);
    
    this.add.image(discardX, centerY, cardKey)
      .setScale(1.7);

    const directionText = this.gameState.direction === 1 ? '→' : '←';
    this.add.text(centerX, centerY - 180, `Direction: ${directionText}`, {
      fontSize: '26px',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5);

    const currentPlayer = this.players[this.gameState.currentPlayerIndex];
    if (currentPlayer) {
      const isMyTurn = currentPlayer.id === this.playerId;
      this.add.text(centerX, 70, `Current: ${currentPlayer.name} ${isMyTurn ? '(YOUR TURN)' : ''}`, {
        fontSize: '24px',
        color: isMyTurn ? '#2ecc71' : '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#00000088',
        padding: { x: 15, y: 8 }
      }).setOrigin(0.5);
    }

    this.drawPlayerHand();
    this.drawOtherPlayers();

    const unoButton = this.add.rectangle(width - 120, height - 120, 150, 80, 0xe74c3c)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff);

    this.add.text(width - 120, height - 120, 'UNO!', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    unoButton.on('pointerover', () => {
      unoButton.setFillStyle(0xc0392b);
      unoButton.setScale(1.05);
    });
    
    unoButton.on('pointerout', () => {
      unoButton.setFillStyle(0xe74c3c);
      unoButton.setScale(1);
    });
    
    unoButton.on('pointerdown', () => {
      console.log('UNO button clicked!');
      unoButton.setScale(0.95);
      this.sayUno();
    });
    
    unoButton.on('pointerup', () => {
      unoButton.setScale(1.05);
    });
  }

  drawPlayerHand() {
    if (!this.myHand || this.myHand.length === 0) {
      console.warn('No cards in hand to display');
      return;
    }

    const { width, height } = this.scale;
    const handY = height - 180;
    const cardSpacing = 140;
    const startX = (width - (this.myHand.length * cardSpacing)) / 2 + cardSpacing / 2;

    this.myHand.forEach((card, index) => {
      const cardX = startX + index * cardSpacing;
      const cardKey = this.getCardImageKey(card);

      const cardImage = this.add.image(cardX, handY, cardKey)
        .setScale(1.4)
        .setInteractive({ useHandCursor: true });

      cardImage.on('pointerover', () => {
        cardImage.setScale(1.7);
        cardImage.setY(handY - 60);
        cardImage.setDepth(100);
      });

      cardImage.on('pointerout', () => {
        cardImage.setScale(1.4);
        cardImage.setY(handY);
        cardImage.setDepth(0);
      });

      cardImage.on('pointerdown', () => {
        console.log('Card clicked:', card);
        this.playCard(card);
      });
    });
  }

  drawOtherPlayers() {
    const { width } = this.scale;
    
    const otherPlayers = this.players.filter(p => p.id !== this.playerId);
    const spacing = 200;
    const startX = (width - (otherPlayers.length * spacing)) / 2 + spacing / 2;

    otherPlayers.forEach((player, index) => {
      const x = startX + index * spacing;
      const y = 150;

      this.add.rectangle(x, y, 180, 120, 0x34495e, 0.8)
        .setStrokeStyle(2, 0xffffff);

      if (player.profilePic) {
        this.add.image(x, y - 30, `profile_pic${player.profilePic}`)
          .setScale(0.15);
      }

      this.add.text(x, y + 20, player.name, {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      this.add.text(x, y + 45, `${player.cardsCount} cards`, {
        fontSize: '14px',
        color: '#ecf0f1'
      }).setOrigin(0.5);
    });
  }

  showColorSelector(card: Card) {
    this.pendingWildCard = card;

    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.colorSelector = this.add.container(0, 0);

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0);
    this.colorSelector.add(overlay);

    const title = this.add.text(centerX, centerY - 120, 'Choose a color', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.colorSelector.add(title);

    const colors: CardColor[] = [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW];
    const colorHex: Record<CardColor, number> = {
      [CardColor.RED]: 0xe74c3c,
      [CardColor.BLUE]: 0x3498db,
      [CardColor.GREEN]: 0x2ecc71,
      [CardColor.YELLOW]: 0xf1c40f
    };
    const colorNames: Record<CardColor, string> = {
      [CardColor.RED]: 'Red',
      [CardColor.BLUE]: 'Blue',
      [CardColor.GREEN]: 'Green',
      [CardColor.YELLOW]: 'Yellow'
    };

    const buttonSpacing = 140;
    const startX = centerX - (buttonSpacing * 1.5);

    colors.forEach((color, index) => {
      const x = startX + index * buttonSpacing;
      const y = centerY;

      const button = this.add.rectangle(x, y, 100, 100, colorHex[color])
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(4, 0xffffff);

      const text = this.add.text(x, y + 70, colorNames[color], {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      button.on('pointerover', () => {
        button.setScale(1.1);
        button.setStrokeStyle(6, 0xffff00);
      });

      button.on('pointerout', () => {
        button.setScale(1);
        button.setStrokeStyle(4, 0xffffff);
      });

      button.on('pointerdown', () => {
        this.selectColor(color);
      });

      this.colorSelector!.add(button);
      this.colorSelector!.add(text);
    });
  }

  selectColor(color: CardColor) {
    if (!this.pendingWildCard) return;

    console.log(`Color selected: ${color}`);

    this.socket.emit(SocketEvents.PLAY_CARD, {
      roomId: this.roomId,
      cardId: this.pendingWildCard.id,
      chosenColor: color
    });

    if (this.colorSelector) {
      this.colorSelector.destroy();
      this.colorSelector = null;
    }
    this.pendingWildCard = null;
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
    
    if (card.value === CardValue.WILD || card.value === CardValue.WILD_DRAW_FOUR) {
      this.showColorSelector(card);
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
    
    const currentPlayer = this.players.find(p => p.id === this.playerId);
    if (!currentPlayer) {
      console.error('Current player not found');
      return;
    }

    if (currentPlayer.cardsCount !== 1) {
      console.warn('You can only say UNO when you have 1 card');
      const { width, height } = this.scale;
      const warningText = this.add.text(width / 2, height / 2, 'You can only say UNO\nwhen you have 1 card!', {
        fontSize: '28px',
        color: '#ff0000',
        fontStyle: 'bold',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 },
        align: 'center'
      }).setOrigin(0.5).setDepth(1000);

      this.time.delayedCall(2000, () => {
        warningText.destroy();
      });
      return;
    }

    const { width, height } = this.scale;
    const successText = this.add.text(width / 2, height / 2, '🎉 UNO! 🎉', {
      fontSize: '48px',
      color: '#2ecc71',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setDepth(1000);

    this.tweens.add({
      targets: successText,
      scale: { from: 0.5, to: 1.2 },
      alpha: { from: 1, to: 0 },
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        successText.destroy();
      }
    });

    this.socket.emit(SocketEvents.SAY_UNO, {
      roomId: this.roomId
    });
  }

  getCardImageKey(card: Card): string {
    const color = card.activeColor || card.color;
    const value = card.value;

    if (value === CardValue.WILD) {
      return 'wild';
    }
    if (value === CardValue.WILD_DRAW_FOUR) {
      return 'wild_+4';
    }

    if (value === CardValue.SKIP) {
      return `${color}_skip`;
    }
    if (value === CardValue.REVERSE) {
      return `${color}_reverse`;
    }
    if (value === CardValue.DRAW_TWO) {
      return `${color}_+2`;
    }

    return `${color}_${value}`;
  }

  shutdown() {
    this.socket.off(SocketEvents.GAME_STATE_UPDATE);
    this.socket.off(SocketEvents.GAME_OVER);
    this.socket.off(SocketEvents.INVALID_MOVE);
  }
}
