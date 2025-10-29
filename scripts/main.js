/**
 * TypeMaster - Main Application Logic
 * Typing trainer with lessons, free mode, and speed test
 */

// Global state
const app = {
    currentMode: 'home', // home, lessons, practice
    currentLayout: 'ru',
    currentLesson: null,
    currentText: '',
    currentPosition: 0,
    startTime: null,
    endTime: null,
    isPaused: false,
    errors: 0,
    totalChars: 0,
    soundEnabled: true,
    theme: 'dark',
    lang: 'ru',
    timerInterval: null,
    speedTestDuration: 60,
    speedTestWords: []
};

// Translations
// Audio elements
let audioClick = null;
let audioError = null;
let audioWelcome = null;
let audioVictory = null;
let welcomePlayed = false;

const translations = {
    ru: {
        welcome: 'Добро пожаловать в Zoobastiks',
        subtitle: 'Научитесь печатать быстро и без ошибок',
        lessons: 'Уроки',
        lessonsDesc: 'Обучение с нуля до профи',
        freeMode: 'Свободная печать',
        freeModeDesc: 'Свой текст для тренировки',
        speedTest: 'Тест скорости',
        speedTestDesc: '60 секунд на максимум',
        yourProgress: 'Ваш прогресс',
        bestSpeed: 'Лучший результат',
        avgAccuracy: 'Средняя точность',
        completedLessons: 'Пройдено уроков',
        totalTime: 'Общее время',
        back: 'Назад',
        chooseDifficulty: 'Выберите уровень сложности',
        exit: 'Выйти',
        restart: 'Заново',
        pause: 'Пауза',
        resume: 'Продолжить',
        speed: 'Скорость',
        cpm: 'зн/мин',
        wpm: 'сл/мин',
        accuracy: 'Точность',
        time: 'Время',
        progress: 'Прогресс',
        results: 'Результаты',
        errors: 'Ошибки',
        repeat: 'Повторить',
        close: 'Закрыть',
        enterYourText: 'Введите свой текст для тренировки...',
        start: 'Начать'
    },
    en: {
        welcome: 'Welcome to Zoobastiks',
        subtitle: 'Learn to type fast and accurately',
        lessons: 'Lessons',
        lessonsDesc: 'From beginner to pro',
        freeMode: 'Free Typing',
        freeModeDesc: 'Custom text practice',
        speedTest: 'Speed Test',
        speedTestDesc: '60 seconds challenge',
        yourProgress: 'Your Progress',
        bestSpeed: 'Best Speed',
        avgAccuracy: 'Average Accuracy',
        completedLessons: 'Completed Lessons',
        totalTime: 'Total Time',
        back: 'Back',
        chooseDifficulty: 'Choose Difficulty Level',
        exit: 'Exit',
        restart: 'Restart',
        pause: 'Pause',
        resume: 'Resume',
        speed: 'Speed',
        cpm: 'cpm',
        wpm: 'wpm',
        accuracy: 'Accuracy',
        time: 'Time',
        progress: 'Progress',
        results: 'Results',
        errors: 'Errors',
        repeat: 'Repeat',
        close: 'Close',
        enterYourText: 'Enter your text to practice...',
        start: 'Start'
    }
};

// Speed test word lists
const speedTestWords = {
    ru: ['как', 'так', 'все', 'это', 'был', 'она', 'они', 'мой', 'его', 'что', 'год', 'дом', 'день', 'раз', 'рука', 'нога', 'мама', 'папа', 'вода', 'небо', 'земля', 'город', 'стол', 'окно', 'дверь', 'книга', 'лампа', 'стул', 'друг', 'жизнь', 'время', 'человек', 'дело', 'место', 'слово', 'сторона', 'вопрос'],
    en: ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'time', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'],
    ua: ['як', 'так', 'все', 'це', 'був', 'вона', 'вони', 'мій', 'його', 'що', 'рік', 'дім', 'день', 'раз', 'рука', 'нога', 'мама', 'тато', 'вода', 'небо', 'земля', 'місто', 'стіл', 'вікно', 'двері', 'книга', 'лампа', 'стілець', 'друг', 'життя', 'час', 'люди', 'справа', 'місце', 'слово', 'сторона', 'питання']
};

// Current selected lesson language
let selectedLessonLang = 'ru';
let currentLevelData = null; // Сохраняем данные текущего уровня

// Background images setup
function setRandomBackground() {
    const isDark = document.documentElement.classList.contains('dark');
    const backgrounds = isDark 
        ? ['background_black.jpg', 'background_black_1.jpg', 'background_black_2.jpg']
        : ['background_white.jpg', 'background_white_1.jpg', 'background_white_2.jpg'];
    
    const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    document.body.style.backgroundImage = `url('assets/images/${randomBg}')`;
}

