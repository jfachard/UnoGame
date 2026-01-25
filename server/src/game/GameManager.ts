import { GameRoom, Player, GameState, RoomStatus } from '../../../shared/types/game.types';
import { Card, CardColor, CardValue } from '../../../shared/types/card.types';
import { randomUUID } from 'crypto';

export class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private disconnectedPlayers: Map<string, NodeJS.Timeout> = new Map();

  private readonly RECONNECT_TIMEOUT = 30000;
  private readonly DISCONNECT_PENALTY_CARDS = 2;
  private readonly INITIAL_HAND_SIZE = 7;

  // ===== ROOM MANAGEMENT =====
  
  createRoom(roomId: string, hostId: string, hostName: string, maxPlayers: number = 4): GameRoom {
    if (this.rooms.has(roomId)) {
      throw new Error(`Room ${roomId} already exists`);
    }

    const host: Player = {
      id: hostId,
      name: hostName,
      hand: [],
      isReady: false,
      disconnected: false,
    };

    const room: GameRoom = {
      id: roomId,
      hostId,
      status: 'waiting',
      players: [host],
      maxPlayers,
      createdAt: new Date(),
      gameState: null,
    };

    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  roomExists(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  // ===== PLAYER MANAGEMENT =====

  addPlayerToRoom(roomId: string, playerId: string, playerName: string): Player {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    if (room.status !== 'waiting') {
      throw new Error('Cannot join a game in progress');
    }

    if (room.players.some(p => p.id === playerId)) {
      throw new Error('Player already in room');
    }

    const player: Player = {
      id: playerId,
      name: playerName,
      hand: [],
      isReady: false,
      disconnected: false,
    };

    room.players.push(player);
    return player;
  }

  removePlayerFromRoom(roomId: string, playerId: string): void {
    const room = this.getRoom(roomId);
    if (!room) return;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    if (room.status === 'playing' && room.gameState) {
      this.handlePlayerDisconnect(roomId, playerId);
      return;
    }

    room.players.splice(playerIndex, 1);

    if (room.players.length === 0) {
      this.deleteRoom(roomId);
      return;
    }

    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
    }
  }

  // ===== DISCONNECTION HANDLING =====

  handlePlayerDisconnect(roomId: string, playerId: string): void {
    const room = this.getRoom(roomId);
    if (!room || !room.gameState) return;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const player = room.players[playerIndex];

    player.disconnected = true;

    console.log(`Player ${playerId} disconnected from room ${roomId}. Waiting ${this.RECONNECT_TIMEOUT}ms for reconnection...`);

    if (room.gameState.currentPlayerIndex === playerIndex) {
      console.log(`Skipping turn of disconnected player ${playerId}`);
      
      this.drawCards(room, playerIndex, this.DISCONNECT_PENALTY_CARDS);
      
      this.nextTurn(room);
    }

    const timeout = setTimeout(() => {
      this.handlePlayerForfeit(roomId, playerId);
    }, this.RECONNECT_TIMEOUT);

    this.disconnectedPlayers.set(playerId, timeout);
  }

  handlePlayerReconnect(roomId: string, playerId: string): boolean {
    const room = this.getRoom(roomId);
    if (!room) return false;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    const timeout = this.disconnectedPlayers.get(playerId);
    if (timeout) {
      clearTimeout(timeout);
      this.disconnectedPlayers.delete(playerId);
    }

    player.disconnected = false;
    console.log(`Player ${playerId} reconnected to room ${roomId}`);

    return true;
  }

  handlePlayerForfeit(roomId: string, playerId: string): void {
    const room = this.getRoom(roomId);
    if (!room || !room.gameState) return;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const player = room.players[playerIndex];

    console.log(`Player ${playerId} forfeited from room ${roomId}`);

    if (player.hand.length > 0) {
      room.gameState.deck.push(...player.hand);
      this.shuffleDeck(room.gameState.deck);
    }

    room.players.splice(playerIndex, 1);
    this.disconnectedPlayers.delete(playerId);

    if (playerIndex < room.gameState.currentPlayerIndex) {
      room.gameState.currentPlayerIndex--;
    } else if (playerIndex === room.gameState.currentPlayerIndex) {
      if (room.gameState.currentPlayerIndex >= room.players.length) {
        room.gameState.currentPlayerIndex = 0;
      }
    }

    if (room.players.length === 1) {
      room.status = 'finished';
      console.log(`Room ${roomId} finished. Winner: ${room.players[0].name} (by forfeit)`);
    } else if (room.players.length === 0) {
      this.deleteRoom(roomId);
    }

    if (room.hostId === playerId && room.players.length > 0) {
      room.hostId = room.players[0].id;
    }
  }

  // ===== DECK GENERATION =====

  /**
   * Crée un deck complet de cartes UNO (104 cartes sans les Wild +4)
   */
  private createDeck(): Card[] {
    const deck: Card[] = [];
    const colors = [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW];

    colors.forEach(color => {
      deck.push({
        id: randomUUID(),
        color,
        value: CardValue.ZERO
      });

      [
        CardValue.ONE, CardValue.TWO, CardValue.THREE, CardValue.FOUR,
        CardValue.FIVE, CardValue.SIX, CardValue.SEVEN, CardValue.EIGHT, CardValue.NINE
      ].forEach(value => {
        deck.push(
          { id: randomUUID(), color, value },
          { id: randomUUID(), color, value }
        );
      });
    });

    colors.forEach(color => {
      [CardValue.SKIP, CardValue.REVERSE, CardValue.DRAW_TWO].forEach(value => {
        deck.push(
          { id: randomUUID(), color, value },
          { id: randomUUID(), color, value }
        );
      });
    });

    for (let i = 0; i < 4; i++) {
      deck.push({
        id: randomUUID(),
        color: null,
        value: CardValue.WILD
      });
    }

    return deck;
  }

  /**
   * Mélange un deck de cartes (Fisher-Yates shuffle)
   */
  private shuffleDeck(deck: Card[]): void {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  /**
   * Distribue un nombre de cartes à chaque joueur
   */
  private dealCards(room: GameRoom, cardsPerPlayer: number): void {
    if (!room.gameState) {
      throw new Error('Game state not initialized');
    }

    room.players.forEach(player => {
      for (let i = 0; i < cardsPerPlayer; i++) {
        const card = room.gameState!.deck.pop();
        if (!card) {
          throw new Error('Not enough cards in deck to deal');
        }
        player.hand.push(card);
      }
    });
  }

  /**
   * Trouve la première carte valide pour démarrer la partie
   * (pas de Wild, pas de cartes spéciales)
   */
  private findStartingCard(deck: Card[]): Card {
    const validStartingCardIndex = deck.findIndex(card => 
      card.color !== null && 
      ![CardValue.WILD, CardValue.SKIP, CardValue.REVERSE, CardValue.DRAW_TWO].includes(card.value)
    );

    if (validStartingCardIndex === -1) {
      throw new Error('No valid starting card found in deck');
    }

    return deck.splice(validStartingCardIndex, 1)[0];
  }

  /**
   * Fait piocher des cartes à un joueur
   */
  private drawCards(room: GameRoom, playerIndex: number, count: number): void {
    if (!room.gameState) return;

    const player = room.players[playerIndex];
    
    for (let i = 0; i < count; i++) {
      if (room.gameState.deck.length === 0) {
        if (room.gameState.discardPile.length <= 1) {
          console.log('No more cards to draw!');
          break;
        }
        
        const lastCard = room.gameState.discardPile.pop()!;
        room.gameState.deck = [...room.gameState.discardPile];
        room.gameState.discardPile = [lastCard];
        this.shuffleDeck(room.gameState.deck);
        
        console.log(`Deck empty! Reshuffled ${room.gameState.deck.length} cards from discard pile`);
      }

      const card = room.gameState.deck.pop();
      if (card) {
        player.hand.push(card);
      }
    }
  }

  /**
   * Passe au tour suivant
   */
  private nextTurn(room: GameRoom): void {
    if (!room.gameState) return;

    const { direction, currentPlayerIndex } = room.gameState;
    let nextIndex = currentPlayerIndex + direction;

    if (nextIndex < 0) {
      nextIndex = room.players.length - 1;
    } else if (nextIndex >= room.players.length) {
      nextIndex = 0;
    }

    room.gameState.currentPlayerIndex = nextIndex;

    if (room.players[nextIndex].disconnected) {
      console.log(`Player ${room.players[nextIndex].id} is disconnected, skipping...`);
      this.drawCards(room, nextIndex, this.DISCONNECT_PENALTY_CARDS);
      this.nextTurn(room);
    }
  }

  // ===== PLAYER READY =====

  setPlayerReady(roomId: string, playerId: string, isReady: boolean): void {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not in room');
    }

    player.isReady = isReady;
  }

  canStartGame(roomId: string): boolean {
    const room = this.getRoom(roomId);
    if (!room) return false;

    return (
      room.players.length >= 2 &&
      room.status === 'waiting' &&
      room.players.every(p => p.isReady)
    );
  }

  // ===== GAME LOGIC =====

  startGame(roomId: string): GameState {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    if (!this.canStartGame(roomId)) {
      throw new Error('Cannot start game: not all players ready');
    }

    const deck = this.createDeck();
    this.shuffleDeck(deck);

    console.log(`Created and shuffled deck with ${deck.length} cards for room ${roomId}`);

    const gameState: GameState = {
      deck,
      discardPile: [],
      currentPlayerIndex: 0,
      direction: 1,
      lastPlayedCard: null as any, // sera défini juste après
    };

    room.gameState = gameState;

    this.dealCards(room, this.INITIAL_HAND_SIZE);

    console.log(`Dealt ${this.INITIAL_HAND_SIZE} cards to each of ${room.players.length} players`);

    const startingCard = this.findStartingCard(gameState.deck);
    gameState.discardPile.push(startingCard);
    gameState.lastPlayedCard = startingCard;

    console.log(`Starting card: ${startingCard.value} of ${startingCard.color}`);
    console.log(`Remaining cards in deck: ${gameState.deck.length}`);

    room.status = 'playing';

    return gameState;
  }

  // ===== GAME ACTIONS =====

  /**
   * Vérifie si c'est le tour du joueur
   */
  isPlayerTurn(roomId: string, playerId: string): boolean {
    const room = this.getRoom(roomId);
    if (!room || !room.gameState) return false;

    const currentPlayer = room.players[room.gameState.currentPlayerIndex];
    return currentPlayer.id === playerId;
  }

  /**
   * Vérifie si une carte est jouable sur la carte actuelle
   */
  canPlayCard(card: Card, currentCard: Card): boolean {
    // Wild peut toujours être joué
    if (card.value === CardValue.WILD || card.value === CardValue.WILD_DRAW_FOUR) {
      return true;
    }

    // Même couleur ou même valeur
    return card.color === currentCard.color || card.value === currentCard.value;
  }

  /**
   * Joue une carte
   */
  playCard(roomId: string, playerId: string, cardId: string, chosenColor?: CardColor): void {
    const room = this.getRoom(roomId);
    if (!room || !room.gameState) {
      throw new Error('Room or game state not found');
    }

    if (!this.isPlayerTurn(roomId, playerId)) {
      throw new Error('Not your turn');
    }

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    const player = room.players[playerIndex];

    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      throw new Error('Card not in hand');
    }

    const card = player.hand[cardIndex];

    if (!this.canPlayCard(card, room.gameState.lastPlayedCard)) {
      throw new Error('Card cannot be played');
    }

    // Retirer la carte de la main
    player.hand.splice(cardIndex, 1);

    // Si Wild, appliquer la couleur choisie
    if ((card.value === CardValue.WILD || card.value === CardValue.WILD_DRAW_FOUR) && chosenColor) {
      card.activeColor = chosenColor;
    }

    // Ajouter à la pile de défausse
    room.gameState.discardPile.push(card);
    room.gameState.lastPlayedCard = card;

    // Appliquer les effets de la carte
    this.applyCardEffect(room, card, playerIndex);

    // Vérifier victoire
    if (player.hand.length === 0) {
      room.status = 'finished';
    }
  }

  /**
   * Applique l'effet d'une carte spéciale
   */
  private applyCardEffect(room: GameRoom, card: Card, playerIndex: number): void {
    if (!room.gameState) return;

    switch (card.value) {
      case CardValue.SKIP:
        // Skip le prochain joueur
        this.nextTurn(room);
        this.nextTurn(room);
        break;

      case CardValue.REVERSE:
        // Inverser le sens
        room.gameState.direction *= -1;
        this.nextTurn(room);
        break;

      case CardValue.DRAW_TWO:
        // Le prochain joueur pioche 2 cartes et passe son tour
        this.nextTurn(room);
        this.drawCards(room, room.gameState.currentPlayerIndex, 2);
        this.nextTurn(room);
        break;

      case CardValue.WILD_DRAW_FOUR:
        // Le prochain joueur pioche 4 cartes et passe son tour
        this.nextTurn(room);
        this.drawCards(room, room.gameState.currentPlayerIndex, 4);
        this.nextTurn(room);
        break;

      default:
        // Carte normale, juste passer au suivant
        this.nextTurn(room);
        break;
    }
  }

  /**
   * Fait piocher une carte à un joueur (action volontaire)
   */
  drawCardForPlayer(roomId: string, playerId: string): Card | null {
    const room = this.getRoom(roomId);
    if (!room || !room.gameState) {
      throw new Error('Room or game state not found');
    }

    if (!this.isPlayerTurn(roomId, playerId)) {
      throw new Error('Not your turn');
    }

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    this.drawCards(room, playerIndex, 1);

    // Retourner la carte piochée (dernière de la main)
    const player = room.players[playerIndex];
    return player.hand[player.hand.length - 1] || null;
  }

  /**
   * Passe le tour après avoir pioché
   */
  passTurnAfterDraw(roomId: string, playerId: string): void {
    const room = this.getRoom(roomId);
    if (!room || !room.gameState) {
      throw new Error('Room or game state not found');
    }

    if (!this.isPlayerTurn(roomId, playerId)) {
      throw new Error('Not your turn');
    }

    this.nextTurn(room);
  }

  // ===== UTILS =====

  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  cleanup(): void {
    this.disconnectedPlayers.forEach(timeout => clearTimeout(timeout));
    this.disconnectedPlayers.clear();
  }
}