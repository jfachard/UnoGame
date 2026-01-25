import { Server, Socket } from 'socket.io';
import { GameManager } from '../game/GameManager';
import { SocketEvents } from '../../../shared/types/events.types';
import { CardColor } from '../../../shared/types/card.types';

export function registerGameHandlers(socket: Socket, io: Server, gameManager: GameManager) {
  
  // ===== START GAME =====
  socket.on(SocketEvents.START_GAME, (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      const room = gameManager.getRoom(roomId);
      if (!room) {
        socket.emit(SocketEvents.ERROR, { message: 'Room not found' });
        return;
      }

      if (room.hostId !== socket.id) {
        socket.emit(SocketEvents.ERROR, { message: 'Only the host can start the game' });
        return;
      }

      const gameState = gameManager.startGame(roomId);

      console.log(`Game started in room ${roomId} by host ${socket.id}`);

      room.players.forEach(player => {
        const playerSocket = io.sockets.sockets.get(player.id);
        if (playerSocket) {
          playerSocket.emit(SocketEvents.GAME_STARTED, {
            gameState: {
              currentPlayerIndex: gameState.currentPlayerIndex,
              direction: gameState.direction,
              lastPlayedCard: gameState.lastPlayedCard,
              deckCount: gameState.deck.length,
              discardPileCount: gameState.discardPile.length
            },
            hand: player.hand,
            players: room.players.map(p => ({
              id: p.id,
              name: p.name,
              cardsCount: p.hand.length,
              disconnected: p.disconnected
            }))
          });
        }
      });

    } catch (error: any) {
      socket.emit(SocketEvents.ERROR, { message: error.message });
    }
  });

  // ===== PLAY CARD =====
  socket.on(SocketEvents.PLAY_CARD, (data: { roomId: string; cardId: string; chosenColor?: CardColor }) => {
    try {
      const { roomId, cardId, chosenColor } = data;

      const room = gameManager.getRoom(roomId);
      if (!room || !room.gameState) {
        socket.emit(SocketEvents.INVALID_MOVE, { message: 'Room or game not found' });
        return;
      }

      // Jouer la carte via le GameManager
      gameManager.playCard(roomId, socket.id, cardId, chosenColor);

      const player = room.players.find(p => p.id === socket.id)!;

      console.log(`Player ${player.name} played card ${cardId} in room ${roomId}`);

      // Vérifier si le joueur a gagné
      if (room.status === 'finished') {
        console.log(`🏆 Player ${player.name} won the game in room ${roomId}!`);

        // Notifier tous les joueurs de la fin de partie
        io.to(roomId).emit(SocketEvents.GAME_OVER, {
          winnerId: socket.id,
          winnerName: player.name,
          players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            cardsCount: p.hand.length
          }))
        });

        return;
      }

      // Notifier tous les joueurs de l'état mis à jour
      room.players.forEach(p => {
        const playerSocket = io.sockets.sockets.get(p.id);
        if (playerSocket) {
          playerSocket.emit(SocketEvents.GAME_STATE_UPDATE, {
            gameState: {
              currentPlayerIndex: room.gameState!.currentPlayerIndex,
              direction: room.gameState!.direction,
              lastPlayedCard: room.gameState!.lastPlayedCard,
              deckCount: room.gameState!.deck.length,
              discardPileCount: room.gameState!.discardPile.length
            },
            hand: p.hand, // Chaque joueur reçoit sa propre main
            players: room.players.map(player => ({
              id: player.id,
              name: player.name,
              cardsCount: player.hand.length,
              disconnected: player.disconnected
            })),
            lastAction: {
              type: 'card_played',
              playerId: socket.id,
              playerName: player.name,
              cardId: cardId
            }
          });
        }
      });

    } catch (error: any) {
      socket.emit(SocketEvents.INVALID_MOVE, { message: error.message });
    }
  });

  // ===== DRAW CARD =====
  socket.on(SocketEvents.DRAW_CARD, (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      const room = gameManager.getRoom(roomId);
      if (!room || !room.gameState) {
        socket.emit(SocketEvents.ERROR, { message: 'Room or game not found' });
        return;
      }

      // Piocher une carte
      const drawnCard = gameManager.drawCardForPlayer(roomId, socket.id);

      if (!drawnCard) {
        socket.emit(SocketEvents.ERROR, { message: 'No cards to draw' });
        return;
      }

      const player = room.players.find(p => p.id === socket.id)!;

      console.log(`Player ${player.name} drew a card in room ${roomId}`);

      // Vérifier si la carte piochée est jouable
      const canPlay = gameManager.canPlayCard(drawnCard, room.gameState.lastPlayedCard);

      // Notifier le joueur de sa nouvelle carte
      socket.emit(SocketEvents.GAME_STATE_UPDATE, {
        gameState: {
          currentPlayerIndex: room.gameState.currentPlayerIndex,
          direction: room.gameState.direction,
          lastPlayedCard: room.gameState.lastPlayedCard,
          deckCount: room.gameState.deck.length,
          discardPileCount: room.gameState.discardPile.length
        },
        hand: player.hand,
        players: room.players.map(p => ({
          id: p.id,
          name: p.name,
          cardsCount: p.hand.length,
          disconnected: p.disconnected
        })),
        lastAction: {
          type: 'card_drawn',
          playerId: socket.id,
          playerName: player.name,
          drawnCard: drawnCard,
          canPlayDrawnCard: canPlay
        }
      });

      // Notifier les autres joueurs (sans montrer la carte)
      room.players.forEach(p => {
        if (p.id !== socket.id) {
          const playerSocket = io.sockets.sockets.get(p.id);
          if (playerSocket) {
            playerSocket.emit(SocketEvents.GAME_STATE_UPDATE, {
              gameState: {
                currentPlayerIndex: room.gameState!.currentPlayerIndex,
                direction: room.gameState!.direction,
                lastPlayedCard: room.gameState!.lastPlayedCard,
                deckCount: room.gameState!.deck.length,
                discardPileCount: room.gameState!.discardPile.length
              },
              hand: p.hand,
              players: room.players.map(player => ({
                id: player.id,
                name: player.name,
                cardsCount: player.hand.length,
                disconnected: player.disconnected
              })),
              lastAction: {
                type: 'card_drawn',
                playerId: socket.id,
                playerName: player.name
              }
            });
          }
        }
      });

      // Si la carte n'est pas jouable, passer automatiquement au tour suivant
      if (!canPlay) {
        console.log(`Card drawn by ${player.name} is not playable, passing turn...`);
        
        setTimeout(() => {
          gameManager.passTurnAfterDraw(roomId, socket.id);

          // Notifier tout le monde du changement de tour
          io.to(roomId).emit(SocketEvents.GAME_STATE_UPDATE, {
            gameState: {
              currentPlayerIndex: room.gameState!.currentPlayerIndex,
              direction: room.gameState!.direction,
              lastPlayedCard: room.gameState!.lastPlayedCard,
              deckCount: room.gameState!.deck.length,
              discardPileCount: room.gameState!.discardPile.length
            },
            players: room.players.map(p => ({
              id: p.id,
              name: p.name,
              cardsCount: p.hand.length,
              disconnected: p.disconnected
            })),
            lastAction: {
              type: 'turn_passed',
              playerId: socket.id,
              playerName: player.name
            }
          });
        }, 1500); // Délai de 1.5s pour que le joueur voie sa carte
      }

    } catch (error: any) {
      socket.emit(SocketEvents.ERROR, { message: error.message });
    }
  });

  // ===== PASS TURN (optionnel: si le joueur a pioché une carte jouable mais ne veut pas la jouer) =====
  socket.on('pass_turn', (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      const room = gameManager.getRoom(roomId);
      if (!room || !room.gameState) {
        socket.emit(SocketEvents.ERROR, { message: 'Room or game not found' });
        return;
      }

      gameManager.passTurnAfterDraw(roomId, socket.id);

      const player = room.players.find(p => p.id === socket.id)!;
      console.log(`Player ${player.name} passed their turn in room ${roomId}`);

      // Notifier tous les joueurs
      io.to(roomId).emit(SocketEvents.GAME_STATE_UPDATE, {
        gameState: {
          currentPlayerIndex: room.gameState.currentPlayerIndex,
          direction: room.gameState.direction,
          lastPlayedCard: room.gameState.lastPlayedCard,
          deckCount: room.gameState.deck.length,
          discardPileCount: room.gameState.discardPile.length
        },
        players: room.players.map(p => ({
          id: p.id,
          name: p.name,
          cardsCount: p.hand.length,
          disconnected: p.disconnected
        })),
        lastAction: {
          type: 'turn_passed',
          playerId: socket.id,
          playerName: player.name
        }
      });

    } catch (error: any) {
      socket.emit(SocketEvents.ERROR, { message: error.message });
    }
  });

  // ===== SAY UNO (optionnel pour v2) =====
  socket.on(SocketEvents.SAY_UNO, (data: { roomId: string }) => {
    const { roomId } = data;

    const room = gameManager.getRoom(roomId);
    if (!room) {
      socket.emit(SocketEvents.ERROR, { message: 'Room not found' });
      return;
    }
    
    const player = room.players.find(p => p.id === socket.id);
    
    // TODO: Vérifier que le joueur a bien 1 carte
    // TODO: Marquer player.saidUno = true
    // TODO: Notifier les autres joueurs

  });

  // ===== CHALLENGE UNO (optionnel pour v2) =====
  socket.on('challenge_uno', (data: { roomId: string; targetPlayerId: string }) => {
    try {
      const { roomId, targetPlayerId } = data;

      // TODO: Implémenter la logique
      // Un joueur challenge un autre qui n'a pas dit "UNO"
      // Si valide, le joueur challengé pioche 2 cartes

      console.log(`Player ${socket.id} challenged ${targetPlayerId} in room ${roomId}`);

    } catch (error: any) {
      socket.emit(SocketEvents.ERROR, { message: error.message });
    }
  });
}