// Create floating particles effect
function createParticles() {
    const heroContainer = document.querySelector('.hero-container');
    if (!heroContainer) return;
    
    // Удаляем старые частицы если есть
    const oldParticles = heroContainer.querySelectorAll('.particle');
    oldParticles.forEach(p => p.remove());
    
    // Создаем 20 частиц
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particle.style.animationDelay = Math.random() * 5 + 's';
        particle.style.opacity = Math.random() * 0.5 + 0.3;
        heroContainer.appendChild(particle);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Гарантируем что при загрузке страницы паузы нет
    app.isPaused = false;
    
    loadSettings();
    setRandomBackground(); // Устанавливаем случайный фон
    createParticles(); // Создаём плавающие частицы
    initializeAudio();
    initializeUI();
    updateTranslations();
    window.statsModule.updateDisplay();
    window.keyboardModule.render(app.currentLayout);
    
    // Воспроизводим welcome звук при загрузке главной страницы
    setTimeout(() => {
        playWelcomeSound();
    }, 500);
});

// Initialize audio elements
function initializeAudio() {
    try {
        audioClick = new Audio('assets/sounds/click.ogg');
        audioError = new Audio('assets/sounds/error.ogg');
        audioWelcome = new Audio('assets/sounds/welcome.ogg');
        audioVictory = new Audio('assets/sounds/victory.ogg');
        
        // Set volumes
        if (audioClick) audioClick.volume = 0.3;
        if (audioError) audioError.volume = 0.4;
        if (audioWelcome) audioWelcome.volume = 0.15; // Тихо, 15%
        if (audioVictory) audioVictory.volume = 0.15; // Тихо, 15%
    } catch (e) {
        console.log('Audio files not available, using fallback');
    }
}

// Play welcome sound once
function playWelcomeSound() {
    if (!welcomePlayed && app.soundEnabled && audioWelcome && app.currentMode === 'home') {
        // Try to play
        const playPromise = audioWelcome.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                welcomePlayed = true;
            }).catch(error => {
                // Autoplay blocked - play on first interaction
                const playOnInteraction = () => {
                    if (!welcomePlayed && audioWelcome && app.currentMode === 'home') {
                        audioWelcome.play().catch(() => {});
                        welcomePlayed = true;
                    }
                    document.removeEventListener('click', playOnInteraction);
                    document.removeEventListener('keydown', playOnInteraction);
                };
                document.addEventListener('click', playOnInteraction, { once: true });
                document.addEventListener('keydown', playOnInteraction, { once: true });
            });
        }
    }
}

// Load settings from localStorage
function loadSettings() {
    const savedTheme = localStorage.getItem('theme');
    const savedLang = localStorage.getItem('lang');
    const savedLayout = localStorage.getItem('layout');
    const savedSound = localStorage.getItem('sound');
    
    if (savedTheme) {
        app.theme = savedTheme;
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
    
    if (savedLang) {
        app.lang = savedLang;
    }
    
    if (savedLayout) {
        app.currentLayout = savedLayout;
        // Обновляем отображение кнопки раскладки
        const layoutBtn = document.getElementById('currentLayout');
        if (layoutBtn) {
            layoutBtn.textContent = app.currentLayout === 'ru' ? 'РУС' : app.currentLayout === 'en' ? 'ENG' : 'УКР';
        }
    }
    
    if (savedSound !== null) {
        app.soundEnabled = savedSound === 'true';
    }
}

// Initialize UI event listeners
function initializeUI() {
    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    
    // Language toggle
    document.getElementById('langToggle')?.addEventListener('click', toggleLanguage);
    
    // Layout toggle
    document.getElementById('layoutToggle')?.addEventListener('click', toggleLayout);
    
    // Sound toggle
    document.getElementById('soundToggle')?.addEventListener('click', toggleSound);
    
    // Keyboard input
    document.addEventListener('keydown', handleKeyPress);
}

// Theme toggle
function toggleTheme() {
    app.theme = app.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', app.theme === 'dark');
    localStorage.setItem('theme', app.theme);
    
    // Меняем фон при переключении темы
    setRandomBackground();
    
    // Update icon
    const icon = document.getElementById('themeIcon');
    if (app.theme === 'dark') {
        icon.innerHTML = '<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />';
    } else {
        icon.innerHTML = '<path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />';
    }
}

// Language toggle
function toggleLanguage() {
    app.lang = app.lang === 'ru' ? 'en' : 'ru';
    localStorage.setItem('lang', app.lang);
    document.getElementById('currentLang').textContent = app.lang.toUpperCase();
    updateTranslations();
}

// Layout toggle
function toggleLayout() {
    // Циклическое переключение: ru -> en -> ua -> ru
    const layouts = ['ru', 'en', 'ua'];
    const currentIndex = layouts.indexOf(app.currentLayout);
    app.currentLayout = layouts[(currentIndex + 1) % layouts.length];
    
    localStorage.setItem('layout', app.currentLayout);
    const layoutText = app.currentLayout === 'ru' ? 'РУС' : app.currentLayout === 'en' ? 'ENG' : 'УКР';
    document.getElementById('currentLayout').textContent = layoutText;
    
    // Обновляем клавиатуру с новой раскладкой
    window.keyboardModule.render(app.currentLayout);
    
    // Если мы в режиме практики, обновляем подсветку текущей клавиши
    if (app.currentMode === 'practice' && app.currentPosition < app.currentText.length) {
        const currentChar = app.currentText[app.currentPosition];
        window.keyboardModule.highlightStatic(currentChar);
    }
}

// Sound toggle
function toggleSound() {
    app.soundEnabled = !app.soundEnabled;
    localStorage.setItem('sound', app.soundEnabled);
    
    const icon = document.getElementById('soundIcon');
    if (app.soundEnabled) {
        icon.innerHTML = '<path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd" />';
    } else {
        icon.innerHTML = '<path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd" />';
    }
}

// Update all translations
function updateTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[app.lang][key]) {
            el.textContent = translations[app.lang][key];
        }
    });
}

