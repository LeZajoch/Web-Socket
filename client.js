
    const ws = new WebSocket("ws://localhost:8080");
    const editor = document.getElementById('editor');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const status = document.getElementById('status');
    const usersDiv = document.getElementById('users');
    const pointers = {}; // Ukazatele myši ostatních uživatelů

    // Nastavení rozměrů canvasu podle textového pole
    const updateCanvasSize = () => {
    canvas.width = editor.offsetWidth;
    canvas.height = editor.offsetHeight;
};

    updateCanvasSize();

    ws.onopen = () => {
    console.log('Connected to server');
    status.textContent = "Connected to server";
};

    ws.onclose = () => {
    console.log('Disconnected from server');
    status.textContent = "Disconnected from server";
};

    ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'init') {
    editor.value = data.text;
    usersDiv.textContent = `Connected users: ${data.users.map(u => u.userId).join(', ')}`;
}

    if (data.type === 'update_text' && data.userId !== undefined) {
    // Aktualizace textu od jiného uživatele
    editor.value = data.text;
}

    if (data.type === 'text_selection') {
    renderHighlights(data.range, data.userColor);
}

    if (data.type === 'mouse_position') {
    if (!pointers[data.userId]) {
    const pointer = document.createElement('div');
    pointer.className = 'mouse-pointer';
    pointer.style.backgroundColor = data.userColor;
    document.body.appendChild(pointer);
    pointers[data.userId] = pointer;
}

    const pointer = pointers[data.userId];
    pointer.style.left = `${data.position.x}px`;
    pointer.style.top = `${data.position.y}px`;
}
};

    // Funkce pro vykreslení zvýraznění na canvas
    const renderHighlights = (range, color) => {
    const lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
    const padding = parseFloat(getComputedStyle(editor).paddingLeft);

    // Vypočítání souřadnic
    const start = getCaretCoordinates(editor, range.start);
    const end = getCaretCoordinates(editor, range.end);

    // Vymazání canvasu
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Vykreslení zvýraznění
    ctx.fillStyle = color;
    ctx.fillRect(start.left + padding, start.top, end.left - start.left, lineHeight);
};

    // Výpočet pozice kurzoru v textarea
    const getCaretCoordinates = (textarea, position) => {
    const div = document.createElement('div');
    const style = window.getComputedStyle(textarea);

    // Zkopírování stylu textarea do divu
    for (const key of style) {
    div.style[key] = style[key];
}

    div.style.position = 'absolute';
    div.style.whiteSpace = 'pre-wrap';
    div.style.visibility = 'hidden';

    // Přidání textu
    div.textContent = textarea.value.slice(0, position);
    const span = document.createElement('span');
    span.textContent = '|';
    div.appendChild(span);

    document.body.appendChild(div);
    const rect = span.getBoundingClientRect();
    document.body.removeChild(div);

    return { left: rect.left, top: rect.top };
};

    editor.addEventListener('input', () => {
    ws.send(JSON.stringify({ type: 'update_text', text: editor.value })); // Odeslání textu na server
});

    editor.addEventListener('mouseup', () => {
    const range = {
    start: editor.selectionStart,
    end: editor.selectionEnd
};
    ws.send(JSON.stringify({ type: 'text_selection', range })); // Odeslání zvýraznění
});

    editor.addEventListener('mousemove', (event) => {
    const x = event.clientX;
    const y = event.clientY;
    ws.send(JSON.stringify({ type: 'mouse_position', position: { x, y } })); // Odeslání pozice myši
});

    window.addEventListener('resize', updateCanvasSize);
