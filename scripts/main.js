/**
 * TypeMaster - Main Application Logic
 * Typing trainer with lessons, free mode, and speed test
 */

// Иконка валюты — картинка монеты (money.png)
var COIN_ICON_IMG = '<img src="assets/images/money.png" alt="" class="coin-icon-img inline-block flex-shrink-0" width="20" height="20" style="vertical-align: middle;">';

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
    bgMusicEnabled: false,
    animationsEnabled: true,
    theme: 'dark',
    lang: 'ru',
    timerInterval: null,
    speedTestDuration: 60,
    speedTestWords: [],
    // Performance optimizations
    statsUpdatePending: false,
    lastStatsUpdate: 0,
    cachedDOM: {},
    animationFrameId: null,
    pendingLevelUp: null
};

// Streak (серия дней подряд с тренировкой)
const STREAK_KEY = 'zoobastiks_streak';
function streakDateStr(d) {
    d = d || new Date();
    return d.toISOString().slice(0, 10);
}
function getStreak() {
    try {
        var raw = localStorage.getItem(STREAK_KEY);
        if (!raw) return 0;
        var data = JSON.parse(raw);
        var last = data.lastDate;
        var count = data.count || 0;
        var today = streakDateStr();
        var yesterday = streakDateStr(new Date(Date.now() - 86400000));
        if (last === today) return count;
        if (last === yesterday) return count;
        return 0;
    } catch (_) { return 0; }
}
function updateStreak() {
    var today = streakDateStr();
    var yesterday = streakDateStr(new Date(Date.now() - 86400000));
    var data;
    try {
        var raw = localStorage.getItem(STREAK_KEY);
        data = raw ? JSON.parse(raw) : { lastDate: '', count: 0 };
    } catch (_) {
        data = { lastDate: '', count: 0 };
    }
    if (data.lastDate === today) return;
    if (data.lastDate === yesterday) {
        data.count = (data.count || 0) + 1;
    } else {
        data.count = 1;
    }
    data.lastDate = today;
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

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
let audioThemeTransition = null;
let audioDeniedMoney = null;
var bgMusicAudio = null;
var bgMusicTrackIndex = 0;
var bgMusicPausedAt = 0;
var bgMusicPausedTrackIndex = 0;
var BG_MUSIC_TRACKS = ['assets/sounds/violin.mp3', 'assets/sounds/violin_1.mp3'];
var BG_MUSIC_VOLUME = 0.06;
var SFX_VOLUME = 0.04; // 2–5% громкость всех эффектов
let audioSwipeAnimation = null;
let audioOnSound = null;
let audioOffSound = null;
let audioOpenShop = null;
let audioClickLanguage = null;
let audioBuyShop = null;
let audioOpenProfile = null;
let audioOpenAchievement = null;
let audioCompleteAdvanced = null;
let audioOpenTelegram = null;
let audioFeedback = null;
let audioClickMenu0 = null;
let audioClickMenu1 = null;
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
        siteLanguageLabel: 'Язык сайта',
        keyboardLayoutLabel: 'Раскладка',
        soundLabel: 'Звук вкл/выкл',
        themeLabel: 'Светлая/тёмная тема',
        yourProgress: 'Ваш прогресс',
        achievements: 'Достижения',
        rateSite: 'Оцените сайт',
        thanksForRating: 'Спасибо за оценку!',
        bestSpeed: 'Лучший результат',
        avgAccuracy: 'Средняя точность',
        completedLessons: 'Пройдено уроков',
        totalTime: 'Общее время',
        progressLessonsHint: 'все языки',
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
        words1000: 'слов',
        // Auth & Profile
        login: 'Войти',
        register: 'Зарегистрироваться',
        logout: 'Выйти',
        profile: 'Профиль',
        username: 'Логин',
        email: 'Email',
        password: 'Пароль',
        emailOptional: 'Email не обязателен',
        bio: 'О себе',
        save: 'Сохранить',
        statistics: 'Статистика',
        backgrounds: 'Фоны',
        backgroundsTip: 'Выберите фон для главного экрана. Новые фоны открываются за монеты.',
        chooseBackground: 'Выбрать фон',
        totalSessions: 'Всего сессий',
        totalErrors: 'Всего ошибок',
        loginSuccess: 'Вход выполнен успешно',
        level: 'Уровень',
        levelUp: 'Повышение уровня!',
        levelUpLabel: 'Уровень',
        levelRank: 'Ранг',
        levelUpCongrats: 'Продолжайте в том же духе!',
        tapToContinue: 'Нажмите чтобы продолжить',
        unlockAtLevel: 'Разблокируется на уровне',
        levelShort: 'Ур.',
        continue: 'Продолжить',
        allLevels: 'Все уровни',
        skip: 'Пропустить',
        next: 'Далее',
        onbTitle1: 'Добро пожаловать в Zoobastiks!',
        onbText1: 'Уроки, тест скорости и свободная печать - всё здесь. Короткий обзор за 3 шага.',
        onbTitle2: 'Уроки и режимы',
        onbText2: 'Карточки на главной: пошаговые уроки, свой текст по темам, тест на 60 секунд. Выбери и начни.',
        onbTitle3: 'Уровень и прогресс',
        onbText3: 'В шапке справа - твой уровень и XP. Занимайся чаще, получай опыт и открывай новые ранги. Удачи!',
        onbLetsGo: 'Погнали!',
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
        accessDenied: 'Доступ запрещён',
        // Shop
        shop: 'Магазин',
        shopTitle: 'Магазин уроков',
        allLanguages: 'Все языки',
        allCategories: 'Все категории',
        selectLessonLanguage: 'Выберите язык урока:',
        reward: 'Награда',
        rewardUpTo: 'Награда: до',
        coinsAtAccuracy: 'монет (при точности ≥90%)',
        purchased: 'Куплено',
        buy: 'Купить',
        notEnoughCoins: 'Недостаточно монет',
        startLesson: 'Начать урок',
        lessonPurchased: 'Урок успешно куплен!',
        purchaseError: 'Ошибка покупки',
        tipInsufficientCoins: 'Пройди уроки с точностью 90%+ — получай монеты!',
        shopTipEarn: 'Чем выше точность в уроках — тем больше монет в награду.',
        shopTipFocus: 'Меньше ошибок = больше награда. Целься в 90%+ точности!',
        shopTipDaily: 'Регулярные тренировки повышают скорость и приносят монеты.',
        shopTipFlip: 'Наведи на карточку — увидишь совет на обороте.',
        shopTipLevel: 'Сложнее урок — выше награда за прохождение.',
        // Animations
        toggleAnimations: 'Включить/выключить анимации',
        animationsOn: 'Анимации включены',
        animationsOff: 'Анимации выключены',
        // Free Mode
        cancel: 'Отмена',
        characters: 'символов',
        tip: '💡 Совет:',
        freeModeTip: 'Можно вставить текст из любого источника. Нажмите Ctrl+Enter для быстрого старта',
        textByTheme: 'Текст по теме:',
        loadRandomText: 'Случайный текст',
        themeMotivation: 'Мотивация',
        themeQuotes: 'Цитаты',
        themeFacts: 'Факты',
        themeHumor: 'Юмор',
        themeProverbs: 'Пословицы',
        // Footer
        footerDesc: 'Проект из эпохи нейросетей и квантовых вычислений. Тренируйся печатать быстрее скорости мысли.',
        neuralLink: 'Нейросвязь',
        establishConnection: 'Установить связь',
        contactDesc: 'Подключись к нейросети разработчика через квантовый канал связи',
        copyright: '© 2025 Zoobastiks. Все права защищены. Проект из будущего.',
        poweredBy: 'Работает на квантовых процессорах',
        statsVisits: 'Посещений:',
        copyResult: 'Скопировать результат',
        resultCopied: 'Результат скопирован в буфер',
        hotkeysHint: 'Esc — закрыть · Enter или R — повторить',
        streakDays: 'дней подряд',
        streakHint: 'Серия дней с тренировкой'
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
        siteLanguageLabel: 'Site language',
        keyboardLayoutLabel: 'Keyboard',
        soundLabel: 'Sound on/off',
        themeLabel: 'Light/dark theme',
        yourProgress: 'Your Progress',
        achievements: 'Achievements',
        rateSite: 'Rate site',
        thanksForRating: 'Thanks for your rating!',
        bestSpeed: 'Best Speed',
        avgAccuracy: 'Average Accuracy',
        completedLessons: 'Completed Lessons',
        totalTime: 'Total Time',
        progressLessonsHint: 'all languages',
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
        words1000: 'words',
        // Auth & Profile
        login: 'Login',
        register: 'Register',
        logout: 'Logout',
        profile: 'Profile',
        username: 'Username',
        email: 'Email',
        password: 'Password',
        emailOptional: 'Email is optional',
        bio: 'About me',
        save: 'Save',
        statistics: 'Statistics',
        backgrounds: 'Backgrounds',
        backgroundsTip: 'Choose a background for the main screen. New backgrounds unlock for coins.',
        chooseBackground: 'Choose background',
        totalSessions: 'Total Sessions',
        totalErrors: 'Total Errors',
        loginSuccess: 'Login successful',
        registerSuccess: 'Registration successful',
        logoutSuccess: 'Logout successful',
        level: 'Level',
        levelUp: 'Level Up!',
        levelUpLabel: 'Level',
        levelRank: 'Rank',
        levelUpCongrats: 'Keep up the great work!',
        tapToContinue: 'Tap to continue',
        unlockAtLevel: 'Unlock at level',
        levelShort: 'Lvl.',
        continue: 'Continue',
        allLevels: 'All levels',
        skip: 'Skip',
        next: 'Next',
        onbTitle1: 'Welcome to Zoobastiks!',
        onbText1: 'Lessons, speed test and free typing - all in one place. A quick 3-step overview.',
        onbTitle2: 'Lessons and modes',
        onbText2: 'Cards on the home screen: step-by-step lessons, themed texts, 60-second test. Pick one and start.',
        onbTitle3: 'Level and progress',
        onbText3: 'In the top right - your level and XP. Practice more, earn experience and unlock new ranks. Good luck!',
        onbLetsGo: "Let's go!",
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
        accessDenied: 'Access denied',
        // Shop
        shop: 'Shop',
        shopTitle: 'Lesson Shop',
        allLanguages: 'All Languages',
        allCategories: 'All Categories',
        selectLessonLanguage: 'Select lesson language:',
        reward: 'Reward',
        rewardUpTo: 'Reward: up to',
        coinsAtAccuracy: 'coins (at accuracy ≥90%)',
        purchased: 'Purchased',
        buy: 'Buy',
        notEnoughCoins: 'Not enough coins',
        startLesson: 'Start Lesson',
        lessonPurchased: 'Lesson purchased successfully!',
        purchaseError: 'Purchase error',
        tipInsufficientCoins: 'Complete lessons with 90%+ accuracy to earn coins!',
        shopTipEarn: 'Higher accuracy in lessons means more coins as reward.',
        shopTipFocus: 'Fewer errors = more reward. Aim for 90%+ accuracy!',
        shopTipDaily: 'Regular practice boosts speed and earns coins.',
        shopTipFlip: 'Hover over the card to see a tip on the back.',
        shopTipLevel: 'Harder lesson = bigger reward for completing it.',
        // Animations
        toggleAnimations: 'Toggle animations',
        animationsOn: 'Animations enabled',
        animationsOff: 'Animations disabled',
        // Free Mode
        cancel: 'Cancel',
        characters: 'characters',
        tip: '💡 Tip:',
        freeModeTip: 'You can paste text from any source. Press Ctrl+Enter to start quickly',
        textByTheme: 'Text by theme:',
        loadRandomText: 'Random text',
        themeMotivation: 'Motivation',
        themeQuotes: 'Quotes',
        themeFacts: 'Facts',
        themeHumor: 'Humor',
        themeProverbs: 'Proverbs',
        // Footer
        footerDesc: 'A project from the era of neural networks and quantum computing. Train to type faster than the speed of thought.',
        neuralLink: 'Neural Link',
        establishConnection: 'Establish Connection',
        contactDesc: 'Connect to the developer\'s neural network through a quantum communication channel',
        copyright: '© 2025 Zoobastiks. All rights reserved. Project from the future.',
        poweredBy: 'Powered by quantum processors',
        statsVisits: 'Visits:',
        copyResult: 'Copy result',
        resultCopied: 'Result copied to clipboard',
        hotkeysHint: 'Esc — close · Enter or R — repeat',
        streakDays: 'day streak',
        streakHint: 'Consecutive days with practice'
    }
};

