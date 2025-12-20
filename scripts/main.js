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
    speedTestWords: [],
    // Performance optimizations
    statsUpdatePending: false,
    lastStatsUpdate: 0,
    cachedDOM: {},
    animationFrameId: null
};

// DOM Cache - кэшируем часто используемые элементы
const DOM = {
    get: function(id) {
        if (!this.cache) this.cache = {};
        if (!this.cache[id]) {
            this.cache[id] = document.getElementById(id);
        }
        return this.cache[id];
    },
    clear: function() {
        this.cache = {};
    }
};

// Throttle function для оптимизации обновлений
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// RequestAnimationFrame wrapper для таймеров
function rafTimer(callback) {
    let lastTime = 0;
    const frame = (currentTime) => {
        const delta = currentTime - lastTime;
        if (delta >= 1000) { // Update every second
            callback();
            lastTime = currentTime;
        }
        app.animationFrameId = requestAnimationFrame(frame);
    };
    app.animationFrameId = requestAnimationFrame(frame);
    return () => {
        if (app.animationFrameId) {
            cancelAnimationFrame(app.animationFrameId);
            app.animationFrameId = null;
        }
    };
}

// Translations
// Audio elements
let audioClick = null;
let audioError = null;
let audioWelcome = null;
let audioVictory = null;
let welcomePlayed = false;

const translations = {
    ru: {
        welcome: 'Добро пожаловать в игру',
        subtitle: 'Научитесь печатать быстро и без ошибок',
        lessons: 'Уроки',
        lessonsDesc: 'Обучение с нуля до профи',
        freeMode: 'Свободная печать',
        freeModeDesc: 'Свой текст для тренировки',
        speedTest: 'Тест скорости',
        speedTestDesc: '60 секунд на максимум',
        multiplayer: 'Мультиплеер',
        multiplayerDesc: 'Соревнуйся с друзьями!',
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
        start: 'Начать',
        // Multiplayer
        multiplayerMenu: 'Мультиплеер',
        createRoom: 'Создать комнату',
        createRoomDesc: 'Получи код и отправь другу',
        joinRoom: 'Подключиться',
        joinRoomDesc: 'Введи код комнаты друга',
        roomCode: 'Код комнаты',
        copyCode: 'Копировать код',
        codeCopied: 'Код скопирован',
        waitingForPlayer: 'Ожидание игрока...',
        playersCount: 'игроков',
        roomClosed: 'Комната закрыта',
        opponentLeft: 'Противник покинул игру',
        youWon: 'Победа!',
        youLost: 'Поражение',
        youWonMsg: 'Ты первый допечатал текст!',
        youLostMsg: 'Противник был быстрее',
        roomCreated: 'Комната создана',
        joinedRoom: 'Вы подключились к комнате',
        playerJoined: 'Игрок подключился',
        leftRoom: 'Вы покинули комнату',
        errorCreatingRoom: 'Ошибка создания комнаты',
        errorJoiningRoom: 'Ошибка подключения',
        enterRoomCode: 'Введи код комнаты (например: ABC123)',
        invalidCode: 'Введи корректный код (6 символов)',
        chooseGameMode: 'Выбери режим игры',
        textTheme: 'Тематика текста',
        textLanguage: 'Язык текста',
        wordCount: 'Количество слов',
        sendCodeToFriend: 'Отправь этот код другу!',
        shortText: 'Короткий текст',
        mediumText: 'Средний текст',
        longText: 'Длинный текст',
        words30: 'слов',
        words50: 'слов',
        words100: 'слов',
        // Auth & Profile
        login: 'Войти',
        register: 'Зарегистрироваться',
        logout: 'Выйти',
        profile: 'Профиль',
        username: 'Никнейм',
        email: 'Email',
        password: 'Пароль',
        bio: 'О себе',
        save: 'Сохранить',
        statistics: 'Статистика',
        totalSessions: 'Всего сессий',
        totalErrors: 'Всего ошибок',
        loginSuccess: 'Вход выполнен успешно',
        registerSuccess: 'Регистрация успешна',
        logoutSuccess: 'Выход выполнен',
        loginError: 'Ошибка входа',
        registerError: 'Ошибка регистрации',
        fillAllFields: 'Заполните все поля',
        passwordTooShort: 'Пароль должен быть не менее 6 символов',
        profileSaved: 'Профиль сохранён',
        saveError: 'Ошибка сохранения',
        chooseAvatar: 'Выберите аватар',
        updatingAvatar: 'Обновление аватара...',
        avatarUpdated: 'Аватар обновлён',
        updateError: 'Ошибка обновления',
        noAccount: 'Нет аккаунта?',
        haveAccount: 'Уже есть аккаунт?',
        admin: 'Админ',
        adminPanel: 'Админ-панель',
        allUsers: 'Все пользователи',
        country: 'Страна',
        lastLogin: 'Последний вход',
        sessions: 'Сессий',
        actions: 'Действия',
        delete: 'Удалить',
        refresh: 'Обновить',
        confirmDelete: 'Вы уверены, что хотите удалить этого пользователя?',
        userDeleted: 'Пользователь удалён',
        deleteError: 'Ошибка удаления',
        loadError: 'Ошибка загрузки',
        accessDenied: 'Доступ запрещён'
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
        multiplayer: 'Multiplayer',
        multiplayerDesc: 'Compete with friends!',
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
        start: 'Start',
        // Multiplayer
        multiplayerMenu: 'Multiplayer',
        createRoom: 'Create Room',
        createRoomDesc: 'Get code and send to friend',
        joinRoom: 'Join Room',
        joinRoomDesc: 'Enter friend\'s room code',
        roomCode: 'Room Code',
        copyCode: 'Copy Code',
        codeCopied: 'Code Copied',
        waitingForPlayer: 'Waiting for player...',
        playersCount: 'players',
        roomClosed: 'Room Closed',
        opponentLeft: 'Opponent Left',
        youWon: 'Victory!',
        youLost: 'Defeat',
        youWonMsg: 'You finished first!',
        youLostMsg: 'Opponent was faster',
        roomCreated: 'Room Created',
        joinedRoom: 'You joined the room',
        playerJoined: 'Player joined',
        leftRoom: 'You left the room',
        errorCreatingRoom: 'Error creating room',
        errorJoiningRoom: 'Error joining room',
        enterRoomCode: 'Enter room code (e.g.: ABC123)',
        invalidCode: 'Enter valid code (6 characters)',
        chooseGameMode: 'Choose game mode',
        textTheme: 'Text Theme',
        textLanguage: 'Text Language',
        wordCount: 'Word Count',
        sendCodeToFriend: 'Send this code to friend!',
        shortText: 'Short Text',
        mediumText: 'Medium Text',
        longText: 'Long Text',
        words30: 'words',
        words50: 'words',
        words100: 'words',
        // Auth & Profile
        login: 'Login',
        register: 'Register',
        logout: 'Logout',
        profile: 'Profile',
        username: 'Username',
        email: 'Email',
        password: 'Password',
        bio: 'About me',
        save: 'Save',
        statistics: 'Statistics',
        totalSessions: 'Total Sessions',
        totalErrors: 'Total Errors',
        loginSuccess: 'Login successful',
        registerSuccess: 'Registration successful',
        logoutSuccess: 'Logout successful',
        loginError: 'Login error',
        registerError: 'Registration error',
        fillAllFields: 'Please fill all fields',
        passwordTooShort: 'Password must be at least 6 characters',
        profileSaved: 'Profile saved',
        saveError: 'Save error',
        chooseAvatar: 'Choose Avatar',
        updatingAvatar: 'Updating avatar...',
        avatarUpdated: 'Avatar updated',
        updateError: 'Update error',
        noAccount: 'No account?',
        haveAccount: 'Already have account?',
        admin: 'Admin',
        adminPanel: 'Admin Panel',
        allUsers: 'All Users',
        country: 'Country',
        lastLogin: 'Last Login',
        sessions: 'Sessions',
        actions: 'Actions',
        delete: 'Delete',
        refresh: 'Refresh',
        confirmDelete: 'Are you sure you want to delete this user?',
        userDeleted: 'User deleted',
        deleteError: 'Delete error',
        loadError: 'Load error',
        accessDenied: 'Access denied'
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
    
    // Initialize auth state listener (will be set up when auth.js loads)
    if (window.authModule) {
        window.authModule.onAuthStateChange(async (user) => {
            if (user) {
                const profileResult = await window.authModule.getUserProfile(user.uid);
                if (profileResult.success) {
                    currentUserProfile = profileResult.data;
                    updateUserUI(user, profileResult.data);
                    
                    const adminCheck = await window.authModule.isAdmin(user.uid);
                    if (adminCheck) {
                        const adminBtn = DOM.get('adminBtn');
                        if (adminBtn) adminBtn.classList.remove('hidden');
                    }
                }
            } else {
                currentUserProfile = null;
                const profileBtn = DOM.get('userProfileBtn');
                const loginBtn = DOM.get('loginBtn');
                const adminBtn = DOM.get('adminBtn');
                if (profileBtn) profileBtn.classList.add('hidden');
                if (loginBtn) loginBtn.classList.remove('hidden');
                if (adminBtn) adminBtn.classList.add('hidden');
            }
        });
    }
    
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
        const layoutBtn = DOM.get('currentLayout');
        if (layoutBtn) {
            layoutBtn.textContent = app.currentLayout === 'ru' ? 'РУС' : app.currentLayout === 'en' ? 'ENG' : 'УКР';
        }
    }
    
    if (savedSound !== null) {
        app.soundEnabled = savedSound === 'true';
    }
}