// Navigation functions
function showHome() {
    hideAllScreens();
    document.getElementById('homeScreen').classList.remove('hidden');
    app.currentMode = 'home';
    createParticles(); // Пересоздаём частицы при возврате
}

function showLessons() {
    hideAllScreens();
    document.getElementById('lessonsScreen').classList.remove('hidden');
    app.currentMode = 'lessons';
    loadLessons();
}

function showFreeMode() {
    const text = prompt(translations[app.lang].enterYourText);
    if (text && text.trim()) {
        startPractice(text, 'free');
    }
}

function showSpeedTest() {
    const words = speedTestWords[app.currentLayout];
    
    // Если слов нет для текущей раскладки, используем английские
    if (!words || words.length === 0) {
        console.warn(`No speed test words for layout: ${app.currentLayout}, using English`);
        const fallbackWords = speedTestWords['en'];
    const testText = [];
        for (let i = 0; i < 100; i++) {
            testText.push(fallbackWords[Math.floor(Math.random() * fallbackWords.length)]);
        }
        startPractice(testText.join(' '), 'speedtest');
        return;
    }
    
    const testText = [];
    for (let i = 0; i < 100; i++) {
        testText.push(words[Math.floor(Math.random() * words.length)]);
    }
    
    startPractice(testText.join(' '), 'speedtest');
}

function hideAllScreens() {
    document.getElementById('homeScreen').classList.add('hidden');
    document.getElementById('lessonsScreen').classList.add('hidden');
    document.getElementById('practiceScreen').classList.add('hidden');
    document.getElementById('multiplayerMenuScreen')?.classList.add('hidden');
    document.getElementById('multiplayerWaitingScreen')?.classList.add('hidden');
    document.getElementById('multiplayerGameScreen')?.classList.add('hidden');
}

// Select lesson language
function selectLessonLanguage(lang) {
    selectedLessonLang = lang;
    
    // Update button styles
    document.querySelectorAll('[id^="lessonLang"]').forEach(btn => {
        btn.className = 'w-full px-4 py-4 rounded-xl bg-gray-700/50 dark:bg-gray-800/50 hover:bg-gray-600/50 text-gray-300 font-bold text-lg transition-all transform hover:scale-105';
    });
    document.getElementById(`lessonLang${lang.charAt(0).toUpperCase() + lang.slice(1)}`).className = 'w-full px-4 py-4 rounded-xl bg-gradient-to-br from-primary to-cyan-500 text-white font-bold text-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all transform hover:scale-105';
    
    loadLessons();
}