// Speed test word lists (расширены для сильного разнообразия)
const speedTestWords = {
    ru: [
        'как', 'так', 'все', 'это', 'был', 'быть', 'может', 'нужно', 'она', 'они', 'мы', 'я', 'ты',
        'мой', 'твой', 'его', 'ее', 'их', 'что', 'когда', 'где', 'почему', 'зачем', 'потому', 'если',
        'год', 'день', 'ночь', 'утро', 'вечер', 'вчера', 'сегодня', 'завтра', 'сейчас', 'потом', 'раньше',
        'дом', 'квартира', 'комната', 'окно', 'дверь', 'стена', 'пол', 'потолок', 'стол', 'стул', 'лампа',
        'книга', 'тетрадь', 'ручка', 'карандаш', 'экран', 'клавиатура', 'мышь', 'телефон', 'наушники',
        'рука', 'нога', 'голова', 'спина', 'глаз', 'ухо', 'сердце', 'мозг', 'мысль', 'чувство',
        'мама', 'папа', 'друг', 'подруга', 'семья', 'ребенок', 'учитель', 'ученик', 'коллега', 'сосед',
        'вода', 'воздух', 'огонь', 'земля', 'снег', 'дождь', 'ветер', 'солнце', 'небо', 'земля', 'мир',
        'город', 'деревня', 'улица', 'парк', 'лес', 'река', 'море', 'озеро', 'гора', 'поле', 'дорога',
        'жизнь', 'время', 'дело', 'работа', 'школа', 'игра', 'урок', 'проект', 'задача', 'цель',
        'слово', 'язык', 'буква', 'звук', 'фраза', 'текст', 'строка', 'страница',
        'быстро', 'медленно', 'тихо', 'громко', 'далеко', 'близко', 'рядом', 'вместе', 'один', 'два',
        'новый', 'старый', 'маленький', 'большой', 'длинный', 'короткий', 'легкий', 'тяжелый', 'простой', 'сложный',
        'правда', 'ложь', 'вопрос', 'ответ', 'пример', 'память', 'опыт', 'навык', 'скорость', 'точность'
    ],
    en: [
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'we', 'they', 'he', 'she', 'it', 'all', 'can',
        'will', 'would', 'could', 'should', 'must', 'may', 'might', 'have', 'has', 'had', 'was', 'were',
        'one', 'two', 'three', 'time', 'day', 'night', 'morning', 'evening', 'today', 'yesterday', 'tomorrow',
        'now', 'soon', 'later', 'early', 'late', 'again', 'always', 'never', 'sometimes',
        'man', 'woman', 'child', 'friend', 'family', 'teacher', 'student', 'worker', 'player', 'user',
        'hand', 'head', 'back', 'face', 'eye', 'ear', 'heart', 'mind', 'thought', 'feeling',
        'new', 'old', 'good', 'bad', 'small', 'large', 'short', 'long', 'fast', 'slow', 'easy', 'hard',
        'home', 'room', 'door', 'window', 'table', 'chair', 'screen', 'keyboard', 'mouse', 'phone',
        'book', 'page', 'line', 'word', 'letter', 'text', 'code', 'error', 'result',
        'life', 'world', 'work', 'game', 'lesson', 'project', 'task', 'goal', 'skill', 'speed', 'accuracy',
        'water', 'air', 'fire', 'snow', 'rain', 'wind', 'sun', 'sky', 'river', 'mountain', 'city', 'street',
        'walk', 'run', 'move', 'think', 'type', 'learn', 'play', 'start', 'finish', 'press', 'hold', 'release'
    ],
    ua: [
        'як', 'так', 'все', 'це', 'був', 'бути', 'може', 'треба', 'вона', 'вони', 'ми', 'я', 'ти',
        'мій', 'твій', 'його', 'її', 'їхній', 'що', 'коли', 'де', 'чому', 'навіщо', 'тому', 'якщо',
        'рік', 'день', 'ніч', 'ранок', 'вечір', 'вчора', 'сьогодні', 'завтра', 'зараз', 'потім', 'раніше',
        'дім', 'квартира', 'кімната', 'вікно', 'двері', 'стіна', 'підлога', 'стеля', 'стіл', 'стілець', 'лампа',
        'книга', 'зошит', 'ручка', 'олівець', 'екран', 'клавіатура', 'миша', 'телефон', 'навушники',
        'рука', 'нога', 'голова', 'спина', 'око', 'вухо', 'серце', 'мозок', 'думка', 'почуття',
        'мама', 'тато', 'друг', 'подруга', 'родина', 'дитина', 'учитель', 'учень', 'колега', 'сусід',
        'вода', 'повітря', 'вогонь', 'земля', 'сніг', 'дощ', 'вітер', 'сонце', 'небо', 'світ',
        'місто', 'село', 'вулиця', 'парк', 'ліс', 'річка', 'море', 'озеро', 'гора', 'поле', 'дорога',
        'життя', 'час', 'справа', 'робота', 'школа', 'гра', 'урок', 'проєкт', 'завдання', 'мета',
        'слово', 'мова', 'літера', 'звук', 'фраза', 'текст', 'рядок', 'сторінка',
        'швидко', 'повільно', 'тихо', 'голосно', 'далеко', 'близько', 'поруч', 'разом', 'один', 'два',
        'новий', 'старий', 'маленький', 'великий', 'довгий', 'короткий', 'легкий', 'важкий', 'простий', 'складний',
        'правда', 'брехня', 'питання', 'відповідь', 'приклад', 'пам\'ять', 'досвід', 'навичка', 'швидкість', 'точність',
        'акція', 'продаж', 'покупка', 'замовлення', 'доставка', 'оплата', 'повернення', 'гарантія', 'сервіс', 'підтримка',
        'пошта', 'телефон', 'месенджер', 'скайп', 'відео', 'аудіо', 'фото', 'текст', 'стиль', 'дизайн', 'верстка', 'розробка',
        'програмування', 'фронтенд', 'бекенд', 'алгоритм', 'база даних', 'сервер', 'хост', 'домен', 'хостинг', 'ампелологія',
        'амбіція', 'завдання', 'мета', 'слово', 'мова', 'літера', 'звук', 'фраза', 'текст', 'рядок', 'сторінка', 'анімізм'
    ]
};

// Перемешивание массива (Fisher–Yates)
function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Current selected lesson language
let selectedLessonLang = 'ru';
let currentLevelData = null; // Сохраняем данные текущего уровня

// Расчёт награды за урок
function calculateLessonRewardCoins(lesson, accuracy, isFirstTime) {
    if (!lesson || accuracy < 90) return 0;
    
    // Определяем сложность
    let difficulty = lesson.difficulty;
    if (!difficulty || difficulty === 'easy') {
        if (lesson.key) {
            if (lesson.key.includes('advanced') || lesson.key.includes('hard')) {
                difficulty = 'hard';
            } else if (lesson.key.includes('medium')) {
                difficulty = 'medium';
            } else {
                difficulty = 'easy';
            }
        } else if (currentLevelData) {
            if (currentLevelData.level === 'advanced') difficulty = 'hard';
            else if (currentLevelData.level === 'medium') difficulty = 'medium';
            else difficulty = 'easy';
        } else {
            difficulty = 'easy';
        }
    }
    
    // Базовое начисление по сложности
    let baseCoins = 10; // easy / beginner
    if (difficulty === 'hard' || difficulty === 'advanced') baseCoins = 20;
    else if (difficulty === 'medium') baseCoins = 15;
    
    // Множитель за точность
    let multiplier = 1;
    if (accuracy >= 98) {
        multiplier = 1.5;
    } else if (accuracy >= 95) {
        multiplier = 1.2;
    } else {
        multiplier = 1.0;
    }
    
    let coins = Math.round(baseCoins * multiplier);
    
    // Повторные прохождения получают меньше
    if (!isFirstTime) {
        coins = Math.max(1, Math.round(coins * 0.25));
    }
    
    return coins;
}

// ——————————————— Фоны (покупка/выбор) ———————————————
var BACKGROUNDS = [
    { id: 'bg_dark_1', path: 'assets/images/background_black.jpg', theme: 'dark', cost: 0, name: 'Тёмный 1' },
    { id: 'bg_dark_2', path: 'assets/images/background_black_1.jpg', theme: 'dark', cost: 0, name: 'Тёмный 2' },
    { id: 'bg_dark_3', path: 'assets/images/background_black_2.jpg', theme: 'dark', cost: 0, name: 'Тёмный 3' },
    { id: 'bg_dark_4', path: 'assets/images/Background/background_black_3.jpg', theme: 'dark', cost: 30, name: 'Тёмный 4' },
    { id: 'bg_dark_5', path: 'assets/images/Background/background_black_4.jpg', theme: 'dark', cost: 30, name: 'Тёмный 5' },
    { id: 'bg_dark_6', path: 'assets/images/Background/background_black_5.jpg', theme: 'dark', cost: 30, name: 'Тёмный 6' },
    { id: 'bg_dark_7', path: 'assets/images/Background/background_black_6.jpg', theme: 'dark', cost: 30, name: 'Тёмный 7' },
    { id: 'bg_dark_8', path: 'assets/images/Background/background_black_7.jpg', theme: 'dark', cost: 30, name: 'Тёмный 8' },
    { id: 'bg_dark_9', path: 'assets/images/Background/background_black_8.jpg', theme: 'dark', cost: 30, name: 'Тёмный 9' },
    { id: 'bg_dark_10', path: 'assets/images/Background/background_black_9.jpg', theme: 'dark', cost: 30, name: 'Тёмный 10' },
    { id: 'bg_dark_11', path: 'assets/images/Background/background_black_10.jpg', theme: 'dark', cost: 30, name: 'Тёмный 11' },
    { id: 'bg_dark_12', path: 'assets/images/Background/background_black_11.jpg', theme: 'dark', cost: 30, name: 'Тёмный 12' },
    { id: 'bg_light_1', path: 'assets/images/background_white.jpg', theme: 'light', cost: 0, name: 'Светлый 1' },
    { id: 'bg_light_2', path: 'assets/images/background_white_1.jpg', theme: 'light', cost: 0, name: 'Светлый 2' },
    { id: 'bg_light_3', path: 'assets/images/background_white_2.jpg', theme: 'light', cost: 0, name: 'Светлый 3' },
    { id: 'bg_light_4', path: 'assets/images/Background/background_white_3.jpg', theme: 'light', cost: 30, name: 'Светлый 4' },
    { id: 'bg_light_5', path: 'assets/images/Background/background_white_4.jpg', theme: 'light', cost: 30, name: 'Светлый 5' },
    { id: 'bg_light_6', path: 'assets/images/Background/background_white_5.jpg', theme: 'light', cost: 30, name: 'Светлый 6' },
    { id: 'bg_light_7', path: 'assets/images/Background/background_white_6.jpg', theme: 'light', cost: 30, name: 'Светлый 7' },
    { id: 'bg_light_8', path: 'assets/images/Background/background_white_7.jpg', theme: 'light', cost: 30, name: 'Светлый 8' },
    { id: 'bg_light_9', path: 'assets/images/Background/background_white_8.jpg', theme: 'light', cost: 30, name: 'Светлый 9' },
    { id: 'bg_light_10', path: 'assets/images/Background/background_white_9.jpg', theme: 'light', cost: 30, name: 'Светлый 10' },
    { id: 'bg_light_11', path: 'assets/images/Background/background_white_10.jpg', theme: 'light', cost: 30, name: 'Светлый 11' }
];
var BG_STORAGE_UNLOCKED = 'zoobastiks_unlocked_backgrounds';
var BG_STORAGE_SELECTED_DARK = 'zoobastiks_selected_bg_dark';
var BG_STORAGE_SELECTED_LIGHT = 'zoobastiks_selected_bg_light';