// Initialize UI event listeners - ОПТИМИЗИРОВАНА
function initializeUI() {
    // Theme toggle
    const themeToggle = DOM.get('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    
    // Language toggle
    const langToggle = DOM.get('langToggle');
    if (langToggle) langToggle.addEventListener('click', toggleLanguage);
    
    // Layout toggle
    const layoutToggle = DOM.get('layoutToggle');
    if (layoutToggle) layoutToggle.addEventListener('click', toggleLayout);
    
    // Sound toggle
    const soundToggle = DOM.get('soundToggle');
    if (soundToggle) soundToggle.addEventListener('click', toggleSound);
    
    // Keyboard input - используем passive для лучшей производительности
    document.addEventListener('keydown', handleKeyPress, { passive: false });
}

// Theme toggle
function toggleTheme() {
    app.theme = app.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', app.theme === 'dark');
    localStorage.setItem('theme', app.theme);
    
    // Меняем фон при переключении темы
    setRandomBackground();
    
    // Update icon
    const icon = DOM.get('themeIcon');
    if (icon) {
        if (app.theme === 'dark') {
            icon.innerHTML = '<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />';
        } else {
            icon.innerHTML = '<path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />';
        }
    }
}

// Language toggle - ОПТИМИЗИРОВАНА
function toggleLanguage() {
    app.lang = app.lang === 'ru' ? 'en' : 'ru';
    localStorage.setItem('lang', app.lang);
    const langEl = DOM.get('currentLang');
    if (langEl) langEl.textContent = app.lang.toUpperCase();
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
    const layoutEl = DOM.get('currentLayout');
    if (layoutEl) layoutEl.textContent = layoutText;
    
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
    
    const icon = DOM.get('soundIcon');
    if (icon) {
        if (app.soundEnabled) {
            icon.innerHTML = '<path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd" />';
        } else {
            icon.innerHTML = '<path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd" />';
        }
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
    const homeScreen = DOM.get('homeScreen');
    if (homeScreen) homeScreen.classList.remove('hidden');
    app.currentMode = 'home';
    createParticles();
}

function showLessons() {
    hideAllScreens();
    const lessonsScreen = DOM.get('lessonsScreen');
    if (lessonsScreen) lessonsScreen.classList.remove('hidden');
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
    const screens = [
        'homeScreen', 'lessonsScreen', 'practiceScreen',
        'multiplayerMenuScreen', 'multiplayerWaitingScreen', 'multiplayerGameScreen',
        'profileScreen', 'adminPanelScreen'
    ];
    
    screens.forEach(id => {
        const el = DOM.get(id);
        if (el) el.classList.add('hidden');
    });
}

// Select lesson language
function selectLessonLanguage(lang) {
    selectedLessonLang = lang;
    
    // Update button styles
    document.querySelectorAll('[id^="lessonLang"]').forEach(btn => {
        btn.className = 'w-full px-4 py-4 rounded-xl bg-gray-700/50 dark:bg-gray-800/50 hover:bg-gray-600/50 text-gray-300 font-bold text-lg transition-all transform hover:scale-105';
    });
    const activeBtn = DOM.get(`lessonLang${lang.charAt(0).toUpperCase() + lang.slice(1)}`);
    if (activeBtn) {
        activeBtn.className = 'w-full px-4 py-4 rounded-xl bg-gradient-to-br from-primary to-cyan-500 text-white font-bold text-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all transform hover:scale-105';
    }
    
    loadLessons();
}

// Load lessons - ОПТИМИЗИРОВАНА с DocumentFragment
function loadLessons() {
    const container = DOM.get('lessonsList');
    if (!container) return;
    
    const levels = ['beginner', 'medium', 'advanced'];
    const fragment = document.createDocumentFragment();
    
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
            <h3 class="text-2xl font-bold mb-2 ${levelColors[level]}">${escapeHtml(levelName)}</h3>
            <p class="text-gray-400">${lessonsForLang.length} ${app.lang === 'ru' ? 'уроков' : 'lessons'}</p>
        `;
        
        fragment.appendChild(card);
    }
    
    // Batch update
    container.innerHTML = '';
    container.appendChild(fragment);
}

// Show lesson list - ОПТИМИЗИРОВАНА с DocumentFragment
function showLessonList(levelData) {
    currentLevelData = levelData;
    const container = DOM.get('lessonsList');
    if (!container) return;
    
    // Используем DocumentFragment для batch updates
    const fragment = document.createDocumentFragment();
    
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
            <h4 class="font-bold text-lg mb-2 text-gray-100">${escapeHtml(lesson.name)}</h4>
            <p class="text-sm text-gray-400 mb-3">${escapeHtml(lesson.description)}</p>
            <div class="flex items-center justify-between">
                <span class="px-3 py-1 rounded-lg bg-primary/20 text-primary text-xs font-semibold">${lesson.layout.toUpperCase()}</span>
                <span class="text-xs text-gray-500">${escapeHtml(lesson.difficulty)}</span>
            </div>
            ${statsHtml}
        `;
        
        fragment.appendChild(card);
    });
    
    // Batch update - один раз заменяем весь контент
    container.innerHTML = '';
    container.appendChild(fragment);
}

