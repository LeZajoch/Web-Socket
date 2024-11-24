const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Data
let documentText = ""; // Text dokumentu
let users = []; // Seznam uživatelů

wss.on('connection', (ws) => {
    const userId = `User-${Math.random().toString(36).substr(2, 9)}`;
    const userColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 70%)`; // Unikátní barva
    users.push({ userId, userColor });

    // Odeslat uvítací zprávu
    ws.send(JSON.stringify({ type: 'init', text: documentText, users }));

    // Informovat ostatní uživatele o připojení
    wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'user_connected', userId, userColor }));
        }
    });

    // Příjem zpráv od klienta
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'update_text') {
            documentText = data.text;
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'update_text', text: documentText, userId }));
                }
            });
        }

        if (data.type === 'cursor_position') {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN && client !== ws) {
                    client.send(JSON.stringify({
                        type: 'cursor_position',
                        userId,
                        position: data.position,
                        userColor,
                    }));
                }
            });
        }
    });

    // Při odpojení klienta
    ws.on('close', () => {
        users = users.filter((user) => user.userId !== userId);
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'user_disconnected', userId }));
            }
        });
    });
});

// Spuštění serveru
server.listen(8080, () => {
    console.log('Server is running on http://localhost:8080');
});
