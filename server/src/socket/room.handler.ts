import { Server, Socket } from 'socket.io';
import { GameManager } from '../game/GameManager';
import { GameRoomPublicInfo, PlayerPublicInfo } from '../../../shared/types/game.types';
import { SocketEvents } from '../../../shared/types/events.types';

export function registerRoomHandlers(socket: Socket, io: Server, gameManager: GameManager) {
  
  // ===== CREATE ROOM =====
  socket.on(SocketEvents.CREATE_ROOM, (data: { roomId: string; playerName: string; maxPlayers?: number }) => {
    try {
      const { roomId, playerName, maxPlayers = 4 } = data;

      if (!roomId || !playerName) {
        socket.emit(SocketEvents.CREATE_ROOM_ERROR, { message: 'Room ID and player name are required' });
        return;
      }

      const room = gameManager.createRoom(roomId, socket.id, playerName, maxPlayers);
      socket.join(roomId);

      console.log(`Room ${roomId} created by ${playerName} (${socket.id})`);

      socket.emit(SocketEvents.CREATE_ROOM_SUCCESS, {
        room: sanitizeRoomForClient(room, socket.id)
      });

    } catch (error: any) {
      socket.emit(SocketEvents.CREATE_ROOM_ERROR, { message: error.message });
    }
  });

  // ===== JOIN ROOM =====
  socket.on(SocketEvents.JOIN_ROOM, (data: { roomId: string; playerName: string }) => {
    try {
      const { roomId, playerName } = data;

      if (!roomId || !playerName) {
        socket.emit(SocketEvents.JOIN_ROOM_ERROR, { message: 'Room ID and player name are required' });
        return;
      }

      if (!gameManager.roomExists(roomId)) {
        socket.emit(SocketEvents.JOIN_ROOM_ERROR, { message: 'Room not found' });
        return;
      }

      const player = gameManager.addPlayerToRoom(roomId, socket.id, playerName);
      socket.join(roomId);

      const room = gameManager.getRoom(roomId)!;

      console.log(`${playerName} (${socket.id}) joined room ${roomId}`);

      io.to(roomId).emit(SocketEvents.PLAYER_JOINED, {
        player: sanitizePlayerForClient(player),
        room: sanitizeRoomForClient(room, socket.id)
      });

    } catch (error: any) {
      socket.emit(SocketEvents.JOIN_ROOM_ERROR, { message: error.message });
    }
  });

  // ===== LEAVE ROOM =====
  socket.on(SocketEvents.LEAVE_ROOM, (data: { roomId: string }) => {
    handlePlayerLeave(socket, io, gameManager, data.roomId);
  });

  // ===== PLAYER READY =====
  socket.on(SocketEvents.PLAYER_READY, (data: { roomId: string; isReady: boolean }) => {
    try {
      const { roomId, isReady } = data;

      gameManager.setPlayerReady(roomId, socket.id, isReady);

      console.log(`Player ${socket.id} is ${isReady ? 'ready' : 'not ready'} in room ${roomId}`);

      io.to(roomId).emit(SocketEvents.PLAYER_READY_CHANGED, {
        playerId: socket.id,
        isReady,
        canStartGame: gameManager.canStartGame(roomId)
      });

    } catch (error: any) {
      socket.emit(SocketEvents.ERROR, { message: error.message });
    }
  });

  // ===== GET ROOM STATE =====
  socket.on('get_room_state', (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      const room = gameManager.getRoom(roomId);
      
      if (!room) {
        socket.emit(SocketEvents.ERROR, { message: 'Room not found' });
        return;
      }

      socket.emit('room_state', {
        room: sanitizeRoomForClient(room, socket.id)
      });

    } catch (error: any) {
      socket.emit(SocketEvents.ERROR, { message: error.message });
    }
  });
}

// ===== HELPER: Gestion départ joueur =====
function handlePlayerLeave(socket: Socket, io: Server, gameManager: GameManager, roomId: string) {
  try {
    const room = gameManager.getRoom(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    gameManager.removePlayerFromRoom(roomId, socket.id);
    socket.leave(roomId);

    console.log(`${player.name} (${socket.id}) left room ${roomId}`);

    const updatedRoom = gameManager.getRoom(roomId);
    io.to(roomId).emit(SocketEvents.PLAYER_LEFT, {
      playerId: socket.id,
      playerName: player.name,
      room: updatedRoom ? sanitizeRoomForClient(updatedRoom, null) : null
    });

  } catch (error: any) {
    console.error('Error leaving room:', error);
  }
}

// ===== HELPERS: Sanitization =====
function sanitizePlayerForClient(player: any): PlayerPublicInfo {
  return {
    id: player.id,
    name: player.name,
    cardsCount: player.hand.length,
    isReady: player.isReady,
    disconnected: player.disconnected
  };
}

function sanitizeRoomForClient(room: any, currentPlayerId: string | null): GameRoomPublicInfo {
  return {
    id: room.id,
    hostId: room.hostId,
    status: room.status,
    players: room.players.map((p: any) => sanitizePlayerForClient(p)),
    maxPlayers: room.maxPlayers,
    createdAt: room.createdAt,
    currentPlayerIndex: room.gameState?.currentPlayerIndex ?? null,
    lastPlayedCard: room.gameState?.lastPlayedCard ?? null
  };
}

// Export pour réutilisation
export { handlePlayerLeave };