// Start practice - ОПТИМИЗИРОВАНА
function startPractice(text, mode, lesson = null) {
    // КРИТИЧНО: Сразу сбрасываем паузу чтобы избежать блокировки ввода
    app.isPaused = false;
    
    hideAllScreens();
    const practiceScreen = DOM.get('practiceScreen');
    if (practiceScreen) {
        practiceScreen.classList.remove('hidden');
    }
    
    // Очищаем старые таймеры
    if (app.timerInterval) {
        clearInterval(app.timerInterval);
        app.timerInterval = null;
    }
    if (app.animationFrameId) {
        cancelAnimationFrame(app.animationFrameId);
        app.animationFrameId = null;
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
    app.isPaused = false;
    app.errors = 0;
    app.totalChars = text.length;
    app.typedText = '';
    
    // Очищаем кэш DOM при смене экрана
    DOM.clear();
    
    // Автоматически устанавливаем раскладку по языку урока
    if (lesson && lesson.layout) {
        app.currentLayout = lesson.layout;
        const layoutNames = { 'ru': 'РУС', 'en': 'ENG', 'ua': 'УКР' };
        const layoutEl = DOM.get('currentLayout');
        if (layoutEl) {
            layoutEl.textContent = layoutNames[app.currentLayout] || 'РУС';
        }
        window.keyboardModule.render(app.currentLayout);
    }
    
    // Сбросить кнопку паузы
    const pauseBtn = DOM.get('pauseBtn');
    if (pauseBtn) {
        const span = pauseBtn.querySelector('span');
        if (span) {
            span.textContent = translations[app.lang].pause;
        }
    }
    
    renderText();
    updateStats();
    
    if (mode === 'speedtest') {
        startSpeedTestTimer();
    } else {
        startStatsTimer();
    }
}

// Render text display - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ с DocumentFragment
function renderText() {
    const display = DOM.get('textDisplay');
    if (!display) return;
    
    // Определяем окно видимости (сколько символов показывать)
    const WINDOW_SIZE = 60; // Показываем ~60 символов
    const TYPED_VISIBLE = 10; // Показываем последние 10 набранных символов
    
    // Вычисляем начало и конец видимого окна
    const startPos = Math.max(0, app.currentPosition - TYPED_VISIBLE);
    const endPos = Math.min(app.currentText.length, startPos + WINDOW_SIZE);
    
    // Используем DocumentFragment для batch updates
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
    for (let i = startPos; i < endPos; i++) {
        const char = app.currentText[i];
        const span = document.createElement('span');
        
        if (i < app.currentPosition) {
            // Уже набранный текст
            span.className = 'char-typed';
            const distanceFromCurrent = app.currentPosition - i;
            const opacity = Math.max(0.2, 1 - (distanceFromCurrent / TYPED_VISIBLE));
            span.style.opacity = opacity;
            span.style.fontSize = '0.9em';
        } else if (i === app.currentPosition) {
            // Текущий символ для набора
            span.className = 'char-current';
        } else {
            // Будущие символы
            span.className = 'char-future';
        }
        
        if (char === ' ') {
            span.innerHTML = '&nbsp;';
        } else {
            span.textContent = char;
        }
        
        fragment.appendChild(span);
    }
    
    // Batch update - один раз заменяем весь контент
    display.innerHTML = '';
    display.appendChild(fragment);
    
    // Подсветить текущую клавишу на клавиатуре
    if (app.currentPosition < app.currentText.length) {
        const currentChar = app.currentText[app.currentPosition];
        window.keyboardModule.highlightStatic(currentChar);
    }
}

// Handle key press - ОПТИМИЗИРОВАНА
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
            updateStats(); // Throttled
        }
        return;
    }
    
    // НОВАЯ ЛОГИКА: Блокируем неправильный ввод
    if (e.key !== expectedChar) {
        // Неправильный символ - играем звук ошибки и НЕ двигаемся дальше
        playSound('error');
        app.errors++;
        highlightError();
        return;
    }
    
    // Если дошли сюда - символ правильный
    playSound('correct');
    window.keyboardModule.highlight(e.key);
    
    app.currentPosition++;
    
    // Store typed text for comparison
    if (!app.typedText) app.typedText = '';
    app.typedText += e.key;
    
    renderText(); // Оптимизирован с DocumentFragment
    updateStats(); // Throttled - не обновляет DOM при каждом нажатии
    
    // Check if finished
    if (app.currentPosition >= app.currentText.length) {
        finishPractice();
    }
}

