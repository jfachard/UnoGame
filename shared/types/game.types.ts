import { Card } from './card.types';

export interface Player {
  id: string;
  name: string;
  cards: Card[];
  isReady: boolean;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  drawPile: Card[];
  discardPile: Card[];
  direction: 1 | -1;
  gameStarted: boolean;
}