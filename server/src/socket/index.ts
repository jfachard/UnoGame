import { Server } from "socket.io";
import { GameManager } from "../game/GameManager";
import { setupSocketHandlers } from "./connection.handler";

export function initializeSocketServer(io: Server, gameManager: GameManager) {
  setupSocketHandlers(io, gameManager);
}