// Подсветка ошибки (мигание) - ОПТИМИЗИРОВАНА
function highlightError() {
    const display = DOM.get('textDisplay');
    if (!display) return;
    
    display.style.animation = 'shake 0.3s';
    setTimeout(() => {
        if (display) {
            display.style.animation = '';
        }
    }, 300);
}

// Update stats during practice - ОПТИМИЗИРОВАННАЯ с кэшированием DOM
const updateStats = throttle(function() {
    const elapsed = app.isPaused ? 0 : (Date.now() - app.startTime) / 1000;
    const minutes = elapsed / 60;
    
    // Кэшируем элементы
    const speedEl = DOM.get('currentSpeed');
    const accuracyEl = DOM.get('currentAccuracy');
    const timeEl = DOM.get('currentTime');
    const progressEl = DOM.get('currentProgress');
    const progressBar = DOM.get('progressBar');
    
    if (!speedEl || !accuracyEl || !timeEl || !progressEl || !progressBar) return;
    
    // Speed (characters per minute)
    const speed = minutes > 0 ? Math.round(app.currentPosition / minutes) : 0;
    if (speedEl.textContent !== String(speed)) {
        speedEl.textContent = speed;
    }
    
    // Accuracy
    const totalAttempts = app.currentPosition + app.errors;
    const accuracy = totalAttempts > 0 
        ? Math.round((app.currentPosition / totalAttempts) * 100) 
        : 100;
    if (accuracyEl.textContent !== String(accuracy)) {
        accuracyEl.textContent = accuracy;
    }
    
    // Time
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    if (timeEl.textContent !== timeStr) {
        timeEl.textContent = timeStr;
    }
    
    // Progress
    const progress = Math.round((app.currentPosition / app.totalChars) * 100);
    if (progressEl.textContent !== String(progress)) {
        progressEl.textContent = progress;
    }
    const progressWidth = progress + '%';
    if (progressBar.style.width !== progressWidth) {
        progressBar.style.width = progressWidth;
    }
}, 100); // Throttle to max 10 updates per second

// Stats timer for regular lessons - ОПТИМИЗИРОВАН с requestAnimationFrame
function startStatsTimer() {
    if (app.timerInterval) {
        clearInterval(app.timerInterval);
    }
    if (app.animationFrameId) {
        cancelAnimationFrame(app.animationFrameId);
    }
    
    let lastUpdate = 0;
    const update = (currentTime) => {
        if (app.isPaused) {
            app.animationFrameId = requestAnimationFrame(update);
            return;
        }
        
        if (currentTime - lastUpdate >= 1000) {
            const elapsed = (Date.now() - app.startTime) / 1000;
            const timeEl = DOM.get('currentTime');
            const speedEl = DOM.get('currentSpeed');
            
            if (timeEl) {
                const mins = Math.floor(elapsed / 60);
                const secs = Math.floor(elapsed % 60);
                const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
                if (timeEl.textContent !== timeStr) {
                    timeEl.textContent = timeStr;
                }
            }
            
            if (speedEl) {
                const minutes = elapsed / 60;
                const speed = minutes > 0 ? Math.round(app.currentPosition / minutes) : 0;
                if (speedEl.textContent !== String(speed)) {
                    speedEl.textContent = speed;
                }
            }
            
            lastUpdate = currentTime;
        }
        
        app.animationFrameId = requestAnimationFrame(update);
    };
    
    app.animationFrameId = requestAnimationFrame(update);
}

// Speed test timer - ОПТИМИЗИРОВАН с requestAnimationFrame
function startSpeedTestTimer() {
    if (app.timerInterval) {
        clearInterval(app.timerInterval);
    }
    if (app.animationFrameId) {
        cancelAnimationFrame(app.animationFrameId);
    }
    
    // Сохраняем начальное время и продолжительность
    app.speedTestStartTime = Date.now();
    app.speedTestEndTime = app.speedTestStartTime + (app.speedTestDuration * 1000);
    
    // Показываем начальное время
    const timeEl = DOM.get('currentTime');
    if (timeEl) {
        const mins = Math.floor(app.speedTestDuration / 60);
        const secs = app.speedTestDuration % 60;
        timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    const update = (currentTime) => {
        if (app.isPaused) {
            app.animationFrameId = requestAnimationFrame(update);
            return;
        }
        
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((app.speedTestEndTime - now) / 1000));
        
        if (remaining <= 0) {
            if (app.animationFrameId) {
                cancelAnimationFrame(app.animationFrameId);
                app.animationFrameId = null;
            }
            finishPractice();
            return;
        }
        
        const timeEl = DOM.get('currentTime');
        const speedEl = DOM.get('currentSpeed');
        
        if (timeEl) {
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
            if (timeEl.textContent !== timeStr) {
                timeEl.textContent = timeStr;
            }
        }
        
        if (speedEl) {
            const elapsed = (now - app.speedTestStartTime) / 1000;
            const minutes = elapsed / 60;
            const speed = minutes > 0 ? Math.round(app.currentPosition / minutes) : 0;
            if (speedEl.textContent !== String(speed)) {
                speedEl.textContent = speed;
            }
        }
        
        app.animationFrameId = requestAnimationFrame(update);
    };
    
    app.animationFrameId = requestAnimationFrame(update);
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
        
        const pauseBtn = DOM.get('pauseBtn');
        if (pauseBtn) {
            const span = pauseBtn.querySelector('span');
            if (span) span.textContent = translations[app.lang].pause;
        }
    } else {
        // Ставим на паузу
        app.isPaused = true;
        
        // Запоминаем время начала паузы для теста на скорость
        if (app.currentMode === 'speedtest') {
            app.pauseStartTime = Date.now();
        }
        
        const pauseBtn = DOM.get('pauseBtn');
        if (pauseBtn) {
            const span = pauseBtn.querySelector('span');
            if (span) span.textContent = translations[app.lang].resume;
        }
    }
}

