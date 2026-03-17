// NEURAL TYPER - Main Application
const app = {
    currentMode: 'home',
    currentText: '',
    currentPosition: 0,
    startTime: null,
    errors: 0,
    isPaused: false,
    soundEnabled: true,
    theme: 'dark',
    lang: 'ru',
    timerInterval: null,
    speedTestLimit: 60,
    lessons: {
        beginner: [
            { id: 1, name: 'Домашний ряд', text: 'ааа ооо еее ввв ааа ооо еее ввв фыва олдж', difficulty: 'Легко' },
            { id: 2, name: 'Верхний ряд', text: 'ййй ццц ууу ккк енгш щзхъ йцукен', difficulty: 'Легко' },
            { id: 3, name: 'Нижний ряд', text: 'ззз ххх ъъъ ячсмитьбю ячсм', difficulty: 'Легко' }
        ],
        medium: [
            { id: 4, name: 'Слова', text: 'дом кот мир лес вода небо земля город стол окно дверь книга', difficulty: 'Средне' },
            { id: 5, name: 'Фразы', text: 'быстрая печать это навык который можно развить с практикой', difficulty: 'Средне' }
        ],
        advanced: [
            { id: 6, name: 'Код', text: 'function hello() { return "world"; } const x = 42;', difficulty: 'Сложно' },
            { id: 7, name: 'Длинный текст', text: 'В киберпанк мире технологии развились до невероятных высот и нейронные интерфейсы стали реальностью', difficulty: 'Сложно' }
        ]
    },
    currentLessonId: null,
    speedWords: ['как', 'так', 'все', 'это', 'был', 'она', 'они', 'мой', 'его', 'что', 'год', 'дом', 'день', 'раз', 'рука', 'нога', 'вода', 'небо', 'земля', 'город']
};

const translations = {
    ru: {
        training: 'ОБУЧЕНИЕ', trainingDesc: 'Программа нейро-адаптации', trainingStats: '46 модулей',
        speedTest: 'ТЕСТ СКОРОСТИ', speedTestDesc: 'Анализ производительности', speedTestStats: '60 секунд',
        freeMode: 'СВОБОДНЫЙ РЕЖИМ', freeModeDesc: 'Кастомная тренировка', freeModeStats: 'Без ограничений',
        multiplayer: 'МУЛЬТИПЛЕЕР', multiplayerDesc: 'Нейро-дуэль онлайн', multiplayerStats: 'PvP режим',
        statsTitle: 'СТАТИСТИКА СИСТЕМЫ', speed: 'СКОРОСТЬ', speedUnit: 'зн/мин',
        accuracy: 'ТОЧНОСТЬ', accuracyUnit: '%', modules: 'МОДУЛИ', modulesUnit: 'пройдено',
        time: 'ВРЕМЯ', timeUnit: 'минут', exit: 'ВЫХОД', restart: 'РЕСТАРТ',
        close: 'ЗАКРЫТЬ', repeat: 'ПОВТОРИТЬ', back: 'НАЗАД', lessonsTitle: 'МОДУЛИ ОБУЧЕНИЯ',
        themeChanged: 'Тема изменена', soundOn: 'Звук включен', soundOff: 'Звук выключен',
        langChanged: 'Язык изменен', systemReady: 'Система инициализирована', mpSoon: 'Мультиплеер запускается на основном сайте',
        hubIdle: 'HUB · IDLE', modeLessons: 'MODE · TRAINING', modeSpeed: 'MODE · SPEED TEST',
        modeFree: 'MODE · FREE TYPING', modeLesson: 'MODE · LESSON'
    },
    en: {
        training: 'TRAINING', trainingDesc: 'Neural adaptation program', trainingStats: '46 modules',
        speedTest: 'SPEED TEST', speedTestDesc: 'Performance analysis', speedTestStats: '60 seconds',
        freeMode: 'FREE MODE', freeModeDesc: 'Custom training', freeModeStats: 'No limits',
        multiplayer: 'MULTIPLAYER', multiplayerDesc: 'Neural duel online', multiplayerStats: 'PvP mode',
        statsTitle: 'SYSTEM STATISTICS', speed: 'SPEED', speedUnit: 'cpm',
        accuracy: 'ACCURACY', accuracyUnit: '%', modules: 'MODULES', modulesUnit: 'completed',
        time: 'TIME', timeUnit: 'minutes', exit: 'EXIT', restart: 'RESTART',
        close: 'CLOSE', repeat: 'REPEAT', back: 'BACK', lessonsTitle: 'TRAINING MODULES',
        themeChanged: 'Theme changed', soundOn: 'Sound enabled', soundOff: 'Sound muted',
        langChanged: 'Language changed', systemReady: 'System initialized', mpSoon: 'Multiplayer runs on the main site',
        hubIdle: 'HUB · IDLE', modeLessons: 'MODE · TRAINING', modeSpeed: 'MODE · SPEED TEST',
        modeFree: 'MODE · FREE TYPING', modeLesson: 'MODE · LESSON'
    }
};

