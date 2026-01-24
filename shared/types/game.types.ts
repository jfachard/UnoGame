import { Card } from './card.types';

// ===== PLAYER =====
export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isReady: boolean;
  disconnected?: boolean;
}

export interface PlayerPublicInfo {
  id: string;
  name: string;
  cardsCount: number;
  isReady: boolean;
  disconnected?: boolean;
}

// ===== GAME STATE =====
export interface GameState {
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  lastPlayedCard: Card;
}

// ===== GAME ROOM =====
export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface GameRoom {
  id: string;
  hostId: string;
  status: RoomStatus;
  players: Player[];
  maxPlayers: number;
  createdAt: Date;
  gameState: GameState | null;
}

// ===== PUBLIC ROOM INFO (pour le client) =====
export interface GameRoomPublicInfo {
  id: string;
  hostId: string;
  status: RoomStatus;
  players: PlayerPublicInfo[];
  maxPlayers: number;
  createdAt: Date;
  currentPlayerIndex: number | null;
  lastPlayedCard: Card | null;
}