// Restart practice
function restartPractice() {
    startPractice(app.currentText, app.currentMode, app.currentLesson);
}

// Exit practice - ОПТИМИЗИРОВАНА
function exitPractice() {
    // Сбрасываем паузу при выходе
    app.isPaused = false;
    
    if (app.timerInterval) {
        clearInterval(app.timerInterval);
        app.timerInterval = null;
    }
    
    if (app.animationFrameId) {
        cancelAnimationFrame(app.animationFrameId);
        app.animationFrameId = null;
    }
    
    // Останавливаем welcome звук если играет
    if (audioWelcome && !audioWelcome.paused) {
        audioWelcome.pause();
        audioWelcome.currentTime = 0;
    }
    
    if (app.currentLesson && currentLevelData) {
        showLessons();
        setTimeout(() => showLessonList(currentLevelData), 100);
    } else if (app.currentLesson) {
        showLessons();
    } else {
        showHome();
    }
}

// Finish practice - ОПТИМИЗИРОВАНА
async function finishPractice() {
    if (app.timerInterval) {
        clearInterval(app.timerInterval);
        app.timerInterval = null;
    }
    
    if (app.animationFrameId) {
        cancelAnimationFrame(app.animationFrameId);
        app.animationFrameId = null;
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
    const sessionData = {
        speed,
        accuracy,
        time: Math.round(elapsed),
        errors: app.errors,
        mode: app.currentMode === 'practice' && app.currentLesson ? 'lesson' : app.currentMode,
        layout: app.currentLayout,
        lessonKey: app.currentLesson?.key || null
    };
    
    window.statsModule.addSession(sessionData);
    
    // Save to user profile if logged in (async, не блокируем UI)
    const user = window.authModule?.getCurrentUser();
    if (user && window.authModule) {
        window.authModule.addUserSession(user.uid, sessionData).catch(err => {
            console.error('Failed to save session to profile:', err);
        });
    }
    
    // Show results modal
    showResults(speed, accuracy, elapsed, app.errors);
}

// Show results modal - ОПТИМИЗИРОВАНА
function showResults(speed, accuracy, time, errors) {
    const speedEl = DOM.get('resultSpeed');
    const accuracyEl = DOM.get('resultAccuracy');
    const timeEl = DOM.get('resultTime');
    const errorsEl = DOM.get('resultErrors');
    
    if (speedEl) speedEl.textContent = speed;
    if (accuracyEl) accuracyEl.textContent = accuracy;
    
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    if (timeEl) timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    if (errorsEl) errorsEl.textContent = errors;
    
    // Воспроизводим звук победы
    if (app.soundEnabled && audioVictory) {
        audioVictory.currentTime = 0;
        audioVictory.play().catch(() => {});
    }
    
    const modal = DOM.get('resultsModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

// Close results modal - ОПТИМИЗИРОВАНА
function closeResults() {
    const modal = DOM.get('resultsModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
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

// Toast notifications
function showToast(message, type = 'info', title = '') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

function t(key) {
    return translations[app.lang]?.[key] || key;
}

// ============================================
// AUTHENTICATION & PROFILE FUNCTIONS
// ============================================

let currentUserProfile = null;

// Auth state listener will be initialized in DOMContentLoaded

// Update user UI in header - ОПТИМИЗИРОВАНА
function updateUserUI(user, profile) {
    const profileBtn = DOM.get('userProfileBtn');
    const loginBtn = DOM.get('loginBtn');
    const userName = DOM.get('userName');
    const userAvatar = DOM.get('userAvatar');
    
    if (!profileBtn || !loginBtn || !userName || !userAvatar) return;
    
    profileBtn.classList.remove('hidden');
    loginBtn.classList.add('hidden');
    
    userName.textContent = profile?.username || profile?.displayName || user.displayName || 'User';
    
    // Используем аватар из профиля или первый по умолчанию
    const avatarURL = profile?.photoURL || user.photoURL || 
        (window.authModule?.AVAILABLE_AVATARS ? window.authModule.AVAILABLE_AVATARS[0] : '');
    
    if (avatarURL) {
        userAvatar.src = avatarURL;
        userAvatar.style.display = 'block';
        userAvatar.style.width = '32px';
        userAvatar.style.height = '32px';
        userAvatar.style.objectFit = 'cover';
        const placeholder = DOM.get('profilePhotoPlaceholder');
        if (placeholder) placeholder.style.display = 'none';
    } else {
        userAvatar.style.display = 'none';
        const placeholder = DOM.get('profilePhotoPlaceholder');
        if (placeholder) placeholder.style.display = 'flex';
    }
}

// Show login modal
function showLoginModal() {
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('loginModal').classList.add('flex');
    switchToLogin();
}

// Close login modal
function closeLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('loginModal').classList.remove('flex');
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('registerError').classList.add('hidden');
}

// Switch to login form
function switchToLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('authModalTitle').textContent = t('login');
    document.getElementById('loginError').classList.add('hidden');
}

// Switch to register form
function switchToRegister() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('authModalTitle').textContent = t('register');
    document.getElementById('registerError').classList.add('hidden');
}

// Handle login
async function handleLogin() {
    if (!window.authModule) {
        showToast('Система авторизации не загружена', 'error');
        return;
    }
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    if (!email || !password) {
        errorEl.textContent = t('fillAllFields');
        errorEl.classList.remove('hidden');
        return;
    }
    
    const result = await window.authModule.loginUser(email, password);
    
    if (result.success) {
        closeLoginModal();
        showToast(t('loginSuccess'), 'success');
    } else {
        errorEl.textContent = result.error || t('loginError');
        errorEl.classList.remove('hidden');
    }
}

// Handle register
async function handleRegister() {
    if (!window.authModule) {
        showToast('Система авторизации не загружена', 'error');
        return;
    }
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorEl = document.getElementById('registerError');
    
    if (!username || !email || !password) {
        errorEl.textContent = t('fillAllFields');
        errorEl.classList.remove('hidden');
        return;
    }
    
    if (password.length < 6) {
        errorEl.textContent = t('passwordTooShort');
        errorEl.classList.remove('hidden');
        return;
    }
    
    const result = await window.authModule.registerUser(email, password, username);
    
    if (result.success) {
        closeLoginModal();
        showToast(t('registerSuccess'), 'success');
    } else {
        errorEl.textContent = result.error || t('registerError');
        errorEl.classList.remove('hidden');
    }
}

// Logout user
async function logoutUser() {
    const result = await window.authModule.logoutUser();
    if (result.success) {
        currentUserProfile = null;
        showHome();
        showToast(t('logoutSuccess'), 'info');
    }
}

// Show profile screen
async function showProfile() {
    const user = window.authModule.getCurrentUser();
    if (!user) {
        showLoginModal();
        return;
    }
    
    hideAllScreens();
    document.getElementById('profileScreen').classList.remove('hidden');
    
    // Load profile data
    const profileResult = await window.authModule.getUserProfile(user.uid);
    if (profileResult.success) {
        currentUserProfile = profileResult.data;
        loadProfileData(profileResult.data);
    }
}

// Load profile data into UI - ОПТИМИЗИРОВАНА
function loadProfileData(profile) {
    const usernameEl = DOM.get('profileUsername');
    const emailEl = DOM.get('profileEmail');
    const bioEl = DOM.get('profileBio');
    
    if (usernameEl) usernameEl.textContent = profile.username || profile.displayName || 'User';
    if (emailEl) emailEl.textContent = profile.email || '';
    if (bioEl) bioEl.value = profile.bio || '';
    
    const photoEl = DOM.get('profilePhoto');
    const placeholderEl = DOM.get('profilePhotoPlaceholder');
    
    // Используем аватар из профиля или первый по умолчанию
    const avatarURL = profile.photoURL || 
        (window.authModule?.AVAILABLE_AVATARS ? window.authModule.AVAILABLE_AVATARS[0] : '');
    
    if (avatarURL && photoEl && placeholderEl) {
        photoEl.src = avatarURL;
        photoEl.style.display = 'block';
        photoEl.style.width = '128px';
        photoEl.style.height = '128px';
        photoEl.style.objectFit = 'cover';
        placeholderEl.style.display = 'none';
    } else if (photoEl && placeholderEl) {
        photoEl.style.display = 'none';
        placeholderEl.style.display = 'flex';
    }
    
    // Load statistics
    const stats = profile.stats || {};
    const bestSpeedEl = DOM.get('profileBestSpeed');
    const avgAccuracyEl = DOM.get('profileAvgAccuracy');
    const totalSessionsEl = DOM.get('profileTotalSessions');
    const completedLessonsEl = DOM.get('profileCompletedLessons');
    const totalErrorsEl = DOM.get('profileTotalErrors');
    const totalTimeEl = DOM.get('profileTotalTime');
    
    if (bestSpeedEl) bestSpeedEl.textContent = stats.bestSpeed || 0;
    if (avgAccuracyEl) avgAccuracyEl.textContent = (stats.averageAccuracy || 0) + '%';
    if (totalSessionsEl) totalSessionsEl.textContent = stats.totalSessions || 0;
    if (completedLessonsEl) completedLessonsEl.textContent = stats.completedLessons || 0;
    if (totalErrorsEl) totalErrorsEl.textContent = stats.totalErrors || 0;
    
    // Format total time
    if (totalTimeEl) {
        const totalMinutes = Math.floor((stats.totalTime || 0) / 60);
        const hours = Math.floor(totalMinutes / 60);
        totalTimeEl.textContent = hours > 0 ? hours + 'ч' : totalMinutes + 'м';
    }
}

// Save profile
async function saveProfile() {
    const user = window.authModule.getCurrentUser();
    if (!user) return;
    
    const bio = document.getElementById('profileBio').value;
    const username = document.getElementById('profileUsername').textContent;
    
    const updates = {
        bio: bio,
        username: username
    };
    
    const result = await window.authModule.updateUserProfile(user.uid, updates);
    
    if (result.success) {
        showToast(t('profileSaved'), 'success');
        currentUserProfile = { ...currentUserProfile, ...updates };
    } else {
        showToast(t('saveError'), 'error');
    }
}

// Show avatar selector modal
function showAvatarSelector() {
    const modal = DOM.get('avatarSelectorModal');
    if (!modal) return;
    
    const avatarGrid = DOM.get('avatarGrid');
    if (!avatarGrid) return;
    
    // Clear previous avatars
    avatarGrid.innerHTML = '';
    
    // Get current avatar index
    const currentAvatarIndex = currentUserProfile?.avatarIndex ?? 0;
    
    // Create avatar selection grid
    if (window.authModule && window.authModule.AVAILABLE_AVATARS) {
        window.authModule.AVAILABLE_AVATARS.forEach((avatarPath, index) => {
            const avatarItem = document.createElement('div');
            const isSelected = index === currentAvatarIndex;
            avatarItem.className = `relative cursor-pointer rounded-2xl overflow-hidden border-4 transition-all duration-300 group ${
                isSelected 
                    ? 'border-primary shadow-2xl shadow-primary/50 scale-105' 
                    : 'border-gray-700/50 hover:border-primary/70 hover:shadow-xl hover:shadow-primary/30'
            }`;
            
            // Gradient overlay for selected
            if (isSelected) {
                const overlay = document.createElement('div');
                overlay.className = 'absolute inset-0 bg-gradient-to-br from-primary/20 to-cyan-500/20 z-10';
                avatarItem.appendChild(overlay);
            }
            
            const img = document.createElement('img');
            img.src = avatarPath;
            img.alt = `Avatar ${index + 1}`;
            img.className = 'w-full h-full object-cover transition-transform duration-300 group-hover:scale-110';
            img.style.width = '100%';
            img.style.height = '200px';
            img.style.objectFit = 'cover';
            img.style.objectPosition = 'center';
            img.loading = 'lazy';
            
            avatarItem.appendChild(img);
            
            // Checkmark for selected avatar
            if (isSelected) {
                const checkmark = document.createElement('div');
                checkmark.className = 'absolute top-3 right-3 bg-gradient-to-r from-primary to-cyan-500 rounded-full p-2 shadow-lg z-20 animate-pulse';
                checkmark.innerHTML = '<svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>';
                avatarItem.appendChild(checkmark);
            }
            
            avatarItem.onclick = () => selectAvatar(index);
            avatarGrid.appendChild(avatarItem);
        });
    }
    
    // Убеждаемся что модальное окно поверх всего
    modal.style.zIndex = '9999';
    modal.style.position = 'fixed';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Закрытие при клике вне модального окна
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeAvatarSelector();
        }
    };
}

