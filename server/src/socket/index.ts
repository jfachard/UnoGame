import { Server } from "socket.io";
import { setupSocketHandlers } from "./connection.handler";

export function initializeSocketServer(io: Server) {
  setupSocketHandlers(io);
}