function getUnlockedBackgroundIds() {
    try {
        var raw = localStorage.getItem(BG_STORAGE_UNLOCKED);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return BACKGROUNDS.filter(function(b) { return b.cost === 0; }).map(function(b) { return b.id; });
}

function setUnlockedBackgroundIds(ids) {
    try {
        localStorage.setItem(BG_STORAGE_UNLOCKED, JSON.stringify(ids));
    } catch (e) {}
}

function getSelectedBackgroundId(theme) {
    var key = theme === 'dark' ? BG_STORAGE_SELECTED_DARK : BG_STORAGE_SELECTED_LIGHT;
    try {
        var id = localStorage.getItem(key);
        if (id && BACKGROUNDS.some(function(b) { return b.id === id && b.theme === theme; })) return id;
    } catch (e) {}
    var forTheme = BACKGROUNDS.filter(function(b) { return b.theme === theme && b.cost === 0; });
    return forTheme.length ? forTheme[0].id : null;
}

function setSelectedBackgroundId(theme, id) {
    var key = theme === 'dark' ? BG_STORAGE_SELECTED_DARK : BG_STORAGE_SELECTED_LIGHT;
    try {
        localStorage.setItem(key, id || '');
    } catch (e) {}
}

function applyBackgroundToPage() {
    var theme = getCurrentTheme();
    var selectedId = getSelectedBackgroundId(theme);
    var unlocked = getUnlockedBackgroundIds();
    var bg = null;
    if (selectedId && unlocked.indexOf(selectedId) >= 0) {
        bg = BACKGROUNDS.find(function(b) { return b.id === selectedId; });
    }
    if (!bg) {
        var available = BACKGROUNDS.filter(function(b) { return b.theme === theme && unlocked.indexOf(b.id) >= 0; });
        bg = available.length ? available[Math.floor(Math.random() * available.length)] : BACKGROUNDS.find(function(b) { return b.theme === theme; });
        if (bg && !selectedId) setSelectedBackgroundId(theme, bg.id);
    }
    if (bg) {
        document.body.style.backgroundImage = "url('" + bg.path + "')";
        var preview = document.getElementById('profileCurrentBgPreview');
        if (preview) preview.style.backgroundImage = "url('" + bg.path + "')";
    }
}

// Background images setup (использует выбранный или случайный из открытых)
function setRandomBackground() {
    applyBackgroundToPage();
}

function updateProfileBgPreview() {
    var preview = document.getElementById('profileCurrentBgPreview');
    if (!preview) return;
    var theme = getCurrentTheme();
    var id = getSelectedBackgroundId(theme);
    var bg = id ? BACKGROUNDS.find(function(b) { return b.id === id; }) : BACKGROUNDS.find(function(b) { return b.theme === theme; });
    if (bg) preview.style.backgroundImage = "url('" + bg.path + "')";
}

function openBackgroundSelectorModal() {
    var modal = document.getElementById('backgroundSelectorModal');
    if (!modal) return;
    renderBackgroundSelectorGrid();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.onclick = function(e) { if (e.target === modal) closeBackgroundSelectorModal(); };
}

function closeBackgroundSelectorModal() {
    var modal = document.getElementById('backgroundSelectorModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.onclick = null;
    }
}

function getCurrentTheme() {
    return (typeof app !== 'undefined' && app.theme === 'dark') || document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function renderBackgroundSelectorGrid() {
    var grid = document.getElementById('backgroundSelectorGrid');
    if (!grid) return;
    var theme = getCurrentTheme();
    var unlocked = getUnlockedBackgroundIds();
    var selectedId = getSelectedBackgroundId(theme);
    grid.innerHTML = '';
    // Показываем только фоны текущей темы (тёмные при тёмной теме, светлые при светлой)
    BACKGROUNDS.filter(function(b) { return b.theme === theme; }).forEach(function(bg) {
        var unlocked_ = unlocked.indexOf(bg.id) >= 0;
        var selected = selectedId === bg.id;
        var card = document.createElement('div');
        card.className = 'profile-stat-tile rounded-xl overflow-hidden relative cursor-pointer transition-all duration-200 aspect-[4/3] min-h-0 ' +
            (selected ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900 dark:ring-offset-black' : '');
        var thumb = document.createElement('div');
        thumb.className = 'w-full h-full min-h-[100px] bg-cover bg-center';
        thumb.style.backgroundImage = "url('" + bg.path + "')";
        card.appendChild(thumb);
        var label = document.createElement('div');
        label.className = 'absolute bottom-0 left-0 right-0 py-1.5 px-2 text-xs font-medium truncate ' +
            (bg.theme === 'dark' ? 'text-white bg-black/60' : 'text-gray-900 bg-white/70');
        label.textContent = bg.name;
        card.appendChild(label);
        if (!unlocked_) {
            var lock = document.createElement('div');
            lock.className = 'absolute inset-0 flex flex-col items-center justify-center bg-black/60';
            lock.innerHTML = '<span class="text-2xl mb-1">🔒</span><span class="text-xs text-amber-400 font-semibold flex items-center justify-center gap-1">' + (bg.cost ? (bg.cost + ' ' + COIN_ICON_IMG) : '') + '</span>';
            card.appendChild(lock);
            card.onclick = function() { buyProfileBackground(bg.id); };
        } else {
            if (selected) {
                var check = document.createElement('div');
                check.className = 'absolute top-1 right-1 bg-cyan-500 rounded-full p-1';
                check.innerHTML = '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>';
                card.appendChild(check);
            }
            card.onclick = function() { selectProfileBackground(bg.id); };
        }
        grid.appendChild(card);
    });
}

function selectProfileBackground(backgroundId) {
    var bg = BACKGROUNDS.find(function(b) { return b.id === backgroundId; });
    if (!bg) return;
    var unlocked = getUnlockedBackgroundIds();
    if (unlocked.indexOf(backgroundId) < 0) return;
    setSelectedBackgroundId(bg.theme, backgroundId);
    applyBackgroundToPage();
    renderBackgroundSelectorGrid();
    updateProfileBgPreview();
    showToast((typeof t('profileSaved') !== 'undefined' ? t('profileSaved') : 'Сохранено') + ' — ' + bg.name, 'success');
}

function buyProfileBackground(backgroundId) {
    var bg = BACKGROUNDS.find(function(b) { return b.id === backgroundId; });
    if (!bg || bg.cost === 0) return;
    var user = window.authModule && window.authModule.getCurrentUser ? window.authModule.getCurrentUser() : null;
    if (!user) {
        showToast(typeof t('loginRequired') === 'string' ? t('loginRequired') : 'Войдите в аккаунт', 'info');
        return;
    }
    var balance = (user.balance != null ? user.balance : 0) || (window.authModule && window.authModule.getUserBalance ? window.authModule.getUserBalance(user.uid) : 0);
    if (balance < bg.cost) {
        if (typeof playDeniedMoneySound === 'function') playDeniedMoneySound();
        showToast(typeof t('notEnoughCoins') === 'string' ? t('notEnoughCoins') : 'Недостаточно монет', 'error');
        return;
    }
    var newBalance = balance - bg.cost;
    window.authModule.updateUserProfile(user.uid, { balance: newBalance }).then(function(result) {
        if (result && result.success) {
            var unlocked = getUnlockedBackgroundIds();
            if (unlocked.indexOf(backgroundId) < 0) unlocked.push(backgroundId);
            setUnlockedBackgroundIds(unlocked);
            if (currentUserProfile) currentUserProfile.balance = newBalance;
            var balanceEl = DOM.get('profileBalance');
            if (balanceEl) balanceEl.innerHTML = newBalance + ' ' + COIN_ICON_IMG;
            renderBackgroundSelectorGrid();
            updateProfileBgPreview();
            showToast(bg.name + ' — ' + (app.lang === 'en' ? 'Unlocked!' : 'Открыто!'), 'success');
        } else {
            showToast(result && result.error ? result.error : 'Ошибка', 'error');
        }
    }).catch(function() {
        showToast('Ошибка покупки', 'error');
    });
}

// Create floating particles effect
function createParticles() {
    // Не создаём частицы если анимации отключены
    if (!app.animationsEnabled) return;
    
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

// Onboarding (первый заход)
const ONBOARDING_STORAGE_KEY = 'zoobastiks_onboarding_seen';
var onboardingStep = 1;

function showOnboardingIfFirstVisit() {
    try {
        if (localStorage.getItem(ONBOARDING_STORAGE_KEY)) return;
    } catch (e) { return; }
    var overlay = document.getElementById('onboardingOverlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    overlay.style.visibility = 'visible';
    onboardingStep = 1;
    goToOnboardingStep(1);
}

function goToOnboardingStep(step) {
    onboardingStep = step;
    for (var i = 1; i <= 3; i++) {
        var slide = DOM.get('onboardingSlide' + i);
        var dot = DOM.get('onbDot' + i);
        if (slide) slide.classList.toggle('active', i === step);
        if (dot) dot.classList.toggle('active', i === step);
    }
    var nextBtn = DOM.get('onbNextBtn');
    var goBtn = DOM.get('onbGoBtn');
    if (nextBtn) nextBtn.classList.toggle('hidden', step === 3);
    if (goBtn) goBtn.classList.toggle('hidden', step !== 3);
}

function nextOnboardingStep() {
    if (onboardingStep < 3) goToOnboardingStep(onboardingStep + 1);
    else finishOnboarding();
}

function finishOnboarding() {
    try {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    } catch (e) {}
    var overlay = document.getElementById('onboardingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = '';
        overlay.style.visibility = '';
    }
    setRandomBackground();
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    app.isPaused = false;
    
    loadSettings();
    setRandomBackground();
    applyAnimationsSetting();
    initializeUI();
    updateTranslations();
    if (window.statsModule) window.statsModule.updateDisplay();
    if (window.achievementsModule) window.achievementsModule.render('achievementsBlock');
    if (window.levelModule) renderLevelBlock();
    if (window.keyboardModule) window.keyboardModule.render(app.currentLayout);
    initSiteRating();
    updateFooterBackground();
    
    // Неблокирующая инициализация: аудио и частицы после первого кадра
    setTimeout(function() {
        initializeAudio();
        createParticles();
    }, 0);
    
    setTimeout(showOnboardingIfFirstVisit, 700);
    
    // PWA: регистрация Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(function () {});
    }
    
    // Initialize auth state listener
    if (window.authModule) {
        window.authModule.onAuthStateChange(async (user) => {
            if (user) {
                // user уже полный объект из localStorage
                currentUserProfile = user;
                updateUserUI(user, user);
                
                const adminCheck = await window.authModule.isAdmin(user.uid);
                if (adminCheck) {
                    const adminBtn = DOM.get('adminBtn');
                    if (adminBtn) adminBtn.classList.remove('hidden');
                }
            } else {
                currentUserProfile = null;
                const profileBtn = DOM.get('userProfileBtn');
                const loginBtn = DOM.get('loginBtn');
                const adminBtn = DOM.get('adminBtn');
                const balanceDisplay = DOM.get('balanceDisplay');
                const shopBtn = DOM.get('shopBtn');
                if (profileBtn) profileBtn.classList.add('hidden');
                if (loginBtn) loginBtn.classList.remove('hidden');
                if (adminBtn) adminBtn.classList.add('hidden');
                if (balanceDisplay) balanceDisplay.classList.add('hidden');
                if (shopBtn) shopBtn.classList.add('hidden');
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
        audioThemeTransition = new Audio('assets/sounds/transition_theme.ogg');
        audioDeniedMoney = new Audio('assets/sounds/denied_money.ogg');
        audioSwipeAnimation = new Audio('assets/sounds/swipe_animation.ogg');
        audioOnSound = new Audio('assets/sounds/On_sound.ogg');
        audioOffSound = new Audio('assets/sounds/Off_sound.ogg');
        audioOpenShop = new Audio('assets/sounds/open_shop.ogg');
        audioClickLanguage = new Audio('assets/sounds/click_language.ogg');
        audioBuyShop = new Audio('assets/sounds/buy_shop_sound.ogg');
        audioOpenProfile = new Audio('assets/sounds/open_profile.ogg');
        audioOpenAchievement = new Audio('assets/sounds/open_achievement.ogg');
        audioCompleteAdvanced = new Audio('assets/sounds/complete_advanced.ogg');
        audioOpenTelegram = new Audio('assets/sounds/open_telegram.ogg');
        audioFeedback = new Audio('assets/sounds/feetback.ogg');
        audioClickMenu0 = new Audio('assets/sounds/click_menu_0.ogg');
        audioClickMenu1 = new Audio('assets/sounds/click_menu_1.ogg');
        
        // Set volumes (2–5% через SFX_VOLUME)
        if (audioClick) audioClick.volume = SFX_VOLUME;
        if (audioError) audioError.volume = SFX_VOLUME;
        if (audioWelcome) audioWelcome.volume = SFX_VOLUME;
        if (audioVictory) audioVictory.volume = SFX_VOLUME;
        if (audioThemeTransition) audioThemeTransition.volume = SFX_VOLUME;
        if (audioDeniedMoney) audioDeniedMoney.volume = SFX_VOLUME;
        if (audioSwipeAnimation) audioSwipeAnimation.volume = SFX_VOLUME;
        if (audioOnSound) audioOnSound.volume = SFX_VOLUME;
        if (audioOffSound) audioOffSound.volume = SFX_VOLUME;
        if (audioOpenShop) audioOpenShop.volume = SFX_VOLUME;
        if (audioClickLanguage) audioClickLanguage.volume = SFX_VOLUME;
        if (audioBuyShop) audioBuyShop.volume = SFX_VOLUME;
        if (audioOpenProfile) audioOpenProfile.volume = SFX_VOLUME;
        if (audioOpenAchievement) audioOpenAchievement.volume = SFX_VOLUME;
        if (audioCompleteAdvanced) audioCompleteAdvanced.volume = SFX_VOLUME;
        if (audioOpenTelegram) audioOpenTelegram.volume = SFX_VOLUME;
        if (audioFeedback) audioFeedback.volume = SFX_VOLUME;
        if (audioClickMenu0) audioClickMenu0.volume = SFX_VOLUME;
        if (audioClickMenu1) audioClickMenu1.volume = SFX_VOLUME;
    } catch (e) {
        console.log('Audio files not available, using fallback');
    }
}

// Play welcome sound once (на время воспроизведения приглушаем фоновую музыку)
function playWelcomeSound() {
    if (!welcomePlayed && app.soundEnabled && audioWelcome && app.currentMode === 'home') {
        var bgWasPlaying = bgMusicAudio && !bgMusicAudio.paused;
        if (bgWasPlaying) stopBgMusic();
        var onWelcomeEnd = function() {
            audioWelcome.removeEventListener('ended', onWelcomeEnd);
            if (app.bgMusicEnabled && bgWasPlaying) startBgMusic();
        };
        audioWelcome.addEventListener('ended', onWelcomeEnd);
        var playPromise = audioWelcome.play();
        if (playPromise !== undefined) {
            playPromise.then(function() {
                welcomePlayed = true;
            }).catch(function() {
                audioWelcome.removeEventListener('ended', onWelcomeEnd);
                if (bgWasPlaying && app.bgMusicEnabled) startBgMusic();
                var playOnInteraction = function() {
                    if (!welcomePlayed && audioWelcome && app.currentMode === 'home') {
                        var bgPlaying = bgMusicAudio && !bgMusicAudio.paused;
                        if (bgPlaying) stopBgMusic();
                        audioWelcome.addEventListener('ended', function() {
                            if (app.bgMusicEnabled && bgPlaying) startBgMusic();
                        });
                        audioWelcome.play().catch(function() {});
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
    const savedAnimations = localStorage.getItem('animations');
    
    if (savedTheme) {
        app.theme = savedTheme;
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        // Обновляем изображение футера при загрузке настроек
        updateFooterBackground();
    } else {
        // Если тема не сохранена, используем текущую и обновляем футер
        updateFooterBackground();
    }
    
    if (savedLang) app.lang = savedLang;
    try { document.documentElement.setAttribute('data-lang', app.lang || 'ru'); } catch (e) {}
    
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
    
    if (savedAnimations !== null) {
        app.animationsEnabled = savedAnimations === 'true';
        applyAnimationsSetting();
    }
    var savedBgMusic = localStorage.getItem('bgMusic');
    if (savedBgMusic !== null) app.bgMusicEnabled = savedBgMusic === 'true';
    updateBgMusicIcon();
    if (app.bgMusicEnabled) setTimeout(function() { startBgMusic(); }, 300);
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
    
    // Background music toggle
    const bgMusicToggle = DOM.get('bgMusicToggle');
    if (bgMusicToggle) bgMusicToggle.addEventListener('click', toggleBgMusic);
    
    // Animations toggle
    const animationsToggle = DOM.get('animationsToggle');
    if (animationsToggle) animationsToggle.addEventListener('click', toggleAnimations);
    
    // Keyboard input - используем passive для лучшей производительности
    document.addEventListener('keydown', handleKeyPress, { passive: false });
    // Global hotkeys: Esc — close modal, Enter/R — repeat when results open
    document.addEventListener('keydown', handleGlobalHotkeys);
}

function isInputFocused() {
    const el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

function isModalVisible(id) {
    const el = document.getElementById(id);
    return el && !el.classList.contains('hidden') && el.classList.contains('flex');
}

function isAnyModalVisible() {
    return isModalVisible('onboardingOverlay') || isModalVisible('levelUpTitr') || isModalVisible('levelUpModal') ||
        isModalVisible('levelListModal') || isModalVisible('resultsModal') || isModalVisible('freeModeModal') || isModalVisible('loginModal');
}

function closeTopModal() {
    if (isModalVisible('onboardingOverlay')) { finishOnboarding(); return; }
    if (isModalVisible('levelUpTitr')) { finishLevelUpTitr(); return; }
    if (isModalVisible('levelUpModal')) { closeLevelUpModal(); return; }
    if (isModalVisible('levelListModal')) { closeLevelListModal(); return; }
    if (isModalVisible('resultsModal')) { closeResults(); return; }
    if (isModalVisible('freeModeModal')) { closeFreeModeModal(); return; }
    if (isModalVisible('loginModal')) { closeLoginModal(); return; }
}

function handleGlobalHotkeys(e) {
    if (e.key === 'Escape') {
        if (isAnyModalVisible()) {
            closeTopModal();
        }
        return;
    }
    if (isInputFocused()) return;
    if (e.key === 'Enter') {
        if (isModalVisible('resultsModal')) { e.preventDefault(); repeatPractice(); return; }
        if (isModalVisible('levelUpModal')) { e.preventDefault(); closeLevelUpModal(); return; }
    }
    // Физическая клавиша R (KeyR) — работает при любой раскладке (RU/EN/UA).
    if (e.code === 'KeyR') {
        if (e.ctrlKey || e.metaKey) return;
        if (isModalVisible('resultsModal')) { e.preventDefault(); repeatPractice(); return; }
    }
}

// Update footer background image based on theme
function updateFooterBackground() {
    const footer = document.getElementById('footer');
    if (!footer) return;
    
    const isDark = app.theme === 'dark' || document.documentElement.classList.contains('dark');
    const imagePath = isDark 
        ? 'assets/images/contact_black.jpg' 
        : 'assets/images/contact_white.jpg';
    
    footer.style.backgroundImage = `url('${imagePath}')`;
}

// Theme toggle — короткий плавный переход фона и оверлея, остальное сразу
function toggleTheme() {
    if (app.soundEnabled && audioThemeTransition) {
        audioThemeTransition.currentTime = 0;
        audioThemeTransition.play().catch(() => {});
    }
    
    app.theme = app.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', app.theme === 'dark');
    localStorage.setItem('theme', app.theme);
    
    setRandomBackground();
    updateFooterBackground();
    
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
    if (app.soundEnabled && audioClickLanguage) {
        audioClickLanguage.currentTime = 0;
        audioClickLanguage.play().catch(() => {});
    }
    app.lang = app.lang === 'ru' ? 'en' : 'ru';
    localStorage.setItem('lang', app.lang);
    try { document.documentElement.setAttribute('data-lang', app.lang); } catch (e) {}
    const langEl = DOM.get('currentLang');
    if (langEl) langEl.textContent = app.lang.toUpperCase();
    updateTranslations();
}

// Layout toggle
function toggleLayout() {
    if (app.soundEnabled && audioClickLanguage) {
        audioClickLanguage.currentTime = 0;
        audioClickLanguage.play().catch(() => {});
    }
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

// Фоновая музыка (violin.mp3 ↔ violin_1.mp3 по кругу, продолжение с места паузы)
function startBgMusic() {
    if (!app.bgMusicEnabled || !BG_MUSIC_TRACKS.length) return;
    if (bgMusicAudio) {
        var trackIndex = bgMusicPausedTrackIndex;
        var seekTo = bgMusicPausedAt;
        bgMusicAudio.src = BG_MUSIC_TRACKS[trackIndex];
        bgMusicTrackIndex = trackIndex;
        bgMusicAudio.volume = BG_MUSIC_VOLUME;
        bgMusicAudio.currentTime = seekTo;
        bgMusicAudio.play().catch(function() {});
        return;
    }
    bgMusicAudio = new Audio(BG_MUSIC_TRACKS[0]);
    bgMusicAudio.volume = BG_MUSIC_VOLUME;
    bgMusicAudio.addEventListener('ended', function() {
        if (!app.bgMusicEnabled) return;
        bgMusicTrackIndex = (bgMusicTrackIndex + 1) % BG_MUSIC_TRACKS.length;
        bgMusicPausedTrackIndex = bgMusicTrackIndex;
        bgMusicPausedAt = 0;
        bgMusicAudio.src = BG_MUSIC_TRACKS[bgMusicTrackIndex];
        bgMusicAudio.play().catch(function() {});
    });
    bgMusicTrackIndex = 0;
    bgMusicPausedTrackIndex = 0;
    bgMusicPausedAt = 0;
    bgMusicAudio.src = BG_MUSIC_TRACKS[0];
    bgMusicAudio.play().catch(function() {});
}

function stopBgMusic() {
    if (bgMusicAudio) {
        bgMusicPausedAt = bgMusicAudio.currentTime;
        bgMusicPausedTrackIndex = bgMusicTrackIndex;
        bgMusicAudio.pause();
    }
}

function updateBgMusicIcon() {
    var icon = document.getElementById('bgMusicIcon');
    var btn = document.getElementById('bgMusicToggle');
    if (icon) {
        var path = 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z';
        icon.innerHTML = app.bgMusicEnabled ? '<path d="' + path + '"/>' : '<path d="' + path + '" opacity="0.5"/>';
    }
    if (btn) btn.disabled = !app.soundEnabled;
}

function toggleBgMusic() {
    app.bgMusicEnabled = !app.bgMusicEnabled;
    try { localStorage.setItem('bgMusic', app.bgMusicEnabled); } catch (e) {}
    updateBgMusicIcon();
    if (app.bgMusicEnabled) startBgMusic();
    else stopBgMusic();
}

// Sound toggle
function toggleSound() {
    app.soundEnabled = !app.soundEnabled;
    localStorage.setItem('sound', app.soundEnabled);
    if (app.soundEnabled && audioOnSound) {
        audioOnSound.currentTime = 0;
        audioOnSound.play().catch(() => {});
        if (app.bgMusicEnabled) startBgMusic();
    } else {
        stopBgMusic();
        if (audioOffSound) {
            audioOffSound.currentTime = 0;
            audioOffSound.play().catch(() => {});
        }
        if (audioWelcome) {
            audioWelcome.pause();
            audioWelcome.currentTime = 0;
        }
    }
    updateBgMusicIcon();
    var icon = DOM.get('soundIcon');
    if (icon) {
        if (app.soundEnabled) {
            icon.innerHTML = '<path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd" />';
        } else {
            icon.innerHTML = '<path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd" />';
        }
    }
}

// Apply animations setting to body
function applyAnimationsSetting() {
    if (app.animationsEnabled) {
        document.body.classList.remove('no-animations');
    } else {
        document.body.classList.add('no-animations');
        // Удаляем все частицы если анимации отключены
        const particles = document.querySelectorAll('.particle');
        particles.forEach(p => p.remove());
    }
    
    // Обновляем иконку
    const icon = DOM.get('animationsIcon');
    if (icon) {
        if (app.animationsEnabled) {
            // Иконка включенных анимаций (play/pause)
            icon.innerHTML = '<path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />';
        } else {
            // Иконка отключенных анимаций (стоп)
            icon.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" />';
        }
    }
}

// Animations toggle
function toggleAnimations() {
    if (app.soundEnabled && audioSwipeAnimation) {
        audioSwipeAnimation.currentTime = 0;
        audioSwipeAnimation.play().catch(() => {});
    }
    app.animationsEnabled = !app.animationsEnabled;
    localStorage.setItem('animations', app.animationsEnabled);
    applyAnimationsSetting();
    
    // Если анимации включили, создаём частицы
    if (app.animationsEnabled) {
        createParticles();
    }
    
    // Показываем уведомление
    const message = app.animationsEnabled 
        ? t('animationsOn') 
        : t('animationsOff');
    showToast(message, 'info', '');
}

// Update all translations
function updateTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[app.lang] && translations[app.lang][key]) {
            el.textContent = translations[app.lang][key];
        }
    });
    
    // Обновляем title атрибуты
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (translations[app.lang] && translations[app.lang][key]) {
            el.setAttribute('title', translations[app.lang][key]);
        }
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria-label');
        if (translations[app.lang] && translations[app.lang][key]) {
            el.setAttribute('aria-label', translations[app.lang][key]);
        }
    });
    updateResultsModalHotkeysHint();
    if (window.levelModule) renderLevelBlock();
    if (typeof window.__siteStatsUpdateUI === 'function' && typeof window.__siteStatsVisits !== 'undefined') {
        window.__siteStatsUpdateUI(window.__siteStatsVisits, window.__siteStatsOnline);
    }
}

// Navigation functions
// Show/hide footer
function toggleFooter(show) {
    const footer = document.getElementById('footer') || document.querySelector('footer');
    if (footer) {
        if (show) {
            footer.classList.remove('hidden');
        } else {
            footer.classList.add('hidden');
        }
    }
}

function showHome() {
    hideAllScreens();
    const homeScreen = DOM.get('homeScreen');
    if (homeScreen) homeScreen.classList.remove('hidden');
    app.currentMode = 'home';
    createParticles();
    toggleFooter(true); // Показываем футер на главной странице
    if (window.statsModule) window.statsModule.updateDisplay();
    if (window.achievementsModule) window.achievementsModule.render('achievementsBlock');
    if (window.levelModule) renderLevelBlock();
}

function showLessons() {
    playMenuClickSound();
    hideAllScreens();
    const lessonsScreen = DOM.get('lessonsScreen');
    if (lessonsScreen) lessonsScreen.classList.remove('hidden');
    app.currentMode = 'lessons';
    loadLessons();
    toggleFooter(false); // Скрываем футер в разделе уроков
}

const FREE_MODE_THEME_KEY = 'zoobastiks_free_mode_theme';

// Show free mode modal
function showFreeMode() {
    playMenuClickSound();
    const modal = DOM.get('freeModeModal');
    const textInput = DOM.get('freeModeTextInput');
    const themeSelect = DOM.get('freeModeThemeSelect');
    if (modal && textInput) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        textInput.value = '';
        if (themeSelect) {
            var saved = localStorage.getItem(FREE_MODE_THEME_KEY);
            if (saved && [].slice.call(themeSelect.options).some(function (o) { return o.value === saved; })) {
                themeSelect.value = saved;
            }
            themeSelect.removeEventListener('change', saveFreeModeTheme);
            themeSelect.addEventListener('change', saveFreeModeTheme);
        }
        textInput.focus();
        updateFreeModeCharCount();
        
        // Добавляем обработчик для подсчета символов
        textInput.addEventListener('input', updateFreeModeCharCount);
        
        // Закрытие по клику вне модального окна
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeFreeModeModal();
            }
        };
        
        // Закрытие по Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeFreeModeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
}

// Close free mode modal
function closeFreeModeModal() {
    const modal = DOM.get('freeModeModal');
    const textInput = DOM.get('freeModeTextInput');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    if (textInput) {
        textInput.removeEventListener('input', updateFreeModeCharCount);
    }
}

// Update character count in free mode modal
function updateFreeModeCharCount() {
    const textInput = DOM.get('freeModeTextInput');
    const charCount = DOM.get('freeModeCharCount');
    if (textInput && charCount) {
        charCount.textContent = textInput.value.length;
    }
}

function saveFreeModeTheme() {
    var select = DOM.get('freeModeThemeSelect');
    if (select) localStorage.setItem(FREE_MODE_THEME_KEY, select.value);
}

// Load a random text from the selected theme into free mode textarea
function loadThemedText() {
    var themes = window.THEMED_TEXTS;
    if (!themes) return;
    var lang = (app.lang === 'en') ? 'en' : 'ru';
    var data = themes[lang];
    if (!data) return;
    var select = DOM.get('freeModeThemeSelect');
    var themeId = select ? select.value : 'motivation';
    var theme = data[themeId];
    if (!theme || !theme.texts || theme.texts.length === 0) return;
    var text = theme.texts[Math.floor(Math.random() * theme.texts.length)];
    var textInput = DOM.get('freeModeTextInput');
    if (textInput) {
        textInput.value = text;
        updateFreeModeCharCount();
        textInput.focus();
    }
}

// Start free mode practice
function startFreeModePractice() {
    const textInput = DOM.get('freeModeTextInput');
    if (!textInput) return;
    
    const text = textInput.value.trim();
    if (!text) {
        showToast(t('enterYourText'), 'warning', '');
        textInput.focus();
        return;
    }
    
    if (text.length < 10) {
        const message = app.lang === 'ru' 
            ? 'Текст должен содержать минимум 10 символов' 
            : 'Text must contain at least 10 characters';
        showToast(message, 'warning', '');
        textInput.focus();
        return;
    }
    
    closeFreeModeModal();
    startPractice(text, 'free');
}

function showSpeedTest() {
    playMenuClickSound();
    const words = speedTestWords[app.currentLayout];
    
    // Если слов нет для текущей раскладки, используем английские
    if (!words || words.length === 0) {
        console.warn(`No speed test words for layout: ${app.currentLayout}, using English`);
        const fallbackWords = speedTestWords['en'] || [];
        const pool = shuffleArray(fallbackWords);
        const testWords = [];
        while (testWords.length < 100 && pool.length > 0) {
            testWords.push(pool.pop());
            if (pool.length === 0 && testWords.length < 100) {
                // Перемешиваем снова, если нужно добрать до 100 слов
                pool.push(...shuffleArray(fallbackWords));
            }
        }
        startPractice(testWords.join(' '), 'speedtest');
        return;
    }
    
    const testWords = [];
    let pool = shuffleArray(words);
    
    while (testWords.length < 100) {
        if (pool.length === 0) {
            pool = shuffleArray(words);
        }
        testWords.push(pool.pop());
    }
    
    startPractice(testWords.join(' '), 'speedtest');
}

function hideAllScreens() {
    const screens = [
        'homeScreen', 'lessonsScreen', 'practiceScreen',
        'multiplayerMenuScreen', 'multiplayerWaitingScreen', 'multiplayerGameScreen',
        'profileScreen', 'adminPanelScreen', 'shopScreen'
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
    
    // Получаем купленные уроки
    const user = window.authModule?.getCurrentUser();
    const purchasedLessons = user?.purchasedLessons || [];
    
    for (const level of levels) {
        const data = LESSONS_DATA[level];
        if (!data) continue;
        
        // Filter lessons by selected language
        let lessonsForLang = data.lessons.filter(l => l.layout === selectedLessonLang);
        
        // Добавляем купленные уроки из магазина
        if (window.shopModule && purchasedLessons.length > 0) {
            purchasedLessons.forEach(lessonId => {
                const shopLesson = window.shopModule.getLessonById(lessonId);
                if (shopLesson && shopLesson.layout === selectedLessonLang) {
                    // Определяем уровень сложности
                    let lessonLevel = 'beginner';
                    if (shopLesson.difficulty === 'hard') lessonLevel = 'advanced';
                    else if (shopLesson.difficulty === 'medium') lessonLevel = 'medium';
                    
                    // Добавляем только если это текущий уровень
                    if (lessonLevel === level) {
                        lessonsForLang.push({
                            ...shopLesson,
                            id: shopLesson.id,
                            isShopLesson: true
                        });
                    }
                }
            });
        }
        
        if (lessonsForLang.length === 0) continue;
        
        const card = document.createElement('div');
        card.className = `difficulty-card difficulty-card--${level}`;
        card.onclick = () => showLessonList({ ...data, lessons: lessonsForLang });
        
        const levelName = app.lang === 'ru' ? data.name_ru : data.name_en;
        const levelIcons = { beginner: '🌱', medium: '⚡', advanced: '🔥' };
        const levelNumbers = { beginner: '01', medium: '02', advanced: '03' };
        const lessonsLabel = app.lang === 'ru' ? 'уроков' : app.lang === 'en' ? 'lessons' : 'уроків';
        const badgeText = `${lessonsForLang.length} ${lessonsLabel.toUpperCase()}`;
        
        card.innerHTML = `
            <div class="difficulty-card__accent">
                <span class="difficulty-card__number">${levelNumbers[level]}</span>
            </div>
            <div class="difficulty-card__inner">
                <div class="difficulty-card__icon-wrap">
                    <span class="difficulty-card__icon">${levelIcons[level]}</span>
                </div>
                <h3 class="difficulty-card__title">${escapeHtml(levelName)}</h3>
                <span class="difficulty-card__badge">${badgeText}</span>
            </div>
        `;
        
        fragment.appendChild(card);
    }
    
    const titleEl = document.getElementById('lessonsScreenTitle');
    if (titleEl) titleEl.textContent = t('chooseDifficulty').toUpperCase();
    container.classList.add('difficulty-grid');
    container.innerHTML = '';
    container.appendChild(fragment);
}

// Show lesson list - ОПТИМИЗИРОВАНА с DocumentFragment
function showLessonList(levelData) {
    currentLevelData = levelData;
    const container = DOM.get('lessonsList');
    if (!container) return;
    
    const levelDisplayName = app.lang === 'en' ? levelData.name_en : levelData.name_ru;
    const titleEl = document.getElementById('lessonsScreenTitle');
    if (titleEl) titleEl.textContent = levelDisplayName.toUpperCase();
    
    container.classList.remove('difficulty-grid');
    // Используем DocumentFragment для batch updates
    const fragment = document.createDocumentFragment();
    
    levelData.lessons.forEach((lesson, index) => {
        // Для shop уроков используем другой ключ
        const lessonKey = lesson.isShopLesson 
            ? `shop_lesson_${lesson.id}` 
            : `lesson_${levelData.level}_${lesson.id}`;
        const lessonStats = window.statsModule.getLessonStats(lessonKey);
        
        let lessonDifficulty = lesson.difficulty;
        if (!lessonDifficulty || lessonDifficulty === 'easy') {
            if (levelData.level === 'advanced') lessonDifficulty = 'hard';
            else if (levelData.level === 'medium') lessonDifficulty = 'medium';
            else lessonDifficulty = 'easy';
        }
        let rewardCoins = 10;
        if (lessonDifficulty === 'hard' || lessonDifficulty === 'advanced') rewardCoins = 20;
        else if (lessonDifficulty === 'medium') rewardCoins = 15;
        
        const difficultyClass = lessonDifficulty === 'hard' || lessonDifficulty === 'advanced' ? 'hard' : lessonDifficulty === 'medium' ? 'medium' : 'easy';
        const card = document.createElement('div');
        card.className = `lesson-card lesson-card--${difficultyClass}`;
        card.onclick = () => startPractice(lesson.text, 'lesson', { ...lesson, key: lessonKey, difficulty: lessonDifficulty, level: levelData.level });
        
        let topBadge = '';
        if (lessonStats && lessonStats.completed) {
            topBadge = `<div class="lesson-card__done"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>✓</div>`;
        } else if (lesson.isShopLesson) {
            topBadge = `<div class="lesson-card__shop">Магазин</div>`;
        }
        
        let statsBlock = '';
        if (lessonStats && lessonStats.completed) {
            const accuracy = lessonStats.accuracy || 0;
            const accClass = accuracy >= 95 ? 'lesson-card__accuracy--high' : accuracy >= 85 ? 'lesson-card__accuracy--mid' : 'lesson-card__accuracy--low';
            const bestLabel = app.lang === 'ru' ? 'Лучший результат' : app.lang === 'en' ? 'Best result' : 'Найкращий результат';
            statsBlock = `<div class="lesson-card__stats"><span class="text-gray-500">${bestLabel}</span><span class="lesson-card__accuracy ${accClass}">${accuracy}%</span></div>`;
        }
        
        const difficultyLabel = lessonDifficulty === 'hard' || lessonDifficulty === 'advanced'
            ? (app.lang === 'ru' ? 'сложно' : app.lang === 'ua' ? 'складно' : 'hard')
            : lessonDifficulty === 'medium'
                ? (app.lang === 'ru' ? 'средне' : app.lang === 'ua' ? 'середньо' : 'medium')
                : (app.lang === 'ru' ? 'легко' : app.lang === 'ua' ? 'легко' : 'easy');
        
        const missionNum = String(index + 1).padStart(2, '0');
        card.innerHTML = `
            ${topBadge}
            <div class="lesson-card__accent">
                <span class="lesson-card__mission-num">${missionNum}</span>
            </div>
            <div class="lesson-card__body">
                <h4 class="lesson-card__title">${escapeHtml(lesson.name)}</h4>
                <p class="lesson-card__desc">${escapeHtml(lesson.description)}</p>
                <div class="lesson-card__tags">
                    <span class="lesson-card__tag lesson-card__tag--lang">${lesson.layout.toUpperCase()}</span>
                    <span class="lesson-card__tag lesson-card__tag--${difficultyClass}">${difficultyLabel}</span>
                </div>
                <div class="lesson-card__reward">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941a2.305 2.305 0 01-.567-.267C8.07 11.66 8 11.434 8 11c0-.114.07-.34.433-.582A2.305 2.305 0 019 10.151V8.151c-.22.071-.412.164-.567.267C8.07 8.66 8 8.886 8 9c0 .114.07.34.433.582.155.103.346.196.567.267v1.698a2.305 2.305 0 01-.567-.267C8.07 11.66 8 11.434 8 11c0-.114.07-.34.433-.582A2.305 2.305 0 019 10.151V8.151c.22.071.412.164.567.267C9.93 8.66 10 8.886 10 9c0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267v1.941a4.535 4.535 0 001.676-.662C11.398 9.765 12 8.99 12 8c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 009 5.092V3.151a2.305 2.305 0 01.567.267C9.93 3.66 10 3.886 10 4c0 .114-.07.34-.433.582A2.305 2.305 0 019 4.849v1.698z" clip-rule="evenodd"/></svg>
                <span>${t('rewardUpTo')} ${rewardCoins * 2} ${t('coinsAtAccuracy')}</span>
            </div>
                ${statsBlock}
            </div>
        `;
        
        fragment.appendChild(card);
    });
    
    // Batch update - один раз заменяем весь контент
    container.innerHTML = '';
    container.appendChild(fragment);
}

// Start practice - ОПТИМИЗИРОВАНА
function startPractice(text, mode, lesson = null) {
    toggleFooter(false); // Скрываем футер при начале практики
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
    // Фокус на body, чтобы нажатия клавиш сразу обрабатывались (особенно после «Повторить»).
    setTimeout(function () { document.body.focus(); }, 0);
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
    
    // Автоскролл к текущему символу
    const currentCharEl = display.querySelector('.char-current');
    if (currentCharEl) {
        currentCharEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    
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
    
    const sessionData = {
        speed,
        accuracy,
        time: Math.round(elapsed),
        errors: app.errors,
        mode: app.currentMode === 'practice' && app.currentLesson ? 'lesson' : app.currentMode,
        layout: app.currentLayout,
        lessonKey: app.currentLesson?.key || null
    };

    // Сначала проверяем «первый проход» ДО сохранения сессии (иначе урок уже помечен пройденным и награда считается как за повтор)
    let rewardCoins = 0;
    let isFirstTimeCompletion = false;
    if (app.currentLesson && (app.currentMode === 'lesson' || app.currentMode === 'practice')) {
        const lessonKey = app.currentLesson.key || `lesson_${app.currentLesson.id}`;
        const lessonStatsBefore = window.statsModule.getLessonStats(lessonKey);
        isFirstTimeCompletion = !lessonStatsBefore || !lessonStatsBefore.completed;
        rewardCoins = calculateLessonRewardCoins(app.currentLesson, accuracy, isFirstTimeCompletion);
    }
    
    window.statsModule.addSession(sessionData);
    updateStreak();
    if (window.levelModule) {
        var xp = window.levelModule.calculateSessionXP(sessionData);
        var xpResult = window.levelModule.addPlayerXP(xp);
        if (xpResult.leveledUp) app.pendingLevelUp = xpResult.newLevel;
    }
    var newlyAchievements = window.achievementsModule ? window.achievementsModule.checkAndNotify() : [];
    if (newlyAchievements && newlyAchievements.length > 0 && app.soundEnabled && audioCompleteAdvanced) {
        audioCompleteAdvanced.currentTime = 0;
        audioCompleteAdvanced.play().catch(() => {});
    }

    const user = window.authModule?.getCurrentUser();
    if (user && window.authModule) {
        window.authModule.addUserSession(user.uid, sessionData).catch(err => {
            console.error('Failed to save session to profile:', err);
        });
        
        if (rewardCoins > 0) {
            window.authModule.addCoins(user.uid, rewardCoins).then(result => {
                if (result.success) {
                    const updatedUser = window.authModule.getCurrentUser();
                    updateUserUI(updatedUser, updatedUser);
                    const message = isFirstTimeCompletion
                        ? `+${rewardCoins} ${app.lang === 'ru' ? 'монет за урок!' : app.lang === 'en' ? 'coins for lesson!' : 'монет за урок!'}`
                        : `+${rewardCoins} ${app.lang === 'ru' ? 'монет за повторное прохождение' : app.lang === 'en' ? 'coins for replay' : 'монет за повторне проходження'}`;
                    showToast(message, 'success', app.lang === 'ru' ? 'Баланс' : app.lang === 'en' ? 'Balance' : 'Баланс');
                } else {
                    console.error('Failed to add coins:', result.error);
                }
            }).catch(err => {
                console.error('Failed to add coins:', err);
            });
        }
        if (newlyAchievements && newlyAchievements.length > 0 && window.achievementsModule && window.achievementsModule.COINS_PER_ACHIEVEMENT) {
            var totalCoins = window.achievementsModule.COINS_PER_ACHIEVEMENT * newlyAchievements.length;
            window.authModule.addCoins(user.uid, totalCoins).then(function (result) {
                if (result.success) {
                    var updatedUser = window.authModule.getCurrentUser();
                    if (updatedUser) updateUserUI(updatedUser, updatedUser);
                    var msg = app.lang === 'en' ? '+' + totalCoins + ' coins for achievements!' : '+' + totalCoins + ' монет за достижения!';
                    showToast(msg, 'success', '🪙');
                }
            }).catch(function (err) { console.error('Achievement coins:', err); });
        }
    }
    
    showResults(speed, accuracy, elapsed, app.errors, rewardCoins);
}

// Last result data for copy to clipboard
let lastResultData = { speed: 0, accuracy: 0, time: 0, errors: 0 };

// Show results modal - ОПТИМИЗИРОВАНА. rewardCoins — уже посчитанная награда из finishPractice (чтобы не пересчитывать после addSession).
function showResults(speed, accuracy, time, errors, rewardCoins) {
    lastResultData = { speed, accuracy, time: Math.round(time), errors };
    const speedEl = DOM.get('resultSpeed');
    const accuracyEl = DOM.get('resultAccuracy');
    const timeEl = DOM.get('resultTime');
    const errorsEl = DOM.get('resultErrors');
    const rewardEl = DOM.get('resultReward');
    const rewardAmountEl = DOM.get('resultRewardAmount');
    
    if (speedEl) speedEl.textContent = speed;
    if (accuracyEl) accuracyEl.textContent = accuracy;
    
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    if (timeEl) timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    if (errorsEl) errorsEl.textContent = errors;
    
    if (rewardEl && rewardAmountEl) {
        const coins = rewardCoins !== undefined ? rewardCoins : (app.currentLesson && (app.currentMode === 'lesson' || app.currentMode === 'practice')
            ? (() => { const k = app.currentLesson.key || `lesson_${app.currentLesson.id}`; const s = window.statsModule.getLessonStats(k); return calculateLessonRewardCoins(app.currentLesson, accuracy, !s || !s.completed); })()
            : 0);
        if (coins > 0) {
            rewardAmountEl.textContent = `+${coins} ${app.lang === 'ru' ? 'монет' : app.lang === 'en' ? 'coins' : 'монет'}`;
            rewardEl.classList.remove('hidden');
        } else {
            rewardEl.classList.add('hidden');
        }
    } else if (rewardEl) {
        rewardEl.classList.add('hidden');
    }
    
    // Воспроизводим звук победы
    if (app.soundEnabled && audioVictory) {
        audioVictory.currentTime = 0;
        audioVictory.play().catch(() => {});
    }
    
    const modal = DOM.get('resultsModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        focusFirstInModal(modal);
    }
    updateResultsModalHotkeysHint();
}

function updateResultsModalHotkeysHint() {
    const el = document.getElementById('resultsHotkeysHint');
    if (el && translations[app.lang].hotkeysHint) el.textContent = translations[app.lang].hotkeysHint;
}

// Copy result to clipboard (for sharing)
function copyResultsToClipboard() {
    const d = lastResultData;
    const mins = Math.floor(d.time / 60);
    const secs = Math.floor(d.time % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    const site = 'Zoobastiks';
    const text = app.lang === 'en'
        ? `${site} — ${d.speed} cpm, ${d.accuracy}% accuracy, ${timeStr}, ${d.errors} errors`
        : `Zoobastiks — ${d.speed} зн/мин, точность ${d.accuracy}%, время ${timeStr}, ошибок ${d.errors}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
            showToast(t('resultCopied'), 'success', '');
        }).catch(function () {
            showToast('Copy failed', 'warning', '');
        });
    } else {
        showToast('Clipboard not available', 'warning', '');
    }
}

// Close results modal - ОПТИМИЗИРОВАНА. skipExit = true: только скрыть окно (для «Повторить»).
function closeResults(skipExit) {
    const modal = DOM.get('resultsModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    if (skipExit) return;
    if (app.pendingLevelUp) {
        showLevelUpSequence(app.pendingLevelUp);
        app.pendingLevelUp = null;
    } else {
        exitPractice();
    }
}

// Repeat practice — не вызываем exitPractice(), только скрываем модалку и перезапускаем раунд.
function repeatPractice() {
    closeResults(true);
    restartPractice();
    // Фокус на body, чтобы нажатия клавиш обрабатывались и раунд был активен.
    setTimeout(function () { document.body.focus(); }, 0);
}

// Level block and level-up modal
function renderLevelBlock() {
    if (!window.levelModule) return;
    var info = window.levelModule.getLevelInfo(window.levelModule.getPlayerXP());
    var levelNum = DOM.get('levelNumber');
    var tierName = DOM.get('levelTierName');
    var progressBar = DOM.get('levelProgressBar');
    var xpText = DOM.get('levelXPText');
    if (levelNum) levelNum.textContent = info.level;
    if (tierName) tierName.textContent = info.tierName;
    if (progressBar) progressBar.style.width = info.progressPct + '%';
    if (xpText) {
        if (info.xpToNext > 0) {
            xpText.textContent = info.xpInLevel + '/' + info.xpToNext;
        } else {
            xpText.textContent = info.totalXP;
        }
    }
    var levelBlock = DOM.get('levelBlock');
    if (levelBlock) {
        var tip = app.lang === 'en'
            ? 'Level ' + info.level + ' — ' + info.tierName + ' · ' + info.xpInLevel + '/' + info.xpToNext + ' XP to next'
            : 'Уровень ' + info.level + ' — ' + info.tierName + ' · ' + info.xpInLevel + '/' + info.xpToNext + ' XP до следующего';
        if (info.xpToNext <= 0) tip = app.lang === 'en' ? 'Level ' + info.level + ' — ' + info.tierName : 'Уровень ' + info.level + ' — ' + info.tierName;
        levelBlock.setAttribute('title', tip);
    }
    var streakEl = DOM.get('streakBadge');
    if (streakEl) {
        var streak = getStreak();
        var numEl = streakEl.querySelector ? streakEl.querySelector('.streak-number') : null;
        if (streak > 0) {
            if (numEl) numEl.textContent = streak; else streakEl.textContent = '\uD83D\uDD25 ' + streak;
            streakEl.title = (translations[app.lang].streakHint || 'Серия дней с тренировкой') + ': ' + streak + ' ' + (translations[app.lang].streakDays || 'дней подряд');
            streakEl.classList.remove('hidden');
        } else {
            streakEl.classList.add('hidden');
        }
    }
}

var levelUpTitrTimeout = null;
var levelUpTitrKeydown = null;

function finishLevelUpTitr() {
    var titr = DOM.get('levelUpTitr');
    if (titr) {
        titr.classList.add('hidden');
        titr.classList.remove('flex');
    }
    if (levelUpTitrTimeout) {
        clearTimeout(levelUpTitrTimeout);
        levelUpTitrTimeout = null;
    }
    if (levelUpTitrKeydown) {
        document.removeEventListener('keydown', levelUpTitrKeydown);
        levelUpTitrKeydown = null;
    }
    var level = app.levelUpTitrLevel;
    if (level != null) {
        app.levelUpTitrLevel = null;
        showLevelUpModal(level);
    }
}

function showLevelUpSequence(level) {
    if (level == null) level = (window.levelModule && window.levelModule.getLevelInfo(window.levelModule.getPlayerXP()).level) + 1;
    app.levelUpTitrLevel = level;
    var titr = DOM.get('levelUpTitr');
    var numEl = DOM.get('levelUpTitrNumber');
    var rankEl = DOM.get('levelUpTitrRank');
    if (numEl) numEl.textContent = level;
    if (rankEl && window.levelModule) {
        rankEl.textContent = window.levelModule.getTierName(level);
    }
    if (titr) {
        titr.classList.remove('hidden');
        titr.classList.add('flex');
    }
    if (app.soundEnabled && audioVictory) {
        audioVictory.currentTime = 0;
        audioVictory.play().catch(function() {});
    }
    levelUpTitrTimeout = setTimeout(finishLevelUpTitr, 2500);
    levelUpTitrKeydown = function (e) {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            finishLevelUpTitr();
        }
    };
    document.addEventListener('keydown', levelUpTitrKeydown);
}

function showLevelUpModal(level) {
    var modal = DOM.get('levelUpModal');
    var numEl = DOM.get('levelUpNumber');
    if (numEl) numEl.textContent = level;
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        focusFirstInModal(modal);
    }
}

function closeLevelUpModal() {
    var modal = DOM.get('levelUpModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    exitPractice();
}

function toggleLevelListModal() {
    var modal = DOM.get('levelListModal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
        // Звук сразу по клику (как playMenuClickSound — через новый Audio для надёжного воспроизведения)
        if (app.soundEnabled) {
            try {
                var snd = audioOpenAchievement ? audioOpenAchievement.cloneNode() : new Audio('assets/sounds/open_achievement.ogg');
                snd.volume = SFX_VOLUME;
                snd.currentTime = 0;
                snd.play().catch(function() {});
            } catch (e) {}
        }
        fillLevelListModal();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        focusFirstInModal(modal);
        document.addEventListener('click', levelListModalOutsideClick);
        document.addEventListener('keydown', levelListModalEscape);
    } else {
        closeLevelListModal();
    }
}

function levelListModalOutsideClick(e) {
    var modal = DOM.get('levelListModal');
    var block = DOM.get('levelBlock');
    if (!modal || !block) return;
    if (modal.contains(e.target) || block.contains(e.target)) return;
    closeLevelListModal();
    document.removeEventListener('click', levelListModalOutsideClick);
}

function levelListModalEscape(e) {
    if (e.key === 'Escape') {
        closeLevelListModal();
        document.removeEventListener('keydown', levelListModalEscape);
    }
}

function closeLevelListModal() {
    var modal = DOM.get('levelListModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    document.removeEventListener('click', levelListModalOutsideClick);
    document.removeEventListener('keydown', levelListModalEscape);
}

function fillLevelListModal() {
    var listEl = DOM.get('levelListModalBody');
    if (!listEl || !window.levelModule) return;
    var current = window.levelModule.getLevelInfo(window.levelModule.getPlayerXP()).level;
    var getTier = window.levelModule.getTierName;
    var getXP = window.levelModule.getXPThreshold;
    var lang = (typeof app !== 'undefined' && app.lang === 'en') ? 'en' : 'ru';
    var html = '<div class="level-list-scroll space-y-1.5 max-h-[60vh] pr-1">';
    for (var lvl = 1; lvl <= 50; lvl++) {
        var tier = getTier(lvl);
        var xpFrom = getXP(lvl);
        var xpTo = getXP(lvl + 1);
        var isCurrent = lvl === current;
        var xpText = lvl === 1 ? '0 XP' : xpFrom + ' – ' + xpTo + ' XP';
        var cls = isCurrent ? 'bg-amber-500/25 border-amber-500/50 shadow-sm shadow-amber-500/10' : 'bg-white/5 border-white/10 hover:bg-white/8';
        var numCls = isCurrent ? 'text-amber-400' : 'text-gray-300 dark:text-gray-400';
        var tierCls = isCurrent ? 'text-amber-200' : 'text-gray-400 dark:text-gray-500';
        html += '<div class="flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors ' + cls + '">';
        html += '<span class="font-bold tabular-nums w-8 ' + numCls + '">' + lvl + '</span>';
        html += '<span class="text-sm flex-1 truncate mx-2 ' + tierCls + '">' + tier + '</span>';
        html += '<span class="text-xs text-gray-500 dark:text-gray-500 tabular-nums shrink-0">' + xpText + '</span></div>';
    }
    html += '</div>';
    listEl.innerHTML = html;
}

// Play sound
function playSound(type) {
    if (!app.soundEnabled) return;
    
    try {
        if (type === 'correct' && audioClick) {
            const sound = audioClick.cloneNode();
            sound.volume = SFX_VOLUME;
            sound.play().catch(() => {});
        } else if (type === 'error' && audioError) {
            const sound = audioError.cloneNode();
            sound.volume = SFX_VOLUME;
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
                gainNode.gain.value = SFX_VOLUME;
            } else {
                oscillator.frequency.value = 200;
                gainNode.gain.value = SFX_VOLUME;
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

    const iconEl = document.createElement('div');
    iconEl.className = 'toast-icon';
    iconEl.textContent = icons[type] || icons.info;

    const contentEl = document.createElement('div');
    contentEl.className = 'toast-content';

    if (title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'toast-title';
        titleEl.textContent = title;
        contentEl.appendChild(titleEl);
    }

    const messageEl = document.createElement('div');
    messageEl.className = 'toast-message';
    messageEl.textContent = message;
    contentEl.appendChild(messageEl);

    toast.appendChild(iconEl);
    toast.appendChild(contentEl);
    
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
    const balanceDisplay = DOM.get('balanceDisplay');
    const userBalance = DOM.get('userBalance');
    const shopBtn = DOM.get('shopBtn');
    
    if (!profileBtn || !loginBtn || !userName || !userAvatar) return;
    
    profileBtn.classList.remove('hidden');
    loginBtn.classList.add('hidden');
    if (balanceDisplay) balanceDisplay.classList.remove('hidden');
    if (shopBtn) shopBtn.classList.remove('hidden');
    
    // user теперь объект из localStorage
    const displayUser = profile || user;
    userName.textContent = displayUser?.username || displayUser?.displayName || 'User';
    
    // Обновляем баланс
    if (userBalance && displayUser) {
        const balance = displayUser.balance || 0;
        userBalance.textContent = balance;
    }
    
    // Используем аватар из профиля или первый по умолчанию
    const avatarURL = displayUser?.photoURL || 
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

// Доступность: фокус на первый фокусируемый элемент в модалке
function focusFirstInModal(modal) {
    if (!modal) return;
    var focusable = modal.querySelector('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (focusable) setTimeout(function () { focusable.focus(); }, 0);
}

// Show login modal
function showLoginModal() {
    var modal = document.getElementById('loginModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    switchToLogin();
    focusFirstInModal(modal);
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
    
    const username = DOM.get('loginUsername')?.value || '';
    const password = DOM.get('loginPassword')?.value || '';
    const errorEl = DOM.get('loginError');
    
    if (!username || !password) {
        if (errorEl) {
            errorEl.textContent = t('fillAllFields');
            errorEl.classList.remove('hidden');
        }
        return;
    }
    
    const result = await window.authModule.loginUser(username, password);
    
    if (result.success) {
        closeLoginModal();
        showToast(t('loginSuccess'), 'success');
    } else {
        if (errorEl) {
            errorEl.textContent = result.error || t('loginError');
            errorEl.classList.remove('hidden');
        }
    }
}

// Handle register
async function handleRegister() {
    if (!window.authModule) {
        showToast('Система авторизации не загружена', 'error');
        return;
    }
    
    const username = DOM.get('registerUsername')?.value || '';
    const password = DOM.get('registerPassword')?.value || '';
    const errorEl = DOM.get('registerError');
    
    if (!username || !password) {
        if (errorEl) {
            errorEl.textContent = t('fillAllFields');
            errorEl.classList.remove('hidden');
        }
        return;
    }
    
    if (username.length < 3) {
        if (errorEl) {
            errorEl.textContent = 'Логин должен быть не менее 3 символов';
            errorEl.classList.remove('hidden');
        }
        return;
    }
    
    if (password.length < 6) {
        if (errorEl) {
            errorEl.textContent = t('passwordTooShort');
            errorEl.classList.remove('hidden');
        }
        return;
    }
    
    // Email не обязателен, передаём пустую строку
    const result = await window.authModule.registerUser(username, password, '');
    
    if (result.success) {
        closeLoginModal();
        showToast(t('registerSuccess'), 'success');
    } else {
        if (errorEl) {
            errorEl.textContent = result.error || t('registerError');
            errorEl.classList.remove('hidden');
        }
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
    toggleFooter(false); // Скрываем футер в профиле
    const user = window.authModule.getCurrentUser();
    if (!user) {
        showLoginModal();
        return;
    }
    if (app.soundEnabled && audioOpenProfile) {
        audioOpenProfile.currentTime = 0;
        audioOpenProfile.play().catch(() => {});
    }
    hideAllScreens();
    const profileScreen = DOM.get('profileScreen');
    if (profileScreen) profileScreen.classList.remove('hidden');
    
    // user уже полный объект из localStorage
    currentUserProfile = user;
    loadProfileData(user);
    updateProfileBgPreview();
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
    
    // Level, tier, balance, XP bar (2090 profile)
    var levelInfo = window.levelModule ? window.levelModule.getLevelInfo(window.levelModule.getPlayerXP()) : { level: 1, tierName: '—', progressPct: 0, xpInLevel: 0, xpToNext: 100 };
    var tierEl = DOM.get('profileTierName');
    var levelEl = DOM.get('profileLevelNumber');
    var balanceEl = DOM.get('profileBalance');
    var xpBarEl = DOM.get('profileXPBar');
    var xpLabelEl = DOM.get('profileXPLabel');
    if (tierEl) tierEl.textContent = levelInfo.tierName || '—';
    if (levelEl) levelEl.textContent = levelInfo.level || 1;
    if (balanceEl) balanceEl.innerHTML = (profile.balance != null ? profile.balance : 0) + ' ' + COIN_ICON_IMG;
    if (xpBarEl) xpBarEl.style.width = (levelInfo.progressPct != null ? levelInfo.progressPct : 0) + '%';
    if (xpLabelEl) xpLabelEl.textContent = (levelInfo.xpInLevel != null ? levelInfo.xpInLevel : 0) + ' / ' + (levelInfo.xpToNext != null ? levelInfo.xpToNext : 300) + ' XP';
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
    
    avatarGrid.innerHTML = '';
    
    // Всегда 20 аватаров: из auth или собираем сами (на случай кэша)
    var base = 'assets/images/profile photo/profile_';
    var avatars = [];
    var unlockLevels = [0, 0, 0, 5, 5, 10, 12, 12, 15, 15, 18, 18, 21, 21, 24, 24, 27, 27, 30, 30];
    var fromAuth = (window.authModule && window.authModule.AVAILABLE_AVATARS) ? window.authModule.AVAILABLE_AVATARS : [];
    for (var i = 0; i < 20; i++) {
        avatars.push(fromAuth[i] || (i === 0 ? base + '1.png' : base + (i + 1) + '.jpg'));
    }
    if (window.authModule && window.authModule.AVATAR_UNLOCK_LEVELS && window.authModule.AVATAR_UNLOCK_LEVELS.length >= 20) {
        unlockLevels = window.authModule.AVATAR_UNLOCK_LEVELS.slice(0, 20);
    }
    var currentAvatarIndex = currentUserProfile?.avatarIndex ?? 0;
    var currentLevel = window.levelModule ? window.levelModule.getLevelInfo(window.levelModule.getPlayerXP()).level : 1;

    avatars.forEach(function(avatarPath, index) {
        var requiredLevel = unlockLevels[index] ?? 0;
        var isLocked = requiredLevel > 0 && currentLevel < requiredLevel;
        var isSelected = index === currentAvatarIndex && !isLocked;

        var avatarItem = document.createElement('div');
        avatarItem.className = 'avatar-card relative overflow-hidden transition-all duration-200 group ' +
            (isLocked ? 'avatar-card--locked cursor-not-allowed' : 'cursor-pointer') +
            (isSelected ? ' avatar-card--selected' : '');

        var img = document.createElement('img');
        img.src = avatarPath;
        img.alt = 'Avatar ' + (index + 1);
        img.loading = 'lazy';
        img.onerror = function() {
            this.style.background = 'rgba(255,255,255,0.08)';
            this.alt = '?';
            this.onerror = null;
        };
        avatarItem.appendChild(img);

        if (isSelected) {
            var overlay = document.createElement('div');
            overlay.className = 'absolute inset-0 bg-gradient-to-br from-cyan-500/15 to-transparent pointer-events-none z-10';
            avatarItem.appendChild(overlay);
            var checkmark = document.createElement('div');
            checkmark.className = 'absolute top-1 right-1 bg-cyan-500/90 rounded-full p-1 z-20';
            checkmark.innerHTML = '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>';
            avatarItem.appendChild(checkmark);
        }

        if (isLocked) {
            var lockOverlay = document.createElement('div');
            lockOverlay.className = 'absolute inset-0 flex flex-col items-center justify-center bg-black/55 z-20 avatar-lock-overlay';
            var shortLabel = (typeof t('levelShort') === 'string' ? t('levelShort') : 'Ур.') + ' ' + requiredLevel;
            lockOverlay.innerHTML = '<span class="text-xl mb-0.5">🔒</span><span class="avatar-lock-text text-amber-400 font-semibold">' + shortLabel + '</span>';
            avatarItem.appendChild(lockOverlay);
            avatarItem.onclick = function() { showToast(t('unlockAtLevel') + ' ' + requiredLevel, 'info'); };
        } else {
            avatarItem.onclick = (function(idx) { return function() { selectAvatar(idx); }; })(index);
        }

        avatarGrid.appendChild(avatarItem);
    });

    modal.style.zIndex = '9999';
    modal.style.position = 'fixed';
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    modal.onclick = function(e) {
        if (e.target === modal) closeAvatarSelector();
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
    toggleFooter(false); // Скрываем футер в админ-панели
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
        
        const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never';
        const stats = user.stats || {};
        
        // Ячейка: никнейм
        const usernameTd = document.createElement('td');
        usernameTd.className = 'p-3';
        usernameTd.textContent = user.username || user.displayName || 'N/A';

        // Ячейка: email
        const emailTd = document.createElement('td');
        emailTd.className = 'p-3';
        emailTd.textContent = user.email || 'N/A';

        // Ячейка: страна
        const countryTd = document.createElement('td');
        countryTd.className = 'p-3';
        countryTd.textContent = user.country || 'Unknown';

        // Ячейка: IP
        const ipTd = document.createElement('td');
        ipTd.className = 'p-3 font-mono text-sm';
        ipTd.textContent = user.ip || 'N/A';

        // Ячейка: последний вход
        const lastLoginTd = document.createElement('td');
        lastLoginTd.className = 'p-3 text-sm';
        lastLoginTd.textContent = lastLogin;

        // Ячейка: число сессий
        const sessionsTd = document.createElement('td');
        sessionsTd.className = 'p-3';
        sessionsTd.textContent = String(stats.totalSessions || 0);

        // Ячейка: действия
        const actionsTd = document.createElement('td');
        actionsTd.className = 'p-3';
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm';
        deleteBtn.textContent = t('delete');
        deleteBtn.addEventListener('click', () => deleteUserFromAdmin(user.id));
        actionsTd.appendChild(deleteBtn);

        row.appendChild(usernameTd);
        row.appendChild(emailTd);
        row.appendChild(countryTd);
        row.appendChild(ipTd);
        row.appendChild(lastLoginTd);
        row.appendChild(sessionsTd);
        row.appendChild(actionsTd);
        
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
    playMenuClickSound();
    toggleFooter(false); // Скрываем футер в мультиплеере
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

// Shop functions
let currentShopCategory = 'all';
let currentShopLanguage = 'all';

// Show shop screen
function showShop() {
    const user = window.authModule?.getCurrentUser();
    if (!user) {
        showLoginModal();
        return;
    }
    if (app.soundEnabled && audioOpenShop) {
        audioOpenShop.currentTime = 0;
        audioOpenShop.play().catch(() => {});
    }
    hideAllScreens();
    const shopScreen = DOM.get('shopScreen');
    if (shopScreen) shopScreen.classList.remove('hidden');
    toggleFooter(false); // Скрываем футер в магазине
    
    // Обновляем баланс в магазине
    const shopBalance = DOM.get('shopBalance');
    if (shopBalance) {
        shopBalance.textContent = user.balance || 0;
    }
    
    // Сбрасываем фильтры
    currentShopLanguage = 'all';
    currentShopCategory = 'all';
    
    // Подсветка кнопки «Все языки» по умолчанию
    document.querySelectorAll('.shop-lang-btn').forEach(btn => {
        const lang = btn.getAttribute('data-lang');
        if (lang === 'all') {
            btn.classList.add('border-cyan-500', 'bg-cyan-500/20');
            btn.classList.remove('border-transparent');
        } else {
            btn.classList.remove('border-cyan-500', 'bg-cyan-500/20');
            btn.classList.add('border-transparent');
        }
    });
    
    // Сразу показываем категории и загружаем все уроки (все языки, все категории)
    const categoryTabs = DOM.get('shopCategoryTabs');
    if (categoryTabs) categoryTabs.classList.remove('hidden');
    loadShopLessons();
    // Повторная попытка через 50 мс, если уроки не подгрузились (например, shopModule ещё не готов)
    setTimeout(function checkShopLoaded() {
        const grid = document.getElementById('shopLessonsGrid');
        if (grid && !grid.querySelector('.shop-card-wrap') && window.shopModule) {
            loadShopLessons();
        }
    }, 50);
}

// Select shop language
function selectShopLanguage(lang) {
    currentShopLanguage = lang;
    
    // Обновляем активную кнопку языка
    document.querySelectorAll('.shop-lang-btn').forEach(btn => {
        const btnLang = btn.getAttribute('data-lang');
        if (btnLang === lang) {
            btn.classList.add('border-cyan-500', 'bg-cyan-500/20');
            btn.classList.remove('border-transparent');
        } else {
            btn.classList.remove('border-cyan-500', 'bg-cyan-500/20');
            btn.classList.add('border-transparent');
        }
    });
    
    // Показываем категории после выбора языка (или если выбраны все языки)
    const categoryTabs = DOM.get('shopCategoryTabs');
    if (categoryTabs) categoryTabs.classList.remove('hidden');
    
    // Сбрасываем категорию и загружаем уроки
    currentShopCategory = 'all';
    loadShopLessons();
}

// Случайный совет для оборота карточки магазина
function getRandomShopTip() {
    const keys = ['shopTipEarn', 'shopTipFocus', 'shopTipDaily', 'shopTipFlip', 'shopTipLevel'];
    return t(keys[Math.floor(Math.random() * keys.length)]);
}

// Load shop lessons (flip-карточки + советы на обороте)
function loadShopLessons() {
    const grid = DOM.get('shopLessonsGrid');
    if (!grid || !window.shopModule) return;
    
    const user = window.authModule?.getCurrentUser();
    if (!user) return;
    
    const purchasedLessons = user.purchasedLessons || [];
    const allLessons = window.shopModule.getAllShopLessons();
    
    let filteredLessons = allLessons;
    if (currentShopLanguage !== 'all') {
        filteredLessons = allLessons.filter(lesson => lesson.layout === currentShopLanguage);
    }
    if (currentShopCategory !== 'all') {
        filteredLessons = filteredLessons.filter(lesson => {
            let lessonDifficulty = lesson.difficulty;
            if (!lessonDifficulty || lessonDifficulty === 'easy') lessonDifficulty = 'beginner';
            else if (lessonDifficulty === 'hard') lessonDifficulty = 'advanced';
            return lessonDifficulty === currentShopCategory;
        });
    }
    
    const categoryContainer = DOM.get('shopCategoryTabs');
    if (categoryContainer) {
        categoryContainer.innerHTML = '';
        const difficultyCategories = [
            { id: 'all', name: t('allCategories') },
            { id: 'beginner', name: `🌱 ${app.lang === 'ru' ? 'Начинающий' : app.lang === 'en' ? 'Beginner' : 'Початківець'}` },
            { id: 'medium', name: `⚡ ${app.lang === 'ru' ? 'Средний' : app.lang === 'en' ? 'Medium' : 'Середній'}` },
            { id: 'advanced', name: `🔥 ${app.lang === 'ru' ? 'Продвинутый' : app.lang === 'en' ? 'Advanced' : 'Просунутий'}` }
        ];
        difficultyCategories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = `shop-category-btn px-3 py-1.5 rounded-lg glass border-2 hover:border-cyan-500/50 text-sm font-medium transition-all ${cat.id === currentShopCategory ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300' : 'border-transparent'}`;
            btn.setAttribute('data-category', cat.id);
            btn.textContent = cat.name;
            btn.onclick = () => selectShopCategory(cat.id);
            categoryContainer.appendChild(btn);
        });
    }
    
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const difficultyColors = { easy: 'text-success', medium: 'text-warning', hard: 'text-red-400' };
    const difficultyNames = { easy: 'Легкий', medium: 'Средний', hard: 'Продвинутый' };
    
    filteredLessons.forEach(lesson => {
        const isPurchased = purchasedLessons.includes(lesson.id);
        const hasCoins = (user.balance || 0) >= lesson.price;
        const tip = getRandomShopTip();
        
        const wrap = document.createElement('div');
        wrap.className = 'shop-card-wrap';
        wrap.setAttribute('data-lesson-id', lesson.id);
        
        const frontContent = `
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1 min-w-0 pr-2">
                    <h3 class="text-base font-bold mb-1 text-gray-100 line-clamp-1">${escapeHtml(lesson.name)}</h3>
                    <p class="text-xs text-gray-400 mb-1 line-clamp-2">${escapeHtml(lesson.description)}</p>
                    <span class="text-xs ${difficultyColors[lesson.difficulty]} font-semibold">${difficultyNames[lesson.difficulty]}</span>
                </div>
                ${isPurchased ? `
                    <div class="shop-card-owned bg-success/20 text-success px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap">✓</div>
                ` : `
                    <div class="shop-card-price text-right flex-shrink-0 flex items-center justify-end gap-1">${lesson.price} ${COIN_ICON_IMG}</div>
                `}
            </div>
            <div class="bg-gray-800/50 rounded-lg p-2 mb-2 text-xs text-gray-300 italic line-clamp-2">"${escapeHtml(lesson.preview)}"</div>
            ${isPurchased ? `
                <button onclick="startPurchasedLesson('${lesson.id}')" class="w-full mt-auto bg-gradient-to-r from-success to-green-500 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-2 rounded-lg transition-all shadow-lg hover:shadow-xl text-sm">${t('startLesson')}</button>
            ` : `
                <button onclick="purchaseLesson('${lesson.id}')" class="shop-purchase-btn w-full mt-auto font-semibold py-2 rounded-lg transition-all shadow-lg text-sm ${hasCoins ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-teal-500 text-white hover:shadow-xl' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}" data-lesson-id="${lesson.id}" data-can-buy="${hasCoins}">${hasCoins ? t('buy') : t('notEnoughCoins')}</button>
            `}
        `;
        
        const backContent = `
            <div class="shop-tip-icon">💡</div>
            <div class="shop-tip-text">${escapeHtml(tip)}</div>
            <div class="shop-card-back-actions mt-auto pt-3">
                ${isPurchased ? `
                    <button onclick="startPurchasedLesson('${lesson.id}')" class="shop-card-back-btn w-full bg-gradient-to-r from-success to-green-500 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-2 rounded-lg transition-all shadow-lg hover:shadow-xl text-sm">${t('startLesson')}</button>
                ` : `
                    <button onclick="purchaseLesson('${lesson.id}')" class="shop-card-back-btn w-full font-semibold py-2 rounded-lg transition-all shadow-lg text-sm ${hasCoins ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-teal-500 text-white hover:shadow-xl' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}" data-lesson-id="${lesson.id}" data-can-buy="${hasCoins}">${hasCoins ? t('buy') : t('notEnoughCoins')}</button>
                `}
            </div>
        `;
        wrap.innerHTML = `
            <div class="shop-card-inner">
                <div class="shop-card-front">${frontContent}</div>
                <div class="shop-card-back">${backContent}</div>
            </div>
        `;
        fragment.appendChild(wrap);
    });
    
    grid.appendChild(fragment);
}

// Select shop category
function selectShopCategory(category) {
    currentShopCategory = category;
    loadShopLessons();
}

// Анимация полёта карточки к блоку баланса при покупке
function animatePurchaseFly(lessonId) {
    const wrap = document.querySelector(`.shop-card-wrap[data-lesson-id="${lessonId}"]`);
    const targetEl = document.getElementById('shopFlyTarget') || document.getElementById('shopBalanceWrap');
    if (!wrap || !targetEl) return;
    
    const rect = wrap.getBoundingClientRect();
    const clone = wrap.cloneNode(true);
    const inner = clone.querySelector('.shop-card-inner');
    if (inner) inner.style.transform = 'rotateY(0deg)';
    clone.classList.add('shop-card-fly');
    clone.style.position = 'fixed';
    clone.style.left = rect.left + 'px';
    clone.style.top = rect.top + 'px';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '9999';
    document.body.appendChild(clone);
    
    const targetRect = targetEl.getBoundingClientRect();
    const endLeft = targetRect.left + targetRect.width / 2 - rect.width / 2;
    const endTop = targetRect.top + targetRect.height / 2 - rect.height / 2;
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            clone.classList.add('shop-fly-anim');
            clone.style.left = endLeft + 'px';
            clone.style.top = endTop + 'px';
            clone.style.transform = 'scale(0.2)';
            clone.style.opacity = '0';
        });
    });
    
    setTimeout(() => {
        clone.remove();
        const updatedUser = window.authModule?.getCurrentUser();
        if (updatedUser) updateUserUI(updatedUser, updatedUser);
    loadShopLessons();
    }, 650);
}

// Purchase lesson
async function purchaseLesson(lessonId) {
    const user = window.authModule?.getCurrentUser();
    if (!user) {
        showLoginModal();
        return;
    }
    
    const lesson = window.shopModule?.getLessonById(lessonId);
    if (lesson && (user.balance || 0) < lesson.price) {
        playDeniedMoneySound();
        showToast(t('tipInsufficientCoins'), 'info', t('tip'));
        return;
    }
    
    const result = await window.authModule.purchaseLesson(user.uid, lessonId);
    
    if (result.success) {
        if (app.soundEnabled && audioBuyShop) {
            audioBuyShop.currentTime = 0;
            audioBuyShop.play().catch(() => {});
        }
        showToast(t('lessonPurchased'), 'success', t('shop'));
        if (document.getElementById('shopScreen') && !document.getElementById('shopScreen').classList.contains('hidden')) {
            animatePurchaseFly(lessonId);
        } else {
        const updatedUser = window.authModule.getCurrentUser();
        updateUserUI(updatedUser, updatedUser);
        loadShopLessons();
        }
    } else {
        if (result.error && (result.error === 'Недостаточно монет' || result.error.indexOf('монет') !== -1)) {
            playDeniedMoneySound();
        }
        showToast(result.error || t('purchaseError'), 'error', app.lang === 'ru' ? 'Ошибка' : app.lang === 'en' ? 'Error' : 'Помилка');
    }
}

function playDeniedMoneySound() {
    if (!app.soundEnabled) return;
    try {
        var s = audioDeniedMoney ? audioDeniedMoney.cloneNode() : new Audio('assets/sounds/denied_money.ogg');
        s.volume = SFX_VOLUME;
        s.currentTime = 0;
        s.play().catch(function() {});
    } catch (e) {}
}

function playTelegramSound() {
    if (!app.soundEnabled || !audioOpenTelegram) return;
    audioOpenTelegram.currentTime = 0;
    audioOpenTelegram.play().catch(() => {});
}

function playMenuClickSound() {
    if (!app.soundEnabled) return;
    var num = Math.random() < 0.5 ? '0' : '1';
    var s = new Audio('assets/sounds/click_menu_' + num + '.ogg');
    s.volume = SFX_VOLUME;
    s.play().catch(function () {});
}

const SITE_RATING_STORAGE_KEY = 'zoobastiks_site_rating';

function initSiteRating() {
    const wrap = document.getElementById('siteRatingStars');
    if (!wrap) return;
    const stars = wrap.querySelectorAll('.site-star');
    const container = wrap.closest('.site-rating-wrap');
    if (!container || !stars.length) return;

    function updateStars(value) {
        const v = parseInt(value, 10) || 0;
        container.setAttribute('data-rating', v);
        stars.forEach((star, i) => {
            if (i < v) star.classList.add('active');
            else star.classList.remove('active');
        });
    }

    const saved = parseInt(localStorage.getItem(SITE_RATING_STORAGE_KEY), 10);
    if (saved >= 1 && saved <= 5) updateStars(saved);

    stars.forEach((star) => {
        const rating = parseInt(star.getAttribute('data-rating'), 10);
        star.addEventListener('mouseenter', function () {
            stars.forEach((s, i) => {
                if (i < rating) s.classList.add('hover');
                else s.classList.remove('hover');
            });
        });
        star.addEventListener('mouseleave', function () {
            stars.forEach((s) => s.classList.remove('hover'));
        });
        star.addEventListener('click', function () {
            localStorage.setItem(SITE_RATING_STORAGE_KEY, String(rating));
            updateStars(rating);
            if (app.soundEnabled && audioFeedback) {
                audioFeedback.currentTime = 0;
                audioFeedback.play().catch(() => {});
            }
            const msg = app.lang === 'en' ? t('thanksForRating') : t('thanksForRating');
            showToast(msg, 'success', '⭐');
        });
    });
}

// Start purchased lesson
function startPurchasedLesson(lessonId) {
    if (!window.shopModule) return;
    
    const lesson = window.shopModule.getLessonById(lessonId);
    if (!lesson) {
        showToast('Урок не найден', 'error', 'Ошибка');
        return;
    }
    
    // Определяем уровень сложности
    let level = 'beginner';
    if (lesson.difficulty === 'hard') level = 'advanced';
    else if (lesson.difficulty === 'medium') level = 'medium';
    
    // Создаём объект урока для системы
    const lessonObj = {
        id: lesson.id,
        name: lesson.name,
        description: lesson.description,
        layout: lesson.layout,
        text: lesson.text,
        difficulty: lesson.difficulty,
        key: `shop_lesson_${lesson.id}`,
        isShopLesson: true
    };
    
    startPractice(lesson.text, 'lesson', lessonObj);
}