// Close avatar selector
function closeAvatarSelector() {
    const modal = DOM.get('avatarSelectorModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.onclick = null; // Убираем обработчик
    }
}

// Select avatar
async function selectAvatar(avatarIndex) {
    const user = window.authModule?.getCurrentUser();
    if (!user || !window.authModule) return;
    
    showToast(t('updatingAvatar'), 'info');
    
    const result = await window.authModule.updateProfileAvatar(user.uid, avatarIndex);
    
    if (result.success) {
        // Update profile photo display
        const profilePhoto = DOM.get('profilePhoto');
        const profilePlaceholder = DOM.get('profilePhotoPlaceholder');
        const userAvatar = DOM.get('userAvatar');
        
        if (profilePhoto) {
            profilePhoto.src = result.photoURL;
            profilePhoto.style.display = 'block';
            profilePhoto.style.width = '128px';
            profilePhoto.style.height = '128px';
            profilePhoto.style.objectFit = 'cover';
            profilePhoto.style.objectPosition = 'center';
        }
        if (profilePlaceholder) {
            profilePlaceholder.style.display = 'none';
        }
        if (userAvatar) {
            userAvatar.src = result.photoURL;
            userAvatar.style.display = 'block';
            userAvatar.style.width = '32px';
            userAvatar.style.height = '32px';
            userAvatar.style.objectFit = 'cover';
            userAvatar.style.objectPosition = 'center';
        }
        
        // Update current profile
        if (currentUserProfile) {
            currentUserProfile.photoURL = result.photoURL;
            currentUserProfile.avatarIndex = avatarIndex;
        }
        
        closeAvatarSelector();
        showToast(t('avatarUpdated'), 'success');
    } else {
        showToast(result.error || t('updateError'), 'error');
    }
}

