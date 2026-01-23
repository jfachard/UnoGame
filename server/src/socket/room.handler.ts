export function registerRoomHandlers(socket: any) {
  socket.on("joinRoom", (data : { roomId: string }) => {
    const { roomId } = data;
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on("leaveRoom", (data: { roomId: string }) => {
    const { roomId } = data;
    socket.leave(roomId);
    console.log(`Socket ${socket.id} left room ${roomId}`);
  });
}
