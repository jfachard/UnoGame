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

// Configuration constants
const CARD_CONFIG = {
  DECK_SCALE: 1.7,
  HAND_SCALE: 1.4,
  HOVER_SCALE: 1.7,
  SPACING: 140,
  DECK_OFFSET_X: 280,
  HAND_Y_OFFSET: 180,
  HOVER_Y_OFFSET: 60
} as const;

const COLORS = ['red', 'blue', 'green', 'yellow'] as const;

const COLOR_HEX: Record<CardColor, number> = {
  [CardColor.RED]: 0x8B303D,
  [CardColor.BLUE]: 0x2E5A7D,
  [CardColor.GREEN]: 0x5F7B3E,
  [CardColor.YELLOW]: 0xA06A34
};

const COLOR_NAMES: Record<CardColor, string> = {
  [CardColor.RED]: 'Red',
  [CardColor.BLUE]: 'Blue',
  [CardColor.GREEN]: 'Green',
  [CardColor.YELLOW]: 'Yellow'
};

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
    if (data.gameState) this.gameState = data.gameState;
    if (data.hand) this.myHand = data.hand;
    if (data.players) this.players = data.players;
  }

  preload() {
    this.loadBackgrounds();
    this.loadCardAssets();
  }

  private loadBackgrounds() {
    this.load.image('gameBackground', 'assets/GameBG.png');
    this.load.image('cardBack', 'assets/UnoCardSheet/others/cardBack.png');
  }

  private loadCardAssets() {
    this.loadNumberCards();
    this.loadActionCards();
    this.loadWildCards();
  }

  private loadNumberCards() {
    COLORS.forEach(color => {
      for (let i = 0; i <= 9; i++) {
        this.load.image(`${color}_${i}`, `assets/UnoCardSheet/numbers/${color}_${i}.png`);
      }
    });
  }

  private loadActionCards() {
    COLORS.forEach(color => {
      this.load.image(`${color}_skip`, `assets/UnoCardSheet/action/${color}_skip.png`);
      this.load.image(`${color}_reverse`, `assets/UnoCardSheet/action/${color}_reverse.png`);
      this.load.image(`${color}_+2`, `assets/UnoCardSheet/action/${color}_+2.png`);
    });
  }

  private loadWildCards() {
    this.load.image('wild', 'assets/UnoCardSheet/action/wild.png');
    this.load.image('wild_+4', 'assets/UnoCardSheet/action/wild_+4.png');
  }

  create() {
    this.initializeSocket();
    
    if (this.gameState && this.myHand.length > 0) {
      console.log('Drawing game board with initial data');
      this.drawGameBoard();
    } else {
      this.showLoadingScreen();
    }

    this.setupSocketListeners();
  }

  private initializeSocket() {
    this.socket = this.registry.get('socket');
    if (!this.socket || !this.socket.id) {
      console.error('Socket not found in registry!');
      return;
    }
    this.playerId = this.socket.id;
  }

  private showLoadingScreen() {
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

  drawGameBoard() {
    this.clearLoadingScreen();
    this.children.removeAll();

    this.drawBackground();
    this.drawRoomHeader();
    this.drawDeckAndDiscard();
    this.drawGameStatus();
    this.drawPlayerHand();
    this.drawOtherPlayers();
    this.drawUnoButton();
  }

  private clearLoadingScreen() {
    const loadingTimer = this.registry.get('loadingTimer');
    if (loadingTimer) {
      loadingTimer.remove();
      this.registry.remove('loadingTimer');
    }
  }

  private drawBackground() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, 'gameBackground');
  }

  private drawRoomHeader() {
    const { width } = this.scale;
    this.add.text(width / 2, 30, `Room: ${this.roomId}`, {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  private drawDeckAndDiscard() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.drawDeck(centerX - CARD_CONFIG.DECK_OFFSET_X, centerY);
    this.drawDiscardPile(centerX + CARD_CONFIG.DECK_OFFSET_X, centerY);
  }

  private drawDeck(x: number, y: number) {
    const deckCard = this.add.image(x, y, 'cardBack')
      .setScale(CARD_CONFIG.DECK_SCALE)
      .setInteractive({ useHandCursor: true });

    this.add.text(x, y + 145, `${this.gameState.deckCount || 0} cards`, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5);

    deckCard.on('pointerdown', () => this.drawCard());
  }

  private drawDiscardPile(x: number, y: number) {
    const lastCard = this.gameState.lastPlayedCard;
    const cardKey = this.getCardImageKey(lastCard);
    
    this.add.image(x, y, cardKey).setScale(CARD_CONFIG.DECK_SCALE);
  }

  private drawGameStatus() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.drawDirectionIndicator(centerX, centerY);
    this.drawCurrentPlayerInfo(centerX);
  }

  private drawDirectionIndicator(centerX: number, centerY: number) {
    const directionText = this.gameState.direction === 1 ? '→' : '←';
    this.add.text(centerX, centerY - 180, `Direction: ${directionText}`, {
      fontSize: '26px',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5);
  }

  private drawCurrentPlayerInfo(centerX: number) {
    const currentPlayer = this.players[this.gameState.currentPlayerIndex];
    if (!currentPlayer) return;

    const isMyTurn = currentPlayer.id === this.playerId;
    this.add.text(centerX, 70, `Current: ${currentPlayer.name} ${isMyTurn ? '(YOUR TURN)' : ''}`, {
      fontSize: '24px',
      color: isMyTurn ? '#2ecc71' : '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#00000088',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5);
  }

  drawPlayerHand() {
    if (!this.myHand || this.myHand.length === 0) {
      console.warn('No cards in hand to display');
      return;
    }

    const { width, height } = this.scale;
    const handY = height - CARD_CONFIG.HAND_Y_OFFSET;
    const startX = this.calculateHandStartX(width);

    this.myHand.forEach((card, index) => {
      const cardX = startX + index * CARD_CONFIG.SPACING;
      this.createInteractiveHandCard(cardX, handY, card, index);
    });
  }

  private calculateHandStartX(width: number): number {
    return (width - (this.myHand.length * CARD_CONFIG.SPACING)) / 2 + CARD_CONFIG.SPACING / 2;
  }

  private createInteractiveHandCard(x: number, y: number, card: Card, index: number) {
    const cardKey = this.getCardImageKey(card);
    const cardImage = this.add.image(x, y, cardKey)
      .setScale(0)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: cardImage,
      scaleX: CARD_CONFIG.HAND_SCALE,
      scaleY: CARD_CONFIG.HAND_SCALE,
      duration: 300,
      ease: 'Back.out'
    });

    this.addCardHoverEffect(cardImage, y);
    cardImage.on('pointerdown', () => {
      console.log('Card clicked:', card);
      this.playCard(card);
    });
  }

  private addCardHoverEffect(cardImage: Phaser.GameObjects.Image, originalY: number) {
    cardImage.on('pointerover', () => {
      cardImage.setScale(CARD_CONFIG.HOVER_SCALE);
      cardImage.setY(originalY - CARD_CONFIG.HOVER_Y_OFFSET);
      cardImage.setDepth(100);
    });

    cardImage.on('pointerout', () => {
      cardImage.setScale(CARD_CONFIG.HAND_SCALE);
      cardImage.setY(originalY);
      cardImage.setDepth(0);
    });
  }

  drawOtherPlayers() {
    const { width } = this.scale;
    const otherPlayers = this.players.filter(p => p.id !== this.playerId);
    const startX = this.calculateOtherPlayersStartX(width, otherPlayers.length);

    otherPlayers.forEach((player, index) => {
      const x = startX + index * 200;
      this.drawPlayerCard(x, 150, player);
    });
  }

  private calculateOtherPlayersStartX(width: number, playerCount: number): number {
    const spacing = 200;
    return (width - (playerCount * spacing)) / 2 + spacing / 2;
  }

  private drawPlayerCard(x: number, y: number, player: PlayerPublicInfo) {
    const isDisconnected = player.disconnected;
    const bgColor = isDisconnected ? 0x7f8c8d : 0x34495e;

    this.add.rectangle(x, y, 180, 120, bgColor, 0.8)
      .setStrokeStyle(2, isDisconnected ? 0xff0000 : 0xffffff);

    if (player.profilePic) {
      const pic = this.add.image(x, y - 30, `profile_pic${player.profilePic}`)
        .setScale(0.15);
      if (isDisconnected) {
        pic.setTint(0x555555);
      }
    }

    this.add.text(x, y + 20, player.name + (isDisconnected ? '\n(Offline)' : ''), {
      fontSize: '16px',
      color: isDisconnected ? '#ffcccc' : '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(x, y + 45, `${player.cardsCount} cards`, {
      fontSize: '14px',
      color: '#ecf0f1'
    }).setOrigin(0.5);
  }

  private drawUnoButton() {
    const { width, height } = this.scale;
    const unoButton = this.add.rectangle(width - 120, height - 120, 150, 80, 0xe74c3c)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff);

    this.add.text(width - 120, height - 120, 'UNO!', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.addUnoButtonInteractions(unoButton);
  }

  private addUnoButtonInteractions(button: Phaser.GameObjects.Rectangle) {
    button.on('pointerover', () => {
      button.setFillStyle(0xc0392b);
      button.setScale(1.05);
    });
    
    button.on('pointerout', () => {
      button.setFillStyle(0xe74c3c);
      button.setScale(1);
    });
    
    button.on('pointerdown', () => {
      console.log('UNO button clicked!');
      button.setScale(0.95);
      this.sayUno();
    });
    
    button.on('pointerup', () => {
      button.setScale(1.05);
    });
  }

  showColorSelector(card: Card) {
    this.pendingWildCard = card;
    const { width, height } = this.scale;

    this.colorSelector = this.createColorSelectorContainer(width, height);
  }

  private createColorSelectorContainer(width: number, height: number): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const centerX = width / 2;
    const centerY = height / 2;

    this.addOverlay(container, width, height);
    this.addColorSelectorTitle(container, centerX, centerY);
    this.addColorButtons(container, centerX, centerY);

    return container;
  }

  private addOverlay(container: Phaser.GameObjects.Container, width: number, height: number) {
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);
    container.add(overlay);
  }

  private addColorSelectorTitle(container: Phaser.GameObjects.Container, centerX: number, centerY: number) {
    const title = this.add.text(centerX, centerY - 120, 'Choose a color', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(title);
  }

  private addColorButtons(container: Phaser.GameObjects.Container, centerX: number, centerY: number) {
    const colors: CardColor[] = [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW];
    const buttonSpacing = 140;
    const startX = centerX - (buttonSpacing * 1.5);

    colors.forEach((color, index) => {
      const x = startX + index * buttonSpacing;
      this.createColorButton(container, x, centerY, color);
    });
  }

  private createColorButton(container: Phaser.GameObjects.Container, x: number, y: number, color: CardColor) {
    const button = this.add.rectangle(x, y, 100, 100, COLOR_HEX[color])
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff);

    const text = this.add.text(x, y + 70, COLOR_NAMES[color], {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.addColorButtonInteractions(button, color);

    container.add(button);
    container.add(text);
  }

  private addColorButtonInteractions(button: Phaser.GameObjects.Rectangle, color: CardColor) {
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
  }

  selectColor(color: CardColor) {
    if (!this.pendingWildCard) return;

    console.log(`Color selected: ${color}`);
    this.emitPlayCard(this.pendingWildCard.id, color);
    this.hideColorSelector();
  }

  private hideColorSelector() {
    if (this.colorSelector) {
      this.colorSelector.destroy();
      this.colorSelector = null;
    }
    this.pendingWildCard = null;
  }

  setupSocketListeners() {
    this.socket.on(SocketEvents.GAME_STATE_UPDATE, (data) => this.handleGameStateUpdate(data));
    this.socket.on(SocketEvents.GAME_OVER, (data) => this.handleGameOver(data));
    this.socket.on(SocketEvents.INVALID_MOVE, (data) => this.handleInvalidMove(data));
  }

  private handleGameStateUpdate(data: any) {
    console.log('Game state update:', data);
    this.gameState = data.gameState;
    if (data.hand) this.myHand = data.hand;
    if (data.players) this.players = data.players;
    this.drawGameBoard();
  }

  private handleGameOver(data: any) {
    console.log('Game over:', data);
    this.scene.start('GameOver', { winnerName: data.winnerName });
  }

  private handleInvalidMove(data: any) {
    console.error('Invalid move:', data);
    alert(`❌ Invalid move: ${data.message}`);
  }

  playCard(card: Card) {
    console.log('Playing card:', card);
    
    if (this.isWildCard(card)) {
      this.showColorSelector(card);
    } else {
      this.emitPlayCard(card.id);
    }
  }

  private isWildCard(card: Card): boolean {
    return card.value === CardValue.WILD || card.value === CardValue.WILD_DRAW_FOUR;
  }

  private emitPlayCard(cardId: string, chosenColor?: CardColor) {
    this.socket.emit(SocketEvents.PLAY_CARD, {
      roomId: this.roomId,
      cardId,
      ...(chosenColor && { chosenColor })
    });
  }

  drawCard() {
    console.log('Drawing card');
    this.socket.emit(SocketEvents.DRAW_CARD, {
      roomId: this.roomId
    });
  }

  sayUno() {
    console.log('Saying UNO!');
    
    if (!this.canSayUno()) {
      this.showUnoWarning();
      return;
    }

    this.showUnoSuccess();
    this.emitSayUno();
  }

  private canSayUno(): boolean {
    const currentPlayer = this.players.find(p => p.id === this.playerId);
    if (!currentPlayer) {
      console.error('Current player not found');
      return false;
    }
    return currentPlayer.cardsCount === 1;
  }

  private showUnoWarning() {
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

    this.time.delayedCall(2000, () => warningText.destroy());
  }

  private showUnoSuccess() {
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
      onComplete: () => successText.destroy()
    });
  }

  private emitSayUno() {
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
