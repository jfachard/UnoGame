import { io, Socket } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";

export const socket: Socket = io(SERVER_URL, {
    autoConnect: false,
});

export function connectSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (socket.connected) {
            resolve();
            return;
        }

        socket.connect();

        socket.once('connect', () => {
            resolve();
        });

        socket.once('connect_error', (err) => {
            reject(err);
        });
    });
}

export function disconnectSocket(): void {
    if (socket.connected) {
        socket.disconnect();
    }
}