// Load lessons
function loadLessons() {
    const container = document.getElementById('lessonsList');
    container.innerHTML = '';
    
    const levels = ['beginner', 'medium', 'advanced'];
    
    for (const level of levels) {
        const data = LESSONS_DATA[level];
        if (!data) continue;
        
        // Filter lessons by selected language
        const lessonsForLang = data.lessons.filter(l => l.layout === selectedLessonLang);
        if (lessonsForLang.length === 0) continue;
        
        const card = document.createElement('div');
        card.className = 'bg-gradient-to-br from-gray-800/60 to-gray-900/80 dark:from-gray-800/80 dark:to-gray-900/90 rounded-2xl p-6 hover:scale-105 transition-all cursor-pointer border border-gray-700/30 shadow-xl hover:shadow-2xl hover:border-primary/50';
        card.onclick = () => showLessonList({ ...data, lessons: lessonsForLang });
        
        const levelName = app.lang === 'ru' ? data.name_ru : data.name_en;
        
        // Цвета для разных уровней
        const levelColors = {
            beginner: 'text-success',
            medium: 'text-warning',
            advanced: 'text-red-400'
        };
        
        const levelIcons = {
            beginner: '🌱',
            medium: '⚡',
            advanced: '🔥'
        };
        
        card.innerHTML = `
            <div class="text-4xl mb-3">${levelIcons[level]}</div>
            <h3 class="text-2xl font-bold mb-2 ${levelColors[level]}">${levelName}</h3>
            <p class="text-gray-400">${lessonsForLang.length} ${app.lang === 'ru' ? 'уроков' : 'lessons'}</p>
        `;
        
        container.appendChild(card);
    }
}

// Show lesson list
function showLessonList(levelData) {
    currentLevelData = levelData; // Сохраняем для возврата после урока
    const container = document.getElementById('lessonsList');
    container.innerHTML = '';
    
    levelData.lessons.forEach(lesson => {
        const lessonKey = `lesson_${levelData.level}_${lesson.id}`;
        const lessonStats = window.statsModule.getLessonStats(lessonKey);
        
        const card = document.createElement('div');
        
        // Добавляем индикатор завершения
        const completedClass = (lessonStats && lessonStats.completed) ? 'border-success/50 bg-gradient-to-br from-gray-800/70 to-gray-900/90' : 'border-gray-700/30 bg-gradient-to-br from-gray-800/50 to-gray-900/80';
        
        card.className = `${completedClass} rounded-xl p-5 hover:scale-102 transition-all cursor-pointer relative border shadow-lg hover:shadow-xl dark:from-gray-800/70 dark:to-gray-900/95`;
        card.onclick = () => startPractice(lesson.text, 'lesson', { ...lesson, key: lessonKey });
        
        let statsHtml = '';
        let completeBadge = '';
        
        if (lessonStats && lessonStats.completed) {
            const accuracy = lessonStats.accuracy || 0;
            const accuracyColor = accuracy >= 95 ? 'text-success' : accuracy >= 85 ? 'text-warning' : 'text-red-500';
            const accuracyBg = accuracy >= 95 ? 'bg-success/20' : accuracy >= 85 ? 'bg-warning/20' : 'bg-red-500/20';
            
            completeBadge = `
                <div class="absolute top-3 right-3">
                    <div class="bg-success/20 text-success px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                        <span>✓</span>
                    </div>
                </div>
            `;
            
            statsHtml = `
                <div class="mt-3 pt-3 border-t border-gray-700/40 flex justify-between items-center">
                    <span class="text-xs text-gray-500 font-medium">Лучший результат:</span>
                    <div class="${accuracyBg} ${accuracyColor} px-3 py-1 rounded-lg text-sm font-bold">
                        ${accuracy}%
                    </div>
                </div>
            `;
        }
        
        card.innerHTML = `
            ${completeBadge}
            <h4 class="font-bold text-lg mb-2 text-gray-100">${lesson.name}</h4>
            <p class="text-sm text-gray-400 mb-3">${lesson.description}</p>
            <div class="flex items-center justify-between">
                <span class="px-3 py-1 rounded-lg bg-primary/20 text-primary text-xs font-semibold">${lesson.layout.toUpperCase()}</span>
                <span class="text-xs text-gray-500">${lesson.difficulty}</span>
            </div>
            ${statsHtml}
        `;
        
        container.appendChild(card);
    });
}

// Start practice
function startPractice(text, mode, lesson = null) {
    // КРИТИЧНО: Сразу сбрасываем паузу чтобы избежать блокировки ввода
    app.isPaused = false;
    
    hideAllScreens();
    document.getElementById('practiceScreen').classList.remove('hidden');
    
    // Очищаем старый таймер если он есть
    if (app.timerInterval) {
        clearInterval(app.timerInterval);
        app.timerInterval = null;
    }
    
    // Очищаем переменные теста на скорость
    app.speedTestStartTime = null;
    app.speedTestEndTime = null;
    app.pauseStartTime = null;
    
    app.currentMode = mode;
    app.currentText = text;
    app.currentLesson = lesson;
    app.currentPosition = 0;
    app.startTime = Date.now();
    app.endTime = null;
    app.isPaused = false; // Дублируем для надёжности
    app.errors = 0;
    app.totalChars = text.length;
    app.typedText = ''; // Обнуляем набранный текст
    
    // Автоматически устанавливаем раскладку по языку урока
    if (lesson && lesson.layout) {
        app.currentLayout = lesson.layout;
        const layoutNames = { 'ru': 'РУС', 'en': 'ENG', 'ua': 'УКР' };
        document.getElementById('currentLayout').textContent = layoutNames[app.currentLayout] || 'РУС';
        window.keyboardModule.render(app.currentLayout);
    }
    
    // Сбросить кнопку паузы
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.querySelector('span').textContent = translations[app.lang].pause;
    }
    
    renderText();
    updateStats();
    
    if (mode === 'speedtest') {
        startSpeedTestTimer();
    } else {
        // Для обычных уроков - запускаем таймер обновления статистики
        startStatsTimer();
    }
}

