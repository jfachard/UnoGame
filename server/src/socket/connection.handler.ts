import { Server, Socket } from "socket.io";
import { GameManager } from "../game/GameManager";
import { registerRoomHandlers, handlePlayerLeave } from "./room.handler";
import { registerGameHandlers } from "./game.handler";

export function setupSocketHandlers(io: Server, gameManager: GameManager) {
  io.on("connection", (socket: Socket) => {
    console.log("A user connected:", socket.id);

    registerRoomHandlers(socket, io, gameManager);
    registerGameHandlers(socket, io, gameManager);

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      const rooms = gameManager.getAllRooms();
      
      for (const room of rooms) {
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
          console.log(`Handling disconnect for ${player.name} in room ${room.id}`);
          handlePlayerLeave(socket, io, gameManager, room.id);
        }
      }
    });
  });
}
