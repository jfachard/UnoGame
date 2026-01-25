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

      gameManager.playCard(roomId, socket.id, cardId, chosenColor);

      const player = room.players.find(p => p.id === socket.id)!;

      console.log(`Player ${player.name} played card ${cardId} in room ${roomId}`);

      if (room.status === 'finished') {
        console.log(`🏆 Player ${player.name} won the game in room ${roomId}!`);

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
            hand: p.hand,
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

      const drawnCard = gameManager.drawCardForPlayer(roomId, socket.id);

      if (!drawnCard) {
        socket.emit(SocketEvents.ERROR, { message: 'No cards to draw' });
        return;
      }

      const player = room.players.find(p => p.id === socket.id)!;

      console.log(`Player ${player.name} drew a card in room ${roomId}`);

      const canPlay = gameManager.canPlayCard(drawnCard, room.gameState.lastPlayedCard);

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

      if (!canPlay) {
        console.log(`Card drawn by ${player.name} is not playable, passing turn...`);
        
        setTimeout(() => {
          gameManager.passTurnAfterDraw(roomId, socket.id);

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
        }, 1500);
      }

    } catch (error: any) {
      socket.emit(SocketEvents.ERROR, { message: error.message });
    }
  });

  // ===== PASS TURN =====
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

  // ===== SAY UNO =====
  socket.on(SocketEvents.SAY_UNO, (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      const room = gameManager.getRoom(roomId);
      if (!room) {
        socket.emit(SocketEvents.ERROR, { message: 'Room not found' });
        return;
      }
      
      const player = room.players.find(p => p.id === socket.id);
      if (!player) {
        socket.emit(SocketEvents.ERROR, { message: 'Player not found' });
        return;
      }

      if (player.hand.length !== 1) {
        socket.emit(SocketEvents.ERROR, { message: 'You can only say UNO when you have 1 card' });
        return;
      }

      player.saidUno = true;
      player.canBeChallenged = false;

      console.log(`Player ${player.name} said UNO in room ${roomId}`);

      io.to(roomId).emit(SocketEvents.PLAYER_SAID_UNO, {
        playerId: socket.id,
        playerName: player.name
      });

    } catch (error: any) {
      socket.emit(SocketEvents.ERROR, { message: error.message });
    }
  });

  // ===== CHALLENGE UNO =====
  socket.on(SocketEvents.CHALLENGE_UNO, (data: { roomId: string; targetPlayerId: string }) => {
    try {
      const { roomId, targetPlayerId } = data;

      const room = gameManager.getRoom(roomId);
      if (!room || !room.gameState) {
        socket.emit(SocketEvents.ERROR, { message: 'Room or game not found' });
        return;
      }

      const targetPlayer = room.players.find(p => p.id === targetPlayerId);
      if (!targetPlayer) {
        socket.emit(SocketEvents.ERROR, { message: 'Target player not found' });
        return;
      }

      const challenger = room.players.find(p => p.id === socket.id);
      if (!challenger) {
        socket.emit(SocketEvents.ERROR, { message: 'Challenger not found' });
        return;
      }

      console.log(`Player ${challenger.name} challenged ${targetPlayer.name} in room ${roomId}`);

      if (targetPlayer.canBeChallenged && !targetPlayer.saidUno) {        
        gameManager.penaltyDraw(roomId, targetPlayerId, 2);

        targetPlayer.canBeChallenged = false;

        console.log(`Challenge successful! ${targetPlayer.name} draws 2 cards`);

        io.to(roomId).emit(SocketEvents.UNO_CHALLENGE_SUCCESS, {
          challengerId: socket.id,
          challengerName: challenger.name,
          targetId: targetPlayerId,
          targetName: targetPlayer.name,
          message: `${targetPlayer.name} forgot to say UNO and draws 2 cards!`
        });

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
              hand: p.hand,
              players: room.players.map(player => ({
                id: player.id,
                name: player.name,
                cardsCount: player.hand.length,
                disconnected: player.disconnected
              })),
              lastAction: {
                type: 'uno_penalty',
                playerId: targetPlayerId,
                playerName: targetPlayer.name
              }
            });
          }
        });

      } else {
        console.log(`Challenge failed! ${targetPlayer.name} had already said UNO or doesn't have 1 card`);

        io.to(roomId).emit(SocketEvents.UNO_CHALLENGE_FAILED, {
          challengerId: socket.id,
          challengerName: challenger.name,
          targetId: targetPlayerId,
          targetName: targetPlayer.name,
          message: `Challenge failed! ${targetPlayer.name} had already said UNO.`
        });
      }

    } catch (error: any) {
      socket.emit(SocketEvents.ERROR, { message: error.message });
    }
  });
}