// Show admin panel
async function showAdminPanel() {
    const user = window.authModule.getCurrentUser();
    if (!user) return;
    
    const isAdmin = await window.authModule.isAdmin(user.uid);
    if (!isAdmin) {
        showToast(t('accessDenied'), 'error');
        return;
    }
    
    hideAllScreens();
    document.getElementById('adminPanelScreen').classList.remove('hidden');
    refreshUsersList();
}

// Refresh users list
async function refreshUsersList() {
    const result = await window.authModule.getAllUsers();
    if (!result.success) {
        showToast(t('loadError'), 'error');
        return;
    }
    
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    result.users.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-700 hover:bg-gray-700/30';
        
        const lastLogin = user.lastLogin ? new Date(user.lastLogin.toDate()).toLocaleString() : 'Never';
        const stats = user.stats || {};
        
        row.innerHTML = `
            <td class="p-3">${user.username || user.displayName || 'N/A'}</td>
            <td class="p-3">${user.email || 'N/A'}</td>
            <td class="p-3">${user.country || 'Unknown'}</td>
            <td class="p-3 font-mono text-sm">${user.ip || 'N/A'}</td>
            <td class="p-3 text-sm">${lastLogin}</td>
            <td class="p-3">${stats.totalSessions || 0}</td>
            <td class="p-3">
                <button onclick="deleteUserFromAdmin('${user.id}')" class="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm">
                    ${t('delete')}
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Delete user from admin panel
async function deleteUserFromAdmin(uid) {
    if (!confirm(t('confirmDelete'))) return;
    
    const result = await window.authModule.deleteUser(uid);
    
    if (result.success) {
        showToast(t('userDeleted'), 'success');
        refreshUsersList();
    } else {
        showToast(t('deleteError'), 'error');
    }
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

// Room settings
let selectedWordCount = 50; // Default
let selectedTheme = 'random'; // Default
let selectedMultiplayerLang = 'ru'; // Default

// Show room settings
function showRoomSettings() {
    document.getElementById('multiplayerMainMenu').classList.add('hidden');
    document.getElementById('roomSettingsDialog').classList.remove('hidden');
    document.getElementById('joinRoomDialog').classList.add('hidden');
}

// Select multiplayer language
function selectMultiplayerLang(lang) {
    selectedMultiplayerLang = lang;
    // Update button styles
    document.querySelectorAll('.mp-lang-btn').forEach(btn => {
        const btnLang = btn.getAttribute('data-lang');
        const divs = btn.querySelectorAll('div');
        if (btnLang === lang) {
            btn.classList.add('border-warning', 'bg-warning/20');
            btn.classList.remove('border-transparent');
            divs.forEach(div => div.classList.add('text-white'));
        } else {
            btn.classList.remove('border-warning', 'bg-warning/20');
            btn.classList.add('border-transparent');
            divs.forEach(div => div.classList.remove('text-white'));
        }
    });
}

// Select theme
function selectTheme(theme) {
    selectedTheme = theme;
    // Update button styles
    document.querySelectorAll('.theme-btn').forEach(btn => {
        const btnTheme = btn.getAttribute('data-theme');
        const divs = btn.querySelectorAll('div');
        if (btnTheme === theme) {
            btn.classList.add('border-success', 'bg-success/20');
            btn.classList.remove('border-transparent');
            divs.forEach(div => div.classList.add('text-white'));
        } else {
            btn.classList.remove('border-success', 'bg-success/20');
            btn.classList.add('border-transparent');
            divs.forEach(div => div.classList.remove('text-white'));
        }
    });
}

// Hide room settings
function hideRoomSettings() {
    document.getElementById('roomSettingsDialog').classList.add('hidden');
    document.getElementById('multiplayerMainMenu').classList.remove('hidden');
}

// Select word count
function selectWordCount(count) {
    selectedWordCount = count;
    // Update button styles
    document.querySelectorAll('.room-setting-btn').forEach(btn => {
        const wordCount = parseInt(btn.getAttribute('data-words'));
        const divs = btn.querySelectorAll('div');
        if (wordCount === count) {
            btn.classList.add('border-primary', 'bg-primary/20');
            btn.classList.remove('border-transparent');
            divs.forEach(div => div.classList.add('text-white'));
        } else {
            btn.classList.remove('border-primary', 'bg-primary/20');
            btn.classList.add('border-transparent');
            divs.forEach(div => div.classList.remove('text-white'));
        }
    });
}

// Show join room dialog
function showJoinRoomDialog() {
    document.getElementById('multiplayerMainMenu').classList.add('hidden');
    document.getElementById('joinRoomDialog').classList.remove('hidden');
    document.getElementById('roomSettingsDialog').classList.add('hidden');
    document.getElementById('joinRoomCodeInput').value = '';
    document.getElementById('joinRoomError').classList.add('hidden');
}

// Hide join room dialog
function hideJoinRoomDialog() {
    document.getElementById('joinRoomDialog').classList.add('hidden');
    document.getElementById('multiplayerMainMenu').classList.remove('hidden');
}

// Create multiplayer room with settings
async function createMultiplayerRoomWithSettings() {
    try {
        window.secondPlayerNotified = false; // Сброс флага
        const roomCode = await window.multiplayerModule.createRoom(selectedWordCount, selectedTheme, selectedMultiplayerLang);
        
        hideRoomSettings();
        hideAllScreens();
        document.getElementById('multiplayerWaitingScreen').classList.remove('hidden');
        document.getElementById('multiplayerRoomCode').textContent = roomCode;
        app.currentMode = 'multiplayer-waiting';
        
        showToast(t('roomCreated'), 'success', t('multiplayer'));
        
    } catch (error) {
        console.error('Failed to create room:', error);
        showToast(error.message, 'error', t('errorCreatingRoom'));
    }
}

// Join multiplayer room
async function joinMultiplayerRoom() {
    const roomCode = document.getElementById('joinRoomCodeInput').value.trim().toUpperCase();
    
    if (!roomCode || roomCode.length !== 6) {
        document.getElementById('joinRoomError').textContent = t('invalidCode');
        document.getElementById('joinRoomError').classList.remove('hidden');
        return;
    }
    
    try {
        await window.multiplayerModule.joinRoom(roomCode);
        
        hideAllScreens();
        document.getElementById('multiplayerWaitingScreen').classList.remove('hidden');
        document.getElementById('multiplayerRoomCode').textContent = roomCode;
        app.currentMode = 'multiplayer-waiting';
        
        showToast(t('joinedRoom'), 'success', t('multiplayer'));
        
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
        showToast(t('leftRoom'), 'info', t('multiplayer'));
        showHome();
        // Восстанавливаем фон и частицы
        setRandomBackground();
        createParticles();
    } catch (error) {
        console.error('Failed to leave room:', error);
        showHome();
        setRandomBackground();
        createParticles();
    }
}

// Copy room code to clipboard
function copyRoomCode() {
    const roomCode = document.getElementById('multiplayerRoomCode').textContent;
    navigator.clipboard.writeText(roomCode).then(() => {
        showToast(`${t('codeCopied')}: ${roomCode}`, 'success');
    }).catch(() => {
        showToast('Ошибка копирования', 'error');
    });
}

// Multiplayer callbacks
// Render multiplayer text - ОПТИМИЗИРОВАНА с DocumentFragment
function renderMultiplayerText() {
    const display = DOM.get('multiplayerTextDisplay');
    if (!display) return;
    
    const WINDOW_SIZE = 60;
    const TYPED_VISIBLE = 10;
    
    const startPos = Math.max(0, app.currentPosition - TYPED_VISIBLE);
    const endPos = Math.min(app.currentText.length, startPos + WINDOW_SIZE);
    
    const fragment = document.createDocumentFragment();
    
    for (let i = startPos; i < endPos; i++) {
        const char = app.currentText[i];
        const span = document.createElement('span');
        
        if (i < app.currentPosition) {
            span.className = 'char-typed';
            const distanceFromCurrent = app.currentPosition - i;
            const opacity = Math.max(0.2, 1 - (distanceFromCurrent / TYPED_VISIBLE));
            span.style.opacity = opacity;
            span.style.fontSize = '0.9em';
        } else if (i === app.currentPosition) {
            span.className = 'char-current';
        } else {
            span.className = 'char-future';
        }
        
        if (char === ' ') {
            span.innerHTML = '&nbsp;';
        } else {
            span.textContent = char;
        }
        
        fragment.appendChild(span);
    }
    
    // Batch update
    display.innerHTML = '';
    display.appendChild(fragment);
}

window.onMultiplayerUpdate = (data) => {
    // Update player count
    if (data.playerCount) {
        const countEl = document.getElementById('multiplayerPlayerCount');
        if (countEl) {
            countEl.innerHTML = `<span class="text-success font-bold">${data.playerCount}</span> / <span class="text-gray-400">2</span> <span data-i18n="playersCount">${t('playersCount')}</span>`;
        }
        
        // Уведомление когда второй игрок подключился
        if (data.playerCount === 2 && !window.secondPlayerNotified) {
            window.secondPlayerNotified = true;
            showToast(t('playerJoined'), 'success', t('multiplayer'));
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
    renderMultiplayerText();
    
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
    if (!app.gameEnded) { // Показываем только если игра не закончилась
        showToast(t('opponentLeft'), 'warning', t('roomClosed'));
        setTimeout(() => {
            showHome();
            setRandomBackground();
            createParticles();
        }, 1500);
    }
};

window.onOpponentFinished = () => {
    if (!app.gameEnded) {
        app.gameEnded = true;
        document.removeEventListener('keydown', handleMultiplayerKeyPress);
        showToast(t('youLostMsg'), 'error', t('youLost'));
        setTimeout(() => returnToMultiplayerLobby(), 2500);
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
            renderMultiplayerText();
            updateMultiplayerProgress();
        }
        return;
    }
    
    const expectedChar = app.currentText[app.currentPosition];
    
    if (e.key === expectedChar) {
        // Correct
        app.currentPosition++;
        renderMultiplayerText();
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
    if (app.gameEnded) return; // Защита от повторного вызова
    
    app.gameEnded = true;
    document.removeEventListener('keydown', handleMultiplayerKeyPress);
    
    await window.multiplayerModule.finishGame();
    
    showToast(t('youWonMsg'), 'success', '🏆 ' + t('youWon'));
    setTimeout(() => {
        returnToMultiplayerLobby();
    }, 2500);
}

// Return to lobby after match
function returnToMultiplayerLobby() {
    window.multiplayerModule.resetGame();
    hideAllScreens();
    document.getElementById('multiplayerWaitingScreen').classList.remove('hidden');
    app.currentMode = 'multiplayer-waiting';
    app.gameEnded = false;
    window.secondPlayerNotified = false;
}