// Render text display - НОВАЯ ЛОГИКА: бегущая строка
function renderText() {
    const display = document.getElementById('textDisplay');
    
    // Определяем окно видимости (сколько символов показывать)
    const WINDOW_SIZE = 60; // Показываем ~60 символов
    const TYPED_VISIBLE = 10; // Показываем последние 10 набранных символов
    
    // Вычисляем начало и конец видимого окна
    const startPos = Math.max(0, app.currentPosition - TYPED_VISIBLE);
    const endPos = Math.min(app.currentText.length, startPos + WINDOW_SIZE);
    
    let html = '';
    
    for (let i = startPos; i < endPos; i++) {
        const char = app.currentText[i];
        let className = '';
        let style = '';
        
        if (i < app.currentPosition) {
            // Уже набранный текст
            className = 'char-typed';
            // Делаем уже набранный текст полупрозрачным и меньше
            const distanceFromCurrent = app.currentPosition - i;
            const opacity = Math.max(0.2, 1 - (distanceFromCurrent / TYPED_VISIBLE));
            style = `opacity: ${opacity}; font-size: 0.9em;`;
        } else if (i === app.currentPosition) {
            // Текущий символ для набора
            className = 'char-current';
        } else {
            // Будущие символы
            className = 'char-future';
        }
        
        const displayChar = char === ' ' ? '&nbsp;' : escapeHtml(char);
        html += `<span class="${className}" style="${style}">${displayChar}</span>`;
    }
    
    display.innerHTML = html;
    
    // Подсветить текущую клавишу на клавиатуре
    if (app.currentPosition < app.currentText.length) {
        const currentChar = app.currentText[app.currentPosition];
        window.keyboardModule.highlightStatic(currentChar);
    }
}

// Handle key press
function handleKeyPress(e) {
    // Разрешаем ввод во всех режимах практики
    const validModes = ['practice', 'speedtest', 'lesson', 'free'];
    if (!validModes.includes(app.currentMode) || app.isPaused) return;
    
    // Ignore special keys
    if (e.key.length > 1 && e.key !== 'Backspace' && e.key !== 'Enter') return;
    
    e.preventDefault();
    
    const expectedChar = app.currentText[app.currentPosition];
    
    if (e.key === 'Backspace') {
        if (app.currentPosition > 0) {
            app.currentPosition--;
            // Remove last character from typed text
            if (app.typedText) {
                app.typedText = app.typedText.slice(0, -1);
            }
            renderText();
            updateStats();
        }
        return;
    }
    
    // НОВАЯ ЛОГИКА: Блокируем неправильный ввод
    // Проверяем, совпадает ли нажатая клавиша с ожидаемым символом
    if (e.key !== expectedChar) {
        // Неправильный символ - играем звук ошибки и НЕ двигаемся дальше
        playSound('error');
        app.errors++;
        // Подсвечиваем текущий символ красным на мгновение
        highlightError();
        return; // Не продолжаем!
    }
    
    // Если дошли сюда - символ правильный
    playSound('correct');
    window.keyboardModule.highlight(e.key);
    
    app.currentPosition++;
    
    // Store typed text for comparison
    if (!app.typedText) app.typedText = '';
    app.typedText += e.key;
    
    renderText();
    updateStats();
    
    // Check if finished
    if (app.currentPosition >= app.currentText.length) {
        finishPractice();
    }
}

// Подсветка ошибки (мигание)
function highlightError() {
    const display = document.getElementById('textDisplay');
    display.style.animation = 'shake 0.3s';
    setTimeout(() => {
        display.style.animation = '';
    }, 300);
}

// Update stats during practice
function updateStats() {
    const elapsed = app.isPaused ? 0 : (Date.now() - app.startTime) / 1000;
    const minutes = elapsed / 60;
    
    // Speed (characters per minute)
    const speed = minutes > 0 ? Math.round(app.currentPosition / minutes) : 0;
    document.getElementById('currentSpeed').textContent = speed;
    
    // Accuracy - НОВАЯ ФОРМУЛА
    // Точность = правильные символы / (правильные символы + ошибки) * 100
    const totalAttempts = app.currentPosition + app.errors;
    const accuracy = totalAttempts > 0 
        ? Math.round((app.currentPosition / totalAttempts) * 100) 
        : 100;
    document.getElementById('currentAccuracy').textContent = accuracy;
    
    // Time
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    document.getElementById('currentTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    
    // Progress
    const progress = Math.round((app.currentPosition / app.totalChars) * 100);
    document.getElementById('currentProgress').textContent = progress;
    document.getElementById('progressBar').style.width = progress + '%';
}

// Stats timer for regular lessons - обновляет время каждую секунду
function startStatsTimer() {
    app.timerInterval = setInterval(() => {
        if (app.isPaused) return;
        
        const elapsed = (Date.now() - app.startTime) / 1000;
        const mins = Math.floor(elapsed / 60);
        const secs = Math.floor(elapsed % 60);
        document.getElementById('currentTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        
        // Обновляем скорость тоже
        const minutes = elapsed / 60;
        const speed = minutes > 0 ? Math.round(app.currentPosition / minutes) : 0;
        document.getElementById('currentSpeed').textContent = speed;
    }, 1000);
}

// Speed test timer - обратный отсчёт
function startSpeedTestTimer() {
    // Сохраняем начальное время и продолжительность
    app.speedTestStartTime = Date.now();
    app.speedTestEndTime = app.speedTestStartTime + (app.speedTestDuration * 1000);
    
    // Показываем начальное время
    const mins = Math.floor(app.speedTestDuration / 60);
    const secs = app.speedTestDuration % 60;
    document.getElementById('currentTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    
    app.timerInterval = setInterval(() => {
        if (app.isPaused) return;
        
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((app.speedTestEndTime - now) / 1000));
        
        if (remaining <= 0) {
            clearInterval(app.timerInterval);
            app.timerInterval = null;
            finishPractice();
            return;
        }
        
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        document.getElementById('currentTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        
        // Обновляем скорость
        const elapsed = (now - app.speedTestStartTime) / 1000;
        const minutes = elapsed / 60;
        const speed = minutes > 0 ? Math.round(app.currentPosition / minutes) : 0;
        document.getElementById('currentSpeed').textContent = speed;
    }, 100); // Обновляем чаще для более плавного отсчёта
}

// Toggle pause
function togglePause() {
    if (app.isPaused) {
        // Снимаем паузу
        app.isPaused = false;
        
        // Для теста на скорость корректируем время окончания
        if (app.currentMode === 'speedtest' && app.pauseStartTime) {
            const pauseDuration = Date.now() - app.pauseStartTime;
            app.speedTestEndTime += pauseDuration;
            app.pauseStartTime = null;
        }
        
        document.getElementById('pauseBtn').querySelector('span').textContent = translations[app.lang].pause;
    } else {
        // Ставим на паузу
        app.isPaused = true;
        
        // Запоминаем время начала паузы для теста на скорость
        if (app.currentMode === 'speedtest') {
            app.pauseStartTime = Date.now();
        }
        
        document.getElementById('pauseBtn').querySelector('span').textContent = translations[app.lang].resume;
    }
}

// Restart practice
function restartPractice() {
    startPractice(app.currentText, app.currentMode, app.currentLesson);
}

// Exit practice
function exitPractice() {
    // Сбрасываем паузу при выходе
    app.isPaused = false;
    
    if (app.timerInterval) {
        clearInterval(app.timerInterval);
    }
    
    // Останавливаем welcome звук если играет
    if (audioWelcome && !audioWelcome.paused) {
        audioWelcome.pause();
        audioWelcome.currentTime = 0;
    }
    
    if (app.currentLesson && currentLevelData) {
        // Возвращаемся в список уроков того же уровня
        showLessons();
        // Перезагружаем список уроков текущего уровня
        setTimeout(() => showLessonList(currentLevelData), 100);
    } else if (app.currentLesson) {
        showLessons();
    } else {
        showHome();
    }
}

// Finish practice
function finishPractice() {
    if (app.timerInterval) {
        clearInterval(app.timerInterval);
    }
    
    // БЛОКИРУЕМ ДАЛЬНЕЙШИЙ ВВОД
    app.isPaused = true;
    
    app.endTime = Date.now();
    const elapsed = (app.endTime - app.startTime) / 1000;
    const minutes = elapsed / 60;
    const speed = Math.round(app.currentPosition / minutes);
    
    // НОВАЯ ФОРМУЛА ТОЧНОСТИ
    const totalAttempts = app.currentPosition + app.errors;
    const accuracy = totalAttempts > 0 
        ? Math.round((app.currentPosition / totalAttempts) * 100) 
        : 100;
    
    // Save to statistics
    window.statsModule.addSession({
        speed,
        accuracy,
        time: Math.round(elapsed),
        errors: app.errors,
        mode: app.currentMode === 'practice' && app.currentLesson ? 'lesson' : app.currentMode,
        layout: app.currentLayout,
        lessonKey: app.currentLesson?.key || null
    });
    
    // Show results modal
    showResults(speed, accuracy, elapsed, app.errors);
}

// Show results modal
function showResults(speed, accuracy, time, errors) {
    document.getElementById('resultSpeed').textContent = speed;
    document.getElementById('resultAccuracy').textContent = accuracy;
    
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    document.getElementById('resultTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('resultErrors').textContent = errors;
    
    // Воспроизводим звук победы
    if (app.soundEnabled && audioVictory) {
        audioVictory.currentTime = 0; // Сброс на начало
        audioVictory.play().catch(() => {});
    }
    
    const modal = document.getElementById('resultsModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Close results modal
function closeResults() {
    const modal = document.getElementById('resultsModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    exitPractice();
}

// Repeat practice
function repeatPractice() {
    closeResults();
    restartPractice();
}

// Play sound
function playSound(type) {
    if (!app.soundEnabled) return;
    
    try {
        if (type === 'correct' && audioClick) {
            // Clone and play для возможности быстрых повторений
            const sound = audioClick.cloneNode();
            sound.volume = 0.3;
            sound.play().catch(() => {});
        } else if (type === 'error' && audioError) {
            const sound = audioError.cloneNode();
            sound.volume = 0.4;
            sound.play().catch(() => {});
        }
    } catch (e) {
        // Fallback to Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            if (type === 'correct') {
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.1;
            } else {
                oscillator.frequency.value = 200;
                gainNode.gain.value = 0.15;
            }
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.05);
        } catch (e2) {
            // Audio not supported
        }
    }
}

// Utility function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// MULTIPLAYER MODE FUNCTIONS
// ============================================

// Show multiplayer menu
function showMultiplayerMenu() {
    hideAllScreens();
    document.getElementById('multiplayerMenuScreen').classList.remove('hidden');
    app.currentMode = 'multiplayer-menu';
}

// Show join room dialog
function showJoinRoomDialog() {
    document.getElementById('joinRoomDialog').classList.remove('hidden');
    document.getElementById('joinRoomCodeInput').value = '';
    document.getElementById('joinRoomError').classList.add('hidden');
}

// Hide join room dialog
function hideJoinRoomDialog() {
    document.getElementById('joinRoomDialog').classList.add('hidden');
}

// Create multiplayer room
async function createMultiplayerRoom() {
    try {
        const roomCode = await window.multiplayerModule.createRoom();
        
        hideAllScreens();
        document.getElementById('multiplayerWaitingScreen').classList.remove('hidden');
        document.getElementById('multiplayerRoomCode').textContent = roomCode;
        app.currentMode = 'multiplayer-waiting';
        
    } catch (error) {
        console.error('Failed to create room:', error);
        alert('Ошибка создания комнаты: ' + error.message);
    }
}

// Join multiplayer room
async function joinMultiplayerRoom() {
    const roomCode = document.getElementById('joinRoomCodeInput').value.trim().toUpperCase();
    
    if (!roomCode || roomCode.length !== 6) {
        document.getElementById('joinRoomError').textContent = 'Введи корректный код (6 символов)';
        document.getElementById('joinRoomError').classList.remove('hidden');
        return;
    }
    
    try {
        await window.multiplayerModule.joinRoom(roomCode);
        
        hideAllScreens();
        document.getElementById('multiplayerWaitingScreen').classList.remove('hidden');
        document.getElementById('multiplayerRoomCode').textContent = roomCode;
        app.currentMode = 'multiplayer-waiting';
        
    } catch (error) {
        console.error('Failed to join room:', error);
        document.getElementById('joinRoomError').textContent = error.message;
        document.getElementById('joinRoomError').classList.remove('hidden');
    }
}

// Leave multiplayer room
async function leaveMultiplayerRoom() {
    try {
        await window.multiplayerModule.leaveRoom();
        showHome();
    } catch (error) {
        console.error('Failed to leave room:', error);
        showHome();
    }
}

// Copy room code to clipboard
function copyRoomCode() {
    const roomCode = document.getElementById('multiplayerRoomCode').textContent;
    navigator.clipboard.writeText(roomCode).then(() => {
        alert('Код скопирован: ' + roomCode);
    });
}

// Multiplayer callbacks
window.onMultiplayerUpdate = (data) => {
    // Update player count
    if (data.playerCount) {
        const countEl = document.getElementById('multiplayerPlayerCount');
        if (countEl) {
            countEl.innerHTML = `<span class="text-success font-bold">${data.playerCount}</span> / <span class="text-gray-400">2</span> игроков`;
        }
    }
    
    // Update opponent progress in game
    if (data.opponentProgress !== undefined && app.currentMode === 'multiplayer-game') {
        const progress = Math.round(data.opponentProgress);
        document.getElementById('multiplayerOpponentProgress').textContent = progress;
        document.getElementById('multiplayerOpponentProgressBar').style.width = progress + '%';
    }
};

window.onMultiplayerStart = (gameText) => {
    hideAllScreens();
    document.getElementById('multiplayerGameScreen').classList.remove('hidden');
    app.currentMode = 'multiplayer-game';
    
    // Setup game
    app.currentText = gameText;
    app.currentPosition = 0;
    app.errors = 0;
    app.startTime = Date.now();
    app.isPaused = false;
    
    // Render text
    const display = document.getElementById('multiplayerTextDisplay');
    display.innerHTML = '';
    for (let i = 0; i < gameText.length; i++) {
        const span = document.createElement('span');
        span.textContent = gameText[i];
        span.className = i === 0 ? 'char-current' : 'char-future';
        span.dataset.index = i;
        display.appendChild(span);
    }
    
    // Reset progress bars
    document.getElementById('multiplayerMyProgress').textContent = '0';
    document.getElementById('multiplayerMyProgressBar').style.width = '0%';
    document.getElementById('multiplayerOpponentProgress').textContent = '0';
    document.getElementById('multiplayerOpponentProgressBar').style.width = '0%';
    
    // Render keyboard
    const keyboardContainer = document.getElementById('multiplayerKeyboardContainer');
    keyboardContainer.innerHTML = '';
    window.keyboardModule.render(app.currentLayout, keyboardContainer);
    
    // Focus input
    document.addEventListener('keydown', handleMultiplayerKeyPress);
};

window.onMultiplayerRoomDeleted = () => {
    alert('Комната была закрыта');
    showHome();
};

window.onOpponentFinished = () => {
    if (!app.gameEnded) {
        setTimeout(() => {
            alert('Противник финишировал! Ты проиграл 😢');
            leaveMultiplayerRoom();
        }, 100);
    }
};

// Handle multiplayer key press
function handleMultiplayerKeyPress(e) {
    if (app.currentMode !== 'multiplayer-game' || app.isPaused) return;
    
    if (e.key.length > 1 && e.key !== 'Backspace' && e.key !== 'Enter') return;
    
    e.preventDefault();
    
    const display = document.getElementById('multiplayerTextDisplay');
    
    if (e.key === 'Backspace') {
        if (app.currentPosition > 0) {
            app.currentPosition--;
            const spans = display.querySelectorAll('span');
            spans[app.currentPosition].className = 'char-current';
            if (app.currentPosition + 1 < spans.length) {
                spans[app.currentPosition + 1].className = 'char-future';
            }
            updateMultiplayerProgress();
        }
        return;
    }
    
    const expectedChar = app.currentText[app.currentPosition];
    const spans = display.querySelectorAll('span');
    
    if (e.key === expectedChar) {
        // Correct
        spans[app.currentPosition].className = 'char-typed';
        app.currentPosition++;
        
        if (app.currentPosition < app.currentText.length) {
            spans[app.currentPosition].className = 'char-current';
        }
        
        playSound('correct');
        updateMultiplayerProgress();
        
        // Check if finished
        if (app.currentPosition >= app.currentText.length) {
            finishMultiplayerGame();
        }
    } else {
        // Error
        app.errors++;
        playSound('error');
    }
}

// Update multiplayer progress
function updateMultiplayerProgress() {
    const progress = Math.round((app.currentPosition / app.currentText.length) * 100);
    document.getElementById('multiplayerMyProgress').textContent = progress;
    document.getElementById('multiplayerMyProgressBar').style.width = progress + '%';
    
    // Send to Firebase
    window.multiplayerModule.updateProgress(progress);
}

// Finish multiplayer game
async function finishMultiplayerGame() {
    app.gameEnded = true;
    document.removeEventListener('keydown', handleMultiplayerKeyPress);
    
    await window.multiplayerModule.finishGame();
    
    setTimeout(() => {
        alert('🏆 Победа! Ты первый!');
        leaveMultiplayerRoom();
    }, 500);
}