function setModeLabel(key) {
    const el = document.getElementById('modeLabel');
    if (!el) return;
    const t = translations[app.lang] || translations.ru;
    el.textContent = t[key] || '';
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
}

function showHome() {
    console.log('showHome called');
    hideAllScreens();
    document.getElementById('homeScreen').classList.add('active');
    app.currentMode = 'home';
    setModeLabel('hubIdle');
}

function showLessons() {
    console.log('showLessons called');
    hideAllScreens();
    const screen = document.getElementById('lessonsScreen');
    console.log('lessonsScreen element:', screen);
    if (screen) {
        screen.classList.add('active');
        app.currentMode = 'lessons';
        renderLessons();
        setModeLabel('modeLessons');
    } else {
        console.error('lessonsScreen not found!');
    }
}

function showSpeedTest() {
    console.log('showSpeedTest called');
    const text = generateSpeedTest();
    console.log('Generated text:', text);
    startPractice(text, 'speedtest');
    setModeLabel('modeSpeed');
}

function showFreeMode() {
    console.log('showFreeMode called');
    const modal = document.getElementById('freeModeModal');
    const textarea = document.getElementById('freeModeTextarea');
    if (!modal || !textarea) return;
    textarea.value = '';
    updateFreeModeChars();
    modal.classList.add('active');
}

function showMultiplayer() {
    console.log('showMultiplayer called');
    // Переход на основной сайт с полноценным мультиплеером
    window.location.href = 'https://zoobastik.me/';
}

function exitPractice() {
    if (app.timerInterval) clearInterval(app.timerInterval);
    showHome();
}

function restartPractice() {
    if (app.currentMode === 'speedtest') {
        const text = generateSpeedTest();
        startPractice(text, 'speedtest');
        setModeLabel('modeSpeed');
    } else {
        startPractice(app.currentText, app.currentMode);
    }
}

function closeResults() {
    document.getElementById('resultsModal').classList.remove('active');
    exitPractice();
}

function repeatPractice() {
    closeResults();
    if (app.currentMode === 'speedtest') {
        showSpeedTest();
    } else {
        restartPractice();
    }
}

function closeFreeModeModal() {
    const modal = document.getElementById('freeModeModal');
    if (modal) modal.classList.remove('active');
}

function startFreeModeFromModal() {
    const textarea = document.getElementById('freeModeTextarea');
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) {
        showNotification('Введите текст для тренировки', 'warning');
        return;
    }
    closeFreeModeModal();
    startPractice(text, 'free');
    setModeLabel('modeFree');
}

function updateFreeModeChars() {
    const textarea = document.getElementById('freeModeTextarea');
    const counter = document.getElementById('freeModeChars');
    if (!textarea || !counter) return;
    counter.textContent = textarea.value.length;
}

function startPractice(text, mode) {
    console.log('startPractice called with mode:', mode);
    hideAllScreens();
    document.getElementById('practiceScreen').classList.add('active');
    app.currentMode = mode;
    app.currentText = text;
    app.currentPosition = 0;
    app.startTime = Date.now();
    app.errors = 0;
    app.isPaused = false;
    document.getElementById('sessionId').textContent = String(Date.now()).slice(-3);
    renderText();
    updateStats();
    startTimer();
    if (mode === 'lesson') setModeLabel('modeLesson');
}

