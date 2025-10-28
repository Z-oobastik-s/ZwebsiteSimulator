/**
 * Keyboard Module
 * Handles virtual keyboard rendering and highlighting
 */

const keyboardLayouts = {
    ru: {
        rows: [
            ['ё', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
            ['Tab', 'й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ', '\\'],
            ['Caps', 'ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э', 'Enter'],
            ['Shift', 'я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', '.', 'Shift'],
            ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Ctrl']
        ]
    },
    en: {
        rows: [
            ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
            ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
            ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\'', 'Enter'],
            ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
            ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Ctrl']
        ]
    },
    ua: {
        rows: [
            ['₴', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
            ['Tab', 'й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ї', '\\'],
            ['Caps', 'ф', 'і', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'є', 'Enter'],
            ['Shift', 'я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', '.', 'Shift'],
            ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Ctrl']
        ]
    }
};

// Finger colors for each key
const fingerColors = {
    leftPinky: 'bg-red-500/20',
    leftRing: 'bg-orange-500/20',
    leftMiddle: 'bg-yellow-500/20',
    leftIndex: 'bg-green-500/20',
    thumb: 'bg-blue-500/20',
    rightIndex: 'bg-green-500/20',
    rightMiddle: 'bg-yellow-500/20',
    rightRing: 'bg-orange-500/20',
    rightPinky: 'bg-red-500/20'
};

const keyFingerMap = {
    // Russian layout
    'ё': 'leftPinky', '1': 'leftPinky', 'й': 'leftPinky', 'ф': 'leftPinky', 'я': 'leftPinky',
    '2': 'leftRing', 'ц': 'leftRing', 'ы': 'leftRing', 'ч': 'leftRing',
    '3': 'leftMiddle', 'у': 'leftMiddle', 'в': 'leftMiddle', 'с': 'leftMiddle',
    '4': 'leftIndex', '5': 'leftIndex', 'к': 'leftIndex', 'е': 'leftIndex', 'а': 'leftIndex', 'п': 'leftIndex', 'м': 'leftIndex', 'и': 'leftIndex',
    '6': 'rightIndex', '7': 'rightIndex', 'н': 'rightIndex', 'г': 'rightIndex', 'р': 'rightIndex', 'о': 'rightIndex', 'т': 'rightIndex', 'ь': 'rightIndex',
    '8': 'rightMiddle', 'ш': 'rightMiddle', 'л': 'rightMiddle', 'б': 'rightMiddle',
    '9': 'rightRing', 'щ': 'rightRing', 'д': 'rightRing', 'ю': 'rightRing',
    '0': 'rightPinky', '-': 'rightPinky', '=': 'rightPinky', 'з': 'rightPinky', 'х': 'rightPinky', 'ъ': 'rightPinky', 'ж': 'rightPinky', 'э': 'rightPinky', '.': 'rightPinky',
    ' ': 'thumb',
    
    // Ukrainian layout (similar to Russian but with і, ї, є)
    '₴': 'leftPinky', 'і': 'leftRing', 'ї': 'rightPinky', 'є': 'rightPinky',
    
    // English layout
    '`': 'leftPinky', 'q': 'leftPinky', 'a': 'leftPinky', 'z': 'leftPinky',
    'w': 'leftRing', 's': 'leftRing', 'x': 'leftRing',
    'e': 'leftMiddle', 'd': 'leftMiddle', 'c': 'leftMiddle',
    'r': 'leftIndex', 't': 'leftIndex', 'f': 'leftIndex', 'g': 'leftIndex', 'v': 'leftIndex', 'b': 'leftIndex',
    'y': 'rightIndex', 'u': 'rightIndex', 'h': 'rightIndex', 'j': 'rightIndex', 'n': 'rightIndex', 'm': 'rightIndex',
    'i': 'rightMiddle', 'k': 'rightMiddle', ',': 'rightMiddle',
    'o': 'rightRing', 'l': 'rightRing',
    'p': 'rightPinky', '[': 'rightPinky', ']': 'rightPinky', '\\': 'rightPinky', ';': 'rightPinky', '\'': 'rightPinky', '/': 'rightPinky'
};

function renderKeyboard(layout = 'ru') {
    const container = document.getElementById('keyboardContainer');
    if (!container) return;
    
    const keyboard = keyboardLayouts[layout];
    if (!keyboard) return;
    
    let html = '<div class="space-y-2">';
    
    keyboard.rows.forEach(row => {
        html += '<div class="flex justify-center gap-1">';
        
        row.forEach(key => {
            const fingerColor = fingerColors[keyFingerMap[key.toLowerCase()]] || 'bg-gray-500/20';
            const keyWidth = getKeyWidth(key);
            const keyClass = `key-btn ${fingerColor} ${keyWidth} h-12 rounded-lg flex items-center justify-center font-mono font-semibold text-sm hover:bg-white/30 dark:hover:bg-black/30 transition-all`;
            
            html += `<button class="${keyClass}" data-key="${key.toLowerCase()}">${escapeHtml(key)}</button>`;
        });
        
        html += '</div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function getKeyWidth(key) {
    switch(key) {
        case 'Backspace': return 'w-20';
        case 'Tab': return 'w-16';
        case 'Caps': return 'w-20';
        case 'Enter': return 'w-20';
        case 'Shift': return 'w-24';
        case 'Space': return 'w-96';
        case 'Ctrl': case 'Win': case 'Alt': return 'w-16';
        default: return 'w-12';
    }
}

function highlightKey(char) {
    // Remove previous highlights
    document.querySelectorAll('.key-btn').forEach(btn => {
        btn.classList.remove('key-active');
    });
    
    // Handle space specially
    if (char === ' ') {
        char = 'space';
    }
    
    // Highlight current key
    const key = char.toLowerCase();
    const keyBtn = document.querySelector(`[data-key="${key}"]`);
    
    if (keyBtn) {
        keyBtn.classList.add('key-active');
        
        // Auto-remove highlight after animation
        setTimeout(() => {
            keyBtn.classList.remove('key-active');
        }, 300);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function highlightKeyStatic(char) {
    // Remove previous static highlights
    document.querySelectorAll('.key-btn').forEach(btn => {
        btn.classList.remove('key-static-highlight');
    });
    
    // Handle space specially
    if (char === ' ') {
        char = 'space';
    }
    
    // Add static highlight to current key
    const key = char.toLowerCase();
    const keyBtn = document.querySelector(`[data-key="${key}"]`);
    
    if (keyBtn) {
        keyBtn.classList.add('key-static-highlight');
    }
}

// Export functions
window.keyboardModule = {
    render: renderKeyboard,
    highlight: highlightKey,
    highlightStatic: highlightKeyStatic
};

