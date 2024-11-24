const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let documentText = ""; // Text dokumentu
let users = []; // Seznam uživatelů

wss.on('connection', (ws) => {
    const userId = `User-${Math.random().toString(36).substr(2, 9)}`;
    const userColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 70%)`; // Unikátní barva uživatele
    users.push({ userId, userColor });

    // Poslat uvítací zprávu s textem a uživateli
    ws.send(JSON.stringify({ type: 'init', text: documentText, users }));

    // Informovat ostatní o novém připojení
    wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'user_connected', userId, userColor }));
        }
    });

    // Zpracování zpráv od klienta
    ws.on('message', (message) => {
        const data = JSON.parse(message);


        if (data.type === 'update_text') {
            // Aktualizace textu a jeho distribuce
            documentText = data.text;
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'update_text', text: documentText, userId }));
                }
            });
        }

        if (data.type === 'mouse_position') {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN && client !== ws) {
                    client.send(JSON.stringify({
                        type: 'mouse_position',
                        userId,
                        position: data.position,
                        userColor,
                    }));
                }
            });
        }


        if (data.type === 'text_selection') {
            // Distribuce výběru textu
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN && client !== ws) {
                    client.send(JSON.stringify({
                        type: 'text_selection',
                        userId,
                        range: data.range,
                        userColor
                    }));
                }
            });
        }
    });

    // Odstranění uživatele při odpojení
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