function renderText() {
    const display = document.getElementById('textDisplay');
    let html = '';
    for (let i = 0; i < app.currentText.length; i++) {
        const char = app.currentText[i];
        let className = i < app.currentPosition ? 'char-typed' : i === app.currentPosition ? 'char-current' : 'char-future';
        const displayChar = char === ' ' ? '&nbsp;' : escapeHtml(char);
        html += `<span class="${className}">${displayChar}</span>`;
    }
    display.innerHTML = html;
    showNextKey();
    // Автопрокрутка, чтобы текущий символ оставался в пределах поля
    const currentSpan = display.querySelector('.char-current');
    if (currentSpan && display.scrollWidth > display.clientWidth) {
        const spanRect = currentSpan.getBoundingClientRect();
        const containerRect = display.getBoundingClientRect();
        if (spanRect.right > containerRect.right || spanRect.left < containerRect.left) {
            const centerOffset = currentSpan.offsetLeft - display.clientWidth / 2 + currentSpan.offsetWidth / 2;
            display.scrollTo({ left: Math.max(0, centerOffset), behavior: 'smooth' });
        }
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function handleKeyPress(e) {
    if (app.currentMode !== 'speedtest' && app.currentMode !== 'free' && app.currentMode !== 'lesson') return;
    if (app.isPaused) return;
    if (e.key.length > 1 && e.key !== 'Backspace') return;
    e.preventDefault();
    
    if (e.key === 'Backspace') {
        if (app.currentPosition > 0) {
            app.currentPosition--;
            renderText();
            updateStats();
        }
        return;
    }
    
    const expectedChar = app.currentText[app.currentPosition];
    if (e.key === expectedChar) {
        app.currentPosition++;
        playSound('correct');
        highlightKey(e.key);
    } else {
        app.errors++;
        playSound('error');
    }
    
    renderText();
    updateStats();
    
    if (app.currentPosition >= app.currentText.length) {
        finishPractice();
    }
}

function updateStats() {
    const elapsed = (Date.now() - app.startTime) / 1000;
    const minutes = elapsed / 60;
    const speed = minutes > 0 ? Math.round(app.currentPosition / minutes) : 0;
    document.getElementById('currentSpeed').textContent = speed;
    const totalAttempts = app.currentPosition + app.errors;
    const accuracy = totalAttempts > 0 ? Math.round((app.currentPosition / totalAttempts) * 100) : 100;
    document.getElementById('currentAccuracy').textContent = accuracy;
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    document.getElementById('currentTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    const progress = Math.round((app.currentPosition / app.currentText.length) * 100);
    document.getElementById('currentProgress').textContent = progress;
    document.getElementById('progressBar').style.width = progress + '%';
}

function startTimer() {
    app.timerInterval = setInterval(() => {
        if (app.isPaused) return;
        updateStats();
        if (app.currentMode === 'speedtest') {
            const elapsed = (Date.now() - app.startTime) / 1000;
            if (elapsed >= app.speedTestLimit) {
                finishPractice();
            }
        }
    }, 100);
}

function finishPractice() {
    if (app.timerInterval) clearInterval(app.timerInterval);
    const elapsed = (Date.now() - app.startTime) / 1000;
    const minutes = elapsed / 60;
    const speed = Math.round(app.currentPosition / minutes);
    const totalAttempts = app.currentPosition + app.errors;
    const accuracy = Math.round((app.currentPosition / totalAttempts) * 100);
    saveStats(speed, accuracy, elapsed);
    showResults(speed, accuracy, elapsed, app.errors);
}

function showResults(speed, accuracy, time, errors) {
    document.getElementById('resultSpeed').textContent = speed;
    document.getElementById('resultAccuracy').textContent = accuracy;
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    document.getElementById('resultTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('resultErrors').textContent = errors;
    document.getElementById('resultsModal').classList.add('active');
    playSound('victory');
}

function renderLessons() {
    console.log('renderLessons called');
    const container = document.getElementById('lessonsList');
    console.log('lessonsList container:', container);
    container.innerHTML = '';
    const stats = JSON.parse(localStorage.getItem('neuralTyperStats') || '{}');
    const completedIds = new Set(stats.completedLessonIds || []);
    Object.entries(app.lessons).forEach(([, lessons]) => {
        lessons.forEach(lesson => {
            const card = document.createElement('div');
            const isCompleted = completedIds.has(lesson.id);
            card.className = 'lesson-card' + (isCompleted ? ' completed' : '');
            card.onclick = () => {
                app.currentLessonId = lesson.id;
                startPractice(lesson.text, 'lesson');
            };
            card.innerHTML = `
                <div class="lesson-title">${lesson.name}</div>
                <div class="lesson-desc">${lesson.difficulty}</div>
                <div class="lesson-stats">
                    <span>ID: ${lesson.id}</span>
                    <span>${lesson.text.length} символов</span>
                </div>
            `;
            container.appendChild(card);
        });
    });
    console.log('Lessons rendered, total cards:', container.children.length);
}

function renderKeyboard() {
    const container = document.getElementById('keyboardContainer');
    const layout = [
        ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ'],
        ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
        ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю']
    ];
    const keyboard = document.createElement('div');
    keyboard.className = 'keyboard';
    layout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        row.forEach(key => {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'key';
            keyDiv.textContent = key;
            keyDiv.dataset.key = key;
            rowDiv.appendChild(keyDiv);
        });
        keyboard.appendChild(rowDiv);
    });
    const spaceRow = document.createElement('div');
    spaceRow.className = 'keyboard-row';
    const spaceKey = document.createElement('div');
    spaceKey.className = 'key space';
    spaceKey.textContent = 'SPACE';
    spaceKey.dataset.key = ' ';
    spaceRow.appendChild(spaceKey);
    keyboard.appendChild(spaceRow);
    container.innerHTML = '';
    container.appendChild(keyboard);
}

function highlightKey(key) {
    document.querySelectorAll('.key.highlight, .key.active').forEach(k => k.classList.remove('highlight', 'active'));
    const keyEl = document.querySelector(`[data-key="${key}"]`);
    if (keyEl) {
        keyEl.classList.add('active');
        setTimeout(() => keyEl.classList.remove('active'), 200);
    }
}

function showNextKey() {
    document.querySelectorAll('.key.highlight').forEach(k => k.classList.remove('highlight'));
    if (app.currentPosition < app.currentText.length) {
        const nextChar = app.currentText[app.currentPosition];
        const keyEl = document.querySelector(`[data-key="${nextChar}"]`);
        if (keyEl) keyEl.classList.add('highlight');
    }
}

function generateSpeedTest() {
    const words = [];
    for (let i = 0; i < 50; i++) {
        words.push(app.speedWords[Math.floor(Math.random() * app.speedWords.length)]);
    }
    return words.join(' ');
}

function toggleTheme() {
    app.theme = app.theme === 'dark' ? 'light' : 'dark';
    document.body.style.filter = app.theme === 'light' ? 'invert(1) hue-rotate(180deg)' : 'none';
    showNotification(translations[app.lang].themeChanged, 'info');
}

function toggleSound() {
    app.soundEnabled = !app.soundEnabled;
    const icon = document.querySelector('#soundToggle .icon');
    icon.textContent = app.soundEnabled ? '♪' : '🔇';
    showNotification(app.soundEnabled ? translations[app.lang].soundOn : translations[app.lang].soundOff, 'info');
}

function toggleLang() {
    app.lang = app.lang === 'ru' ? 'en' : 'ru';
    document.getElementById('currentLang').textContent = app.lang.toUpperCase();
    updateLanguage();
    showNotification(translations[app.lang].langChanged, 'info');
}

function updateLanguage() {
    const t = translations[app.lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
}

function playSound(type) {
    if (!app.soundEnabled) return;
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        if (type === 'correct') {
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.1;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.05);
        } else if (type === 'error') {
            oscillator.frequency.value = 200;
            gainNode.gain.value = 0.15;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } else if (type === 'victory') {
            [800, 1000, 1200].forEach((freq, i) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.frequency.value = freq;
                gain.gain.value = 0.1;
                osc.start(audioContext.currentTime + i * 0.1);
                osc.stop(audioContext.currentTime + i * 0.1 + 0.2);
            });
        }
    } catch (e) {
        console.log('Audio not supported');
    }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.5s ease reverse';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

function saveStats(speed, accuracy, time) {
    const stats = JSON.parse(localStorage.getItem('neuralTyperStats') || '{}');
    if (!stats.bestSpeed || speed > stats.bestSpeed) stats.bestSpeed = speed;
    if (!stats.bestAccuracy || accuracy > stats.bestAccuracy) stats.bestAccuracy = accuracy;
    const addSeconds = Math.round(time);
    stats.totalTimeSeconds = (stats.totalTimeSeconds || 0) + addSeconds;
    stats.sessions = (stats.sessions || 0) + 1;
    stats.totalAccuracy = (stats.totalAccuracy || 0) + accuracy;
    stats.avgAccuracy = Math.round(stats.totalAccuracy / stats.sessions);
    if (app.currentMode === 'lesson' && app.currentLessonId != null) {
        const set = new Set(stats.completedLessonIds || []);
        set.add(app.currentLessonId);
        stats.completedLessonIds = Array.from(set);
        stats.completedLessons = stats.completedLessonIds.length;
    }
    localStorage.setItem('neuralTyperStats', JSON.stringify(stats));
    loadStats();
}

function loadStats() {
    const stats = JSON.parse(localStorage.getItem('neuralTyperStats') || '{}');
    document.getElementById('bestSpeed').textContent = stats.bestSpeed || 0;
    document.getElementById('avgAccuracy').textContent = stats.avgAccuracy || 0;
    document.getElementById('completedLessons').textContent = stats.completedLessons || 0;
    const totalSec = stats.totalTimeSeconds || 0;
    const totalMin = Math.floor(totalSec / 60);
    const hours = Math.floor(totalMin / 60);
    let timeText;
    if (hours > 0) {
        timeText = hours + (app.lang === 'en' ? 'h' : 'ч');
    } else {
        timeText = totalMin + (app.lang === 'en' ? 'm' : 'м');
    }
    document.getElementById('totalTime').textContent = timeText;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    
    // Header buttons
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('soundToggle')?.addEventListener('click', toggleSound);
    document.getElementById('langToggle')?.addEventListener('click', toggleLang);
    
    // Mode cards
    const modeCards = document.querySelectorAll('.mode-card');
    console.log('Found mode cards:', modeCards.length);
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.getAttribute('data-mode');
            console.log('Clicked mode:', mode);
            if (mode === 'lessons') showLessons();
            else if (mode === 'speedtest') showSpeedTest();
            else if (mode === 'free') showFreeMode();
            else if (mode === 'multiplayer') showMultiplayer();
        });
    });
    
    // Practice buttons
    document.getElementById('exitBtn')?.addEventListener('click', exitPractice);
    document.getElementById('restartBtn')?.addEventListener('click', restartPractice);
    document.getElementById('backBtn')?.addEventListener('click', showHome);
    
    // Results buttons
    document.getElementById('closeResultsBtn')?.addEventListener('click', closeResults);
    document.getElementById('repeatBtn')?.addEventListener('click', repeatPractice);
    
    // Keyboard
    document.addEventListener('keydown', handleKeyPress);
    
    // Initialize
    loadStats();
    renderKeyboard();
    updateLanguage();
    showNotification('Система инициализирована', 'success');

    // Free mode modal bindings
    document.getElementById('freeModeCancelBtn')?.addEventListener('click', closeFreeModeModal);
    document.getElementById('freeModeStartBtn')?.addEventListener('click', startFreeModeFromModal);
    document.getElementById('freeModeTextarea')?.addEventListener('input', updateFreeModeChars);
    
    console.log('Initialization complete');
});

