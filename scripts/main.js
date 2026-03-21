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
    myReady: false,
    opponentReady: false,
    opponentErrors: 0,
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
    pendingLevelUp: null,
    totalLessonPauseDuration: 0,
    _pauseStartAt: null
};

// Streak (серия дней) + «заморозка»: 1 раз за календарную неделю можно не сбросить серию при пропуске ровно одного дня
const STREAK_KEY = 'zoobastiks_streak';
/** Фильтр длительности на экране списка уроков: all | short */
var lessonDurationFilter = 'all';

function streakDateStr(d) {
    d = d || new Date();
    return d.toISOString().slice(0, 10);
}
function calendarDaysBetween(isoFrom, isoTo) {
    if (!isoFrom || !isoTo) return 999;
    var a = new Date(isoFrom + 'T12:00:00').getTime();
    var b = new Date(isoTo + 'T12:00:00').getTime();
    return Math.round((b - a) / 86400000);
}
/** Идентификатор ISO-недели для лимита заморозок (1 раз в неделю) */
function streakWeekId(d) {
    d = d ? new Date(d.getTime()) : new Date();
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dayNum = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((t - yearStart) / 86400000) + 1) / 7);
    return t.getUTCFullYear() + '-W' + weekNo;
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
    var data;
    try {
        var raw = localStorage.getItem(STREAK_KEY);
        data = raw ? JSON.parse(raw) : { lastDate: '', count: 0 };
    } catch (_) {
        data = { lastDate: '', count: 0 };
    }
    if (data.lastDate === today) return;

    var weekId = streakWeekId(new Date());
    var gap = data.lastDate ? calendarDaysBetween(data.lastDate, today) : 999;

    if (!data.lastDate) {
        data.count = 1;
    } else if (gap === 1) {
        data.count = (data.count || 0) + 1;
    } else if (gap === 2 && data.freezeWeekUsed !== weekId) {
        data.count = (data.count || 0) + 1;
        data.freezeWeekUsed = weekId;
    } else {
        data.count = 1;
    }
    data.lastDate = today;
    try {
        localStorage.setItem(STREAK_KEY, JSON.stringify(data));
    } catch (_) {}
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

// Throttle: fires immediately on first call, then at most once per `limit` ms.
// A trailing call is always scheduled so the last invocation never gets silently dropped.
function throttle(func, limit) {
    let lastCall = 0;
    let trailingTimer = null;
    return function() {
        const now = Date.now();
        const remaining = limit - (now - lastCall);
        const args = arguments;
        const ctx = this;
        if (remaining <= 0) {
            if (trailingTimer) { clearTimeout(trailingTimer); trailingTimer = null; }
            lastCall = now;
            func.apply(ctx, args);
        } else {
            clearTimeout(trailingTimer);
            trailingTimer = setTimeout(function() {
                lastCall = Date.now();
                trailingTimer = null;
                func.apply(ctx, args);
            }, remaining);
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

var pwaDeferredPrompt = null;
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  pwaDeferredPrompt = e;
});

function initPwaInstallBanner() {
  var banner = document.getElementById('pwaInstallBanner');
  var btn = document.getElementById('pwaInstallBtn');
  var dismiss = document.getElementById('pwaInstallDismiss');
  if (!banner || !btn) return;
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var dismissed = false;
  try { dismissed = localStorage.getItem('zoob_pwa_banner_dismissed') === '1'; } catch (e) {}
  if (isStandalone || !pwaDeferredPrompt || dismissed) return;
  banner.classList.remove('hidden');
  banner.classList.add('flex');
  btn.onclick = function () {
    if (!pwaDeferredPrompt) return;
    pwaDeferredPrompt.prompt();
    pwaDeferredPrompt.userChoice.then(function (choice) {
      if (choice.outcome === 'accepted') banner.classList.add('hidden');
      pwaDeferredPrompt = null;
    });
  };
  if (dismiss) {
    dismiss.onclick = function () {
      banner.classList.add('hidden');
      try { localStorage.setItem('zoob_pwa_banner_dismissed', '1'); } catch (e) {}
    };
  }
}

// In-memory кэш ошибок по клавишам — flush в localStorage при finishPractice
var _keyErrorsCache = {};
var _keyErrorsFlushTimer = null;

function _flushKeyErrors() {
    if (!Object.keys(_keyErrorsCache).length) return;
    try {
        var stored = localStorage.getItem('zoob_key_errors');
        var base = stored ? JSON.parse(stored) : {};
        for (var k in _keyErrorsCache) {
            base[k] = (base[k] || 0) + _keyErrorsCache[k];
        }
        localStorage.setItem('zoob_key_errors', JSON.stringify(base));
    } catch (_e) {}
    _keyErrorsCache = {};
}

/**
 * После сессии без ошибок (100% точность) — уменьшаем «хвост» по буквам, которые реально печатали.
 * Счётчики постепенно падают и ключи исчезают из профиля.
 */
function _decayKeyErrorsIfPerfect(accuracy, errors) {
    if (errors !== 0 || accuracy !== 100) return;
    var text = app.currentText;
    if (!text || typeof text !== 'string' || text.length < 8) return;
    var practiced = {};
    for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') continue;
        if (ch.length !== 1) continue;
        practiced[ch] = 1;
        if (ch.toLowerCase) practiced[ch.toLowerCase()] = 1;
    }
    try {
        var raw = localStorage.getItem('zoob_key_errors');
        var base = raw ? JSON.parse(raw) : {};
        var changed = false;
        for (var k in base) {
            if (!Object.prototype.hasOwnProperty.call(base, k)) continue;
            var cnt = Number(base[k]);
            if (!isFinite(cnt) || cnt <= 0) continue;
            if (k.length !== 1) continue;
            var kl = k.toLowerCase();
            if (!practiced[k] && !practiced[kl]) continue;
            var drop = Math.max(1, Math.round(cnt * 0.2));
            var next = cnt - drop;
            if (next <= 0) {
                delete base[k];
            } else {
                base[k] = next;
            }
            changed = true;
        }
        if (changed) {
            localStorage.setItem('zoob_key_errors', JSON.stringify(base));
        }
    } catch (_e) {}
}

// Периодический flush раз в 5 секунд (страховка при внезапном закрытии)
function _startKeyErrorsFlushTimer() {
    if (_keyErrorsFlushTimer) return;
    _keyErrorsFlushTimer = setInterval(_flushKeyErrors, 5000);
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

// translations extracted to scripts/ui/translations.js
// Fallback: inline definition kept for builds that don't load the separate file first.
const translations = window.translations || {
    ru: {
        welcome: 'Добро пожаловать в игру',
        subtitle: 'Научитесь печатать быстро и без ошибок',
        heroSubtitle: '🚀 Быстро • 🎯 Точно • 💪 Эффективно',
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
        mobilePcHint: 'Для лучшего взаимодействия рекомендуем зайти с компьютера.',
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
        aboutProject: 'О проекте',
        reviewsLink: 'Отзывы',
        allReviews: 'Все отзывы',
        copyResult: 'Скопировать результат',
        copyResultShort: 'Копия',
        resultCopied: 'Результат скопирован в буфер обмена',
        copyFailed: 'Не удалось скопировать',
        hotkeysHint: 'Esc — закрыть · Enter или R — повторить',
        streakDays: 'дней подряд',
        streakHint: 'Серия дней с тренировкой',
        // Multiplayer room settings
        mpThemeRandom: 'Случайные',
        mpThemeAnime: 'Аниме',
        mpThemeGames: 'Игры',
        mpThemeAnimals: 'Животные',
        mpThemeSpace: 'Космос',
        mpThemeNature: 'Природа',
        mpTextLength: 'Длина текста (символы)',
        mpChars: 'симв',
        mpTextOptions: 'Параметры текста',
        mpOptComma: 'Запятые',
        mpOptPeriod: 'Точки',
        mpOptDigits: 'Цифры',
        mpOptMixCase: 'Микс',
        mpAlwaysRandom: 'Текст генерируется случайно на лету.',
        mpPlayers: 'Игроки',
        mpDuelOnly: 'Сейчас доступна только дуэль:',
        mp2Players: '2 игрока',
        profileTabOverview: 'Обзор',
        profileTabHistory: 'История',
        profileTabErrors: 'Ошибки',
        profileTabNoSessions: 'Пока нет сессий — пройди урок!',
        profileTabNoAchiev: 'Достижений пока нет',
        profileTabNoErrors: 'Пройди урок — и здесь появится аналитика ошибок',
        profileTabNeedMore: 'Пройди хотя бы 2 сессии для динамики',
        profileTabSessions: 'Последние сессии',
        profileTabAchievements: 'Достижения',
        profileTabMissedKeys: 'Проблемные клавиши',
        profileTabAccTrend: 'Динамика точности',
        profileTabSpeed: 'Скорость',
        profileTabLocked: 'закрыто',
        profileTabOnSite: 'на сайте'
    },
    en: {
        welcome: 'Welcome to Zoobastiks',
        subtitle: 'Learn to type fast and accurately',
        heroSubtitle: '🚀 Fast • 🎯 Accurate • 💪 Efficient',
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
        mobilePcHint: 'For a better experience we recommend using a computer.',
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
        aboutProject: 'About',
        reviewsLink: 'Reviews',
        allReviews: 'All reviews',
        copyResult: 'Copy result',
        copyResultShort: 'Copy',
        resultCopied: 'Result copied to clipboard',
        copyFailed: 'Copy failed',
        hotkeysHint: 'Esc — close · Enter or R — repeat',
        streakDays: 'day streak',
        streakHint: 'Consecutive days with practice',
        // Multiplayer room settings
        mpThemeRandom: 'Random',
        mpThemeAnime: 'Anime',
        mpThemeGames: 'Games',
        mpThemeAnimals: 'Animals',
        mpThemeSpace: 'Space',
        mpThemeNature: 'Nature',
        mpTextLength: 'Text length (chars)',
        mpChars: 'chars',
        mpTextOptions: 'Text options',
        mpOptComma: 'Commas',
        mpOptPeriod: 'Periods',
        mpOptDigits: 'Digits',
        mpOptMixCase: 'Mix',
        mpAlwaysRandom: 'Text is always generated randomly.',
        mpPlayers: 'Players',
        mpDuelOnly: 'Only duel available:',
        mp2Players: '2 players',
        profileTabOverview: 'Overview',
        profileTabHistory: 'History',
        profileTabErrors: 'Errors',
        profileTabNoSessions: 'No sessions yet — complete a lesson!',
        profileTabNoAchiev: 'No achievements yet',
        profileTabNoErrors: 'Complete a lesson to see key error analytics',
        profileTabNeedMore: 'Complete at least 2 sessions to see trends',
        profileTabSessions: 'Recent Sessions',
        profileTabAchievements: 'Achievements',
        profileTabMissedKeys: 'Most Missed Keys',
        profileTabAccTrend: 'Accuracy Trend',
        profileTabSpeed: 'Speed',
        profileTabLocked: 'locked',
        profileTabOnSite: 'on site'
    }
};

// Ensure window.translations is always set (scripts/ui/translations.js may have pre-populated it)
window.translations = translations;

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
        'амбіція', 'завдання', 'мета', 'слово', 'мова', 'літера', 'звук', 'фраза', 'текст', 'рядок', 'сторінка',         'анімізм'
    ]
};

// Доп. слова для режима «слабые клавиши» (буквы ы ф г и т.д. в обычном списке реже)
const adaptiveExtraWords = {
    ru: [
        'флаг', 'фраза', 'фронт', 'фонарь', 'фантазия', 'февраль', 'фасад', 'фильм', 'фигура', 'формат', 'футбол', 'фургон',
        'функция', 'фактор', 'фокус', 'фирма', 'финал', 'физика', 'философ', 'фонтан', 'формула',
        'мысль', 'мысли', 'мышь', 'мыть', 'вымысел', 'сыр', 'рыба', 'крыша', 'дым', 'лысый', 'жизнь',
        'ты', 'мы', 'вы', 'был', 'стыл', 'рысь', 'дыра', 'слышать', 'ныть', 'грызть', 'крыса',
        'гроза', 'гром', 'грусть', 'голос', 'глаз', 'горох', 'гигант', 'гладкий', 'граница', 'газета', 'герб',
        'город', 'огонь', 'молоко', 'хорошо', 'молодость', 'огромный', 'дорога', 'корова', 'голова', 'уголь',
        'фыркнуть', 'фальшь', 'фьорды', 'афиша', 'эфир', 'трофей', 'граф', 'гриф', 'груша'
    ],
    en: [
        'fuzzy', 'fox', 'fix', 'flux', 'quartz', 'quiz', 'jazz', 'buzz', 'pizza', 'zephyr', 'galaxy', 'sphinx',
        'oxygen', 'hyphen', 'rhythm', 'gazebo', 'jinx', 'queue', 'quiche', 'squid', 'text', 'next', 'vex'
    ],
    ua: [
        'фраза', 'фронт', 'фільм', 'фантазія', 'фонтан', 'формат', 'функція', 'гроза', 'гром', 'гора', 'голос',
        'газета', 'миготіти', 'миска', 'сир', 'риба', 'криша', 'дим', 'ти', 'ми', 'ви', 'фільтр'
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
// BACKGROUNDS extracted to scripts/ui/backgrounds.js
// Fallback: inline definition kept for builds that don't load the separate file first.
var BACKGROUNDS = window.BACKGROUNDS || [
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
// Expose so other scripts can read it
window.BACKGROUNDS = BACKGROUNDS;
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
            var updatedUser = window.authModule && window.authModule.getCurrentUser ? window.authModule.getCurrentUser() : null;
            if (updatedUser && typeof updateUserUI === 'function') updateUserUI(updatedUser, currentUserProfile || updatedUser);
            var shopBalanceEl = DOM.get('shopBalance');
            if (shopBalanceEl) shopBalanceEl.textContent = (updatedUser && (updatedUser.balance != null) ? updatedUser.balance : newBalance) + '';
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
    if (!app.animationsEnabled) return;
    
    const heroContainer = document.querySelector('.hero-container');
    if (!heroContainer) return;
    
    // Reuse: если частицы уже есть — не пересоздаём (только показываем)
    const existing = heroContainer.querySelectorAll('.particle');
    if (existing.length > 0) {
        existing.forEach(p => { p.style.display = ''; });
        return;
    }
    
    // Создаём 20 частиц один раз
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particle.style.animationDelay = Math.random() * 5 + 's';
        particle.style.opacity = Math.random() * 0.5 + 0.3;
        frag.appendChild(particle);
    }
    heroContainer.appendChild(frag);
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

// Отложенная установка фона (после первого кадра), чтобы LCP был контент, а не большое изображение
function scheduleBackgroundAfterFirstPaint() {
    function run() {
        setRandomBackground();
        updateFooterBackground();
    }
    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(run, { timeout: 400 });
    } else {
        requestAnimationFrame(function() { requestAnimationFrame(run); });
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    app.isPaused = false;
    
    loadSettings();
    scheduleBackgroundAfterFirstPaint();
    applyAnimationsSetting();
    initializeUI();
    updateTranslations();
    if (window.statsModule) window.statsModule.updateDisplay();
    if (window.achievementsModule) window.achievementsModule.render('achievementsBlock');
    if (window.levelModule) renderLevelBlock();
    if (window.keyboardModule) window.keyboardModule.render(app.currentLayout);
    initSiteRating();
    // Футер/фон уже запланированы в scheduleBackgroundAfterFirstPaint
    
    // Неблокирующая инициализация: аудио и частицы после первого кадра
    setTimeout(function() {
        initializeAudio();
        _initSfxPools();
        createParticles();
    }, 0);
    
    setTimeout(showOnboardingIfFirstVisit, 700);
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(function (reg) {
            if (reg) {
                setInterval(function () { reg.update(); }, 5 * 60 * 1000);
            }
        }).catch(function () {});
        window.addEventListener('focus', function () {
            navigator.serviceWorker.getRegistration().then(function (reg) {
                if (reg) reg.update();
            }).catch(function () {});
        });
        // Новый SW: оверлей + жёсткая перезагрузка (как при смене version.json)
        navigator.serviceWorker.addEventListener('message', function (e) {
            if (e.data && e.data.type === 'SW_UPDATED') {
                performAppHardReload();
            }
        });
    }
    initDeployVersionCheck();
    initPwaInstallBanner();

    // Initialize auth state listener
    if (window.authModule) {
        window.authModule.onAuthStateChange(async (user) => {
            // Обновляем присутствие в Firebase (ник, уровень, аватар)
            if (typeof window.__updatePresenceUser === 'function') {
                window.__updatePresenceUser(user || null);
            }
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
        // Футер и фон тела задаются в scheduleBackgroundAfterFirstPaint (после первого кадра, для LCP)
    }
    
    if (savedLang) {
        app.lang = normalizeSiteLangFromStorage(savedLang);
        if (savedLang === 'uk') {
            try { localStorage.setItem('lang', 'ua'); } catch (e) {}
        }
    }
    syncSiteLanguageUI();
    syncSelectedLessonLangWithSite();
    
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
    
    // Портал: выпадающее меню «О проекте» / «Отзывы»
    const sitePortalBtn = document.getElementById('sitePortalBtn');
    const sitePortalDropdown = document.getElementById('sitePortalDropdown');
    if (sitePortalBtn && sitePortalDropdown) {
        sitePortalBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var open = !sitePortalDropdown.classList.contains('hidden');
            sitePortalDropdown.classList.toggle('hidden', open);
            sitePortalBtn.setAttribute('aria-expanded', !open);
        });
        document.addEventListener('click', function (e) {
            if (!e.target.closest('#sitePortalWrap')) {
                sitePortalDropdown.classList.add('hidden');
                sitePortalBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }
    
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

// ── Автообновление при новом деплое (version.json + service worker) ─────────
var __zoobDeployPollTimer = null;
var __zoobDeployBaseline = null;

function _parseDeployBuild(data) {
    if (!data || data.build == null) return null;
    var b = Number(data.build);
    return isFinite(b) ? b : null;
}

function showAppUpdateOverlay() {
    var el = document.getElementById('appUpdateOverlay');
    if (!el) return;
    var lang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'ru';
    var title = el.querySelector('[data-update-title]');
    var sub = el.querySelector('[data-update-sub]');
    if (title) {
        title.textContent = lang === 'en' ? 'Updating…' : 'Сайт обновляется';
    }
    if (sub) {
        sub.textContent = lang === 'en'
            ? 'Please wait — loading the new version.'
            : 'Подождите, загружается новая версия…';
    }
    el.classList.add('is-visible');
}

/** Сброс кэшей SW и перезагрузка (после оверлея). */
function performAppHardReload() {
    if (window.__zoobUpdateReloading) return;
    window.__zoobUpdateReloading = true;
    showAppUpdateOverlay();
    var go = function () {
        window.location.reload();
    };
    setTimeout(function () {
        if ('caches' in window) {
            caches.keys().then(function (keys) {
                return Promise.all(keys.map(function (k) { return caches.delete(k); }));
            }).catch(function () {}).finally(function () {
                if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
                    navigator.serviceWorker.getRegistrations().then(function (regs) {
                        return Promise.all(regs.map(function (r) { return r.unregister(); }));
                    }).catch(function () {}).finally(go);
                } else {
                    go();
                }
            });
        } else if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
            navigator.serviceWorker.getRegistrations().then(function (regs) {
                return Promise.all(regs.map(function (r) { return r.unregister(); }));
            }).catch(function () {}).finally(go);
        } else {
            go();
        }
    }, 400);
}

function fetchDeployBuild() {
    return fetch('./version.json?b=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
}

function initDeployVersionCheck() {
    fetchDeployBuild().then(function (data) {
        var b = _parseDeployBuild(data);
        if (b == null) return;
        __zoobDeployBaseline = b;
        if (__zoobDeployPollTimer) clearInterval(__zoobDeployPollTimer);
        // Первый опрос через 20 с, далее каждые 45 с (не мешает игре, ловит новый деплой)
        setTimeout(function () {
            __zoobDeployPollTimer = setInterval(function () {
                if (window.__zoobUpdateReloading) return;
                fetchDeployBuild().then(function (d) {
                    var nb = _parseDeployBuild(d);
                    if (nb == null || __zoobDeployBaseline == null) return;
                    if (nb > __zoobDeployBaseline) {
                        performAppHardReload();
                    }
                });
            }, 45000);
        }, 20000);
    });
}

function handleGlobalHotkeys(e) {
    if (e.key === 'Escape') {
        if (isAnyModalVisible()) {
            closeTopModal();
        }
        return;
    }
    if (isInputFocused()) return;
    // Guard: ignore hotkeys fired within 500 ms of practice finishing to prevent
    // the very keystroke that typed the last character from instantly repeating the round.
    const justFinished = app.practiceFinishedAt && (Date.now() - app.practiceFinishedAt < 500);
    if (e.key === 'Enter') {
        if (justFinished) return;
        if (isModalVisible('resultsModal')) { e.preventDefault(); repeatPractice(); return; }
        if (isModalVisible('levelUpModal')) { e.preventDefault(); closeLevelUpModal(); return; }
    }
    // Физическая клавиша R (KeyR) — работает при любой раскладке (RU/EN/UA).
    if (e.code === 'KeyR') {
        if (e.ctrlKey || e.metaKey) return;
        if (justFinished) return;
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

/** localStorage мог хранить `uk` (ISO); в коде везде `ua` для украинского UI */
function normalizeSiteLangFromStorage(savedLang) {
    if (!savedLang) return 'ru';
    if (savedLang === 'uk') return 'ua';
    if (savedLang === 'ru' || savedLang === 'en' || savedLang === 'ua') return savedLang;
    return 'ru';
}

/** Атрибут `lang` у &lt;html&gt;: для украинского — BCP47 `uk` */
function siteLangHtmlAttr() {
    if (app.lang === 'en') return 'en';
    if (app.lang === 'ua') return 'uk';
    return 'ru';
}

function syncSiteLanguageUI() {
    try {
        document.documentElement.setAttribute('data-lang', app.lang || 'ru');
        document.documentElement.setAttribute('lang', siteLangHtmlAttr());
    } catch (e) {}
    const langEl = DOM.get('currentLang');
    if (langEl) {
        langEl.textContent = app.lang === 'ua' ? 'UA' : (app.lang || 'ru').toUpperCase();
    }
}

// Language toggle: RU → EN → UA → RU
function toggleLanguage() {
    if (app.soundEnabled && audioClickLanguage) {
        audioClickLanguage.currentTime = 0;
        audioClickLanguage.play().catch(() => {});
    }
    const order = ['ru', 'en', 'ua'];
    var idx = order.indexOf(app.lang);
    if (idx < 0) idx = 0;
    app.lang = order[(idx + 1) % order.length];
    localStorage.setItem('lang', app.lang);
    syncSiteLanguageUI();
    syncSelectedLessonLangWithSite();
    updateTranslations();
    updateRoomSelectionUI();
    if (app.currentMode === 'lessons') loadLessons();
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
    if (window.achievementsModule && typeof window.achievementsModule.render === 'function') {
        window.achievementsModule.render('achievementsBlock');
    }
    if (typeof window.__siteStatsRefreshModal === 'function') window.__siteStatsRefreshModal();
    if (typeof window.__siteStatsUpdateUI === 'function' && typeof window.__siteStatsVisits !== 'undefined') {
        window.__siteStatsUpdateUI(window.__siteStatsVisits, window.__siteStatsOnline);
    }
    var _ps = document.getElementById('profileScreen');
    if (_ps && !_ps.classList.contains('hidden') && typeof showProfileTab === 'function') {
        showProfileTab(_lastProfileTab);
    }
    var _lvlList = document.getElementById('levelListModal');
    if (_lvlList && !_lvlList.classList.contains('hidden') && typeof fillLevelListModal === 'function') {
        fillLevelListModal();
    }
    refreshLessonLangButtonStyles();
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
    DOM.clear(); // Invalidate stale element references after screen switch.
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
    syncSelectedLessonLangWithSite();
    refreshLessonLangButtonStyles();
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

    // Hide multiplayer dialogs/modals too (not included in .screens list above).
    ['roomSettingsDialog', 'joinRoomDialog', 'multiplayerResultsModal'].forEach(id => {
        const el = DOM.get(id);
        if (el) el.classList.add('hidden');
    });
}

/** Мова пулу уроків (RU/EN/UA) узгоджується з мовою інтерфейсу, поки користувач не змінить уручну. */
function syncSelectedLessonLangWithSite() {
    selectedLessonLang = app.lang === 'ua' ? 'ua' : app.lang === 'en' ? 'en' : 'ru';
}

function refreshLessonLangButtonStyles() {
    document.querySelectorAll('[id^="lessonLang"]').forEach(function (btn) {
        btn.className = 'w-full px-4 py-4 rounded-xl bg-gray-700/50 dark:bg-gray-800/50 hover:bg-gray-600/50 text-gray-300 font-bold text-lg transition-all transform hover:scale-105';
    });
    var cap = selectedLessonLang.charAt(0).toUpperCase() + selectedLessonLang.slice(1);
    var activeBtn = DOM.get('lessonLang' + cap);
    if (activeBtn) {
        activeBtn.className = 'w-full px-4 py-4 rounded-xl bg-gradient-to-br from-primary to-cyan-500 text-white font-bold text-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all transform hover:scale-105';
    }
}

// Select lesson language
function selectLessonLanguage(lang) {
    selectedLessonLang = lang;
    refreshLessonLangButtonStyles();
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
        
        var levelTitleKey = level === 'beginner' ? 'difficultyBeginner' : level === 'medium' ? 'difficultyMedium' : 'difficultyAdvanced';
        const levelName = typeof t === 'function' ? t(levelTitleKey) : (app.lang === 'en' ? data.name_en : (app.lang === 'ua' ? (data.name_ua || data.name_ru) : data.name_ru));
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
    var filterBar = document.getElementById('lessonDurationFilterBar');
    if (filterBar) filterBar.classList.add('hidden');
    container.classList.add('difficulty-grid');
    container.innerHTML = '';
    container.appendChild(fragment);
}

function _isLessonBeginnerish(lesson) {
    return !!(lesson && (lesson.level === 'beginner' || lesson.difficulty === 'easy'));
}

/**
 * Длина текста урока для карточки (совпадает с логикой startPractice).
 */
function formatLessonCharCountLabel(lesson) {
    if (!lesson) return '';
    var text = typeof lesson.text === 'string' ? lesson.text : String(lesson.text || '');
    var layout = lesson.layout || 'ru';
    var beg = _isLessonBeginnerish(lesson);
    var sym = typeof t === 'function' ? t('characters') : 'символов';

    if (layout === 'ua' && beg) {
        return '~100–200 ' + sym;
    }
    if ((layout === 'ru' || layout === 'en') && beg) {
        return '~100–200 ' + sym;
    }
    if ((layout === 'ru' || layout === 'en') && text.length > 0 && !beg) {
        var minC = Math.max(120, Math.round(text.length * 0.75));
        var maxC = Math.min(4500, Math.max(minC + 40, Math.round(text.length * 1.08)));
        if (maxC - minC <= 100) {
            return String(Math.round((minC + maxC) / 2)) + ' ' + sym;
        }
        return '~' + minC + '–' + maxC + ' ' + sym;
    }
    if (text.length > 0) {
        return String(text.length) + ' ' + sym;
    }
    return '';
}

/** Средняя оценка длины урока в символах (для фильтра «короткие») */
function estimateLessonCharMid(lesson) {
    if (!lesson) return 9999;
    var text = typeof lesson.text === 'string' ? lesson.text : String(lesson.text || '');
    var layout = lesson.layout || 'ru';
    var beg = _isLessonBeginnerish(lesson);
    if (layout === 'ua' && beg) return 150;
    if ((layout === 'ru' || layout === 'en') && beg) return 150;
    if ((layout === 'ru' || layout === 'en') && text.length > 0 && !beg) {
        var minC = Math.max(120, Math.round(text.length * 0.75));
        var maxC = Math.min(4500, Math.max(minC + 40, Math.round(text.length * 1.08)));
        return Math.round((minC + maxC) / 2);
    }
    return text.length || 9999;
}

var LESSON_SHORT_CHAR_MAX = 280;

function setLessonDurationFilter(mode) {
    lessonDurationFilter = mode === 'short' ? 'short' : 'all';
    if (currentLevelData) showLessonList(currentLevelData);
    updateLessonFilterBarStyles();
}

function updateLessonFilterBarStyles() {
    var allBtn = document.getElementById('lessonFilterAll');
    var shBtn = document.getElementById('lessonFilterShort');
    var on = 'px-3 py-1.5 rounded-lg text-sm font-semibold border border-cyan-500/50 bg-cyan-500/20 text-cyan-200';
    var off = 'px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-600 bg-gray-800/50 text-gray-300 hover:border-cyan-500/40';
    if (allBtn) allBtn.className = lessonDurationFilter === 'all' ? on : off;
    if (shBtn) shBtn.className = lessonDurationFilter === 'short' ? on : off;
}

function initLessonCheckpoints() {
    if (app.currentMode === 'speedtest' || !app.totalChars || app.totalChars < 22) {
        app._checkpointStep = 0;
        app._checkpointNext = 0;
        return;
    }
    var step = Math.max(14, Math.min(80, Math.floor(app.totalChars / 5)));
    app._checkpointStep = step;
    app._checkpointNext = Math.min(step, app.totalChars - 1);
}

function flashCheckpointBar() {
    var wrap = document.getElementById('progressBarWrap');
    if (!wrap) return;
    wrap.classList.remove('checkpoint-pulse');
    void wrap.offsetWidth;
    wrap.classList.add('checkpoint-pulse');
    setTimeout(function () { wrap.classList.remove('checkpoint-pulse'); }, 700);
}

function maybeTriggerTypingCheckpoint() {
    var modes = ['lesson', 'practice', 'free', 'adaptive', 'replay-errors'];
    if (modes.indexOf(app.currentMode) === -1 || !app._checkpointStep) return;
    var total = app.totalChars || 0;
    if (total < 22) return;
    while (app._checkpointNext > 0 && app.currentPosition >= app._checkpointNext && app.currentPosition < total) {
        playSound('checkpoint');
        flashCheckpointBar();
        if (typeof showToast === 'function') {
            showToast(t('checkpointDone'), 'success', '✓');
        }
        app._checkpointNext = Math.min(app._checkpointNext + app._checkpointStep, total);
    }
}

function updateCheckpointHintLine() {
    var el = document.getElementById('checkpointHintLine');
    if (!el) return;
    var modes = ['lesson', 'practice', 'free', 'adaptive', 'replay-errors'];
    if (modes.indexOf(app.currentMode) === -1 || !app._checkpointStep || app.totalChars < 22) {
        el.textContent = '';
        el.classList.add('opacity-0');
        return;
    }
    var nextAt = app._checkpointNext || 0;
    var left = Math.max(0, nextAt - app.currentPosition);
    el.classList.remove('opacity-0');
    if (left <= 0 || app.currentPosition >= app.totalChars - 1) {
        el.textContent = t('checkpointAlmost');
    } else {
        el.textContent = t('checkpointNext') + ' ' + left;
    }
}

function buildUniqueErrorSnippets() {
    var list = app._errorSnippetList || [];
    var seen = {};
    var out = [];
    list.forEach(function (s) {
        var x = String(s || '').trim();
        if (x.length < 2) return;
        if (seen[x]) return;
        seen[x] = 1;
        out.push(x);
    });
    return out.slice(0, 14);
}

function buildErrorReplayTextFromSnippets(snippets) {
    if (!snippets || !snippets.length) return '';
    var text = snippets.join('  ');
    if (text.length > 380) text = text.slice(0, 380);
    var sp = text.lastIndexOf(' ');
    if (sp > 120) text = text.slice(0, sp);
    return text;
}

/** Оставшееся время дриля ошибок (на паузе — «заморожено», пока дедлайн не сдвинут) */
function getReplaySecondsRemaining() {
    if (!app._replayDeadline) return 0;
    if (app.isPaused && app._replayPausedAt != null) {
        return Math.max(0, Math.ceil((app._replayDeadline - app._replayPausedAt) / 1000));
    }
    return Math.max(0, Math.ceil((app._replayDeadline - Date.now()) / 1000));
}

function updateReplayDeadlineUI() {
    var el = document.getElementById('replayDeadlineLine');
    if (!el) return;
    if (app.currentMode !== 'replay-errors' || !app._replayDeadline) {
        el.classList.add('hidden');
        el.textContent = '';
        return;
    }
    el.textContent = trReplace('replayTimeLeft', { s: String(getReplaySecondsRemaining()) });
    el.classList.remove('hidden');
}

function startErrorReplayPractice() {
    var modal = DOM.get('resultsModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    var profileScreen = document.getElementById('profileScreen');
    if (profileScreen && !profileScreen.classList.contains('hidden')) profileScreen.classList.add('hidden');
    var sn = app._lastErrorReplaySnippets && app._lastErrorReplaySnippets.length
        ? app._lastErrorReplaySnippets
        : buildUniqueErrorSnippets();
    var text = buildErrorReplayTextFromSnippets(sn);
    if (!text || text.length < 3) return;
    app._replayTimeLimitSec = 60;
    startPractice(text, 'replay-errors', null);
}

function buildCoachTipFromSession() {
    var errN = app.errors || 0;
    if (errN < 2) return '';
    var afterSp = app._errorsAfterSpaceCount || 0;
    var pairs = app._errorPairCounts || {};
    var bestPair = '';
    var bestN = 0;
    Object.keys(pairs).forEach(function (p) {
        if (pairs[p] > bestN) { bestN = pairs[p]; bestPair = p; }
    });
    if (afterSp >= 2 && afterSp >= bestN * 0.65) {
        return t('coachAfterSpace');
    }
    if (bestPair.length === 2 && bestN >= 2) {
        return trReplace('coachBigram', { pair: bestPair });
    }
    if (bestPair.length >= 1 && bestN >= 1) {
        return trReplace('coachBigram', { pair: bestPair });
    }
    return '';
}

function computeResultSpeedInsights(currentSpeed) {
    var out = { medianLine: '', yesterdayLine: '' };
    if (!window.statsModule || !window.statsModule.getRecentSessions) return out;
    var all = window.statsModule.getRecentSessions(45);
    if (!all.length) return out;
    var now = Date.now();
    var weekStart = now - 7 * 86400000;
    var speeds = [];
    for (var i = 1; i < all.length; i++) {
        var s = all[i];
        if (s.timestamp >= weekStart && s.speed > 0) speeds.push(s.speed);
    }
    speeds.sort(function (a, b) { return a - b; });
    var median = 0;
    if (speeds.length) {
        var mid = Math.floor(speeds.length / 2);
        median = speeds.length % 2 ? speeds[mid] : Math.round((speeds[mid - 1] + speeds[mid]) / 2);
    }
    if (median > 0 && currentSpeed > 0) {
        var d = currentSpeed - median;
        var sign = d > 0 ? '+' : '';
        out.medianLine = trReplace('resultVsWeekMedian', { sign: sign, n: Math.abs(d), m: median });
    }
    var yStr = streakDateStr(new Date(Date.now() - 86400000));
    var yBest = 0;
    var sessions = window.statsModule.data && window.statsModule.data.sessions ? window.statsModule.data.sessions : [];
    for (var j = 0; j < sessions.length; j++) {
        var ss = sessions[j];
        if (!ss || !ss.timestamp) continue;
        if (streakDateStr(new Date(ss.timestamp)) !== yStr) continue;
        if (ss.speed > yBest) yBest = ss.speed;
    }
    if (yBest > 0 && currentSpeed > 0) {
        var dy = currentSpeed - yBest;
        var sg = dy > 0 ? '+' : '';
        out.yesterdayLine = trReplace('resultVsYesterday', { y: yBest, sign: sg, d: Math.abs(dy) });
    }
    return out;
}

// Show lesson list - ОПТИМИЗИРОВАНА с DocumentFragment
function showLessonList(levelData) {
    currentLevelData = levelData;
    const container = DOM.get('lessonsList');
    if (!container) return;
    
    const levelDisplayName = app.lang === 'en' ? levelData.name_en : (app.lang === 'ua' ? (levelData.name_ua || levelData.name_ru) : levelData.name_ru);
    const titleEl = document.getElementById('lessonsScreenTitle');
    if (titleEl) titleEl.textContent = levelDisplayName.toUpperCase();

    var filterBar = document.getElementById('lessonDurationFilterBar');
    if (filterBar) {
        filterBar.classList.remove('hidden');
        updateLessonFilterBarStyles();
    }
    
    container.classList.remove('difficulty-grid');
    // Используем DocumentFragment для batch updates
    const fragment = document.createDocumentFragment();

    var lessonsToShow = levelData.lessons.slice();
    if (lessonDurationFilter === 'short') {
        lessonsToShow = lessonsToShow.filter(function (l) { return estimateLessonCharMid(l) <= LESSON_SHORT_CHAR_MAX; });
    }

    if (lessonsToShow.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'col-span-full text-center py-10 text-gray-400 text-sm px-4';
        empty.textContent = t('lessonFilterEmpty');
        fragment.appendChild(empty);
        container.innerHTML = '';
        container.appendChild(fragment);
        return;
    }
    
    lessonsToShow.forEach((lesson, index) => {
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
        const charLabel = formatLessonCharCountLabel(lesson);
        const charHint = typeof t === 'function' ? t('lessonCharsHint') : '';
        const charTagHtml = charLabel
            ? `<span class="lesson-card__tag lesson-card__tag--chars" title="${escapeHtml(charHint)}">${escapeHtml(charLabel)}</span>`
            : '';
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
                    ${charTagHtml}
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

// ------------------------------
// Ukrainian beginner lesson generator
// Goal: produce non-repetitive lesson targets (100-200 chars) consisting only of
// lowercase Ukrainian letters and spaces (no punctuation, no apostrophes).
// ------------------------------
const UA_BEGINNER_ALLOWED_LETTERS_RE = /[абвгґдеєжзиіїйклмнопрстуфхцчшщьюя]/i;
const UA_BEGINNER_WORD_STRIP_RE = /[^абвгґдеєжзиіїйклмнопрстуфхцчшщьюя]+/gi;
const UA_BEGINNER_FALLBACK_WORDS = [
    'дім', 'кіт', 'пес', 'мама', 'тато', 'вода', 'рука', 'нога', 'день', 'ніч', 'стіл', 'стілець',
    'вікно', 'двері', 'лампа', 'книга', 'сонце', 'місяць', 'зорі', 'небо', 'хмари', 'дощ', 'сніг',
    'вітер', 'море', 'річка', 'озеро', 'гора', 'ліс', 'трава', 'дерево', 'квітка', 'яблуко',
    'банан', 'апельсин', 'помідор', 'огірок', 'морква', 'картопля', 'капуста', 'сонячник',
    'кольори', 'червоний', 'зелений', 'синій', 'жовтий', 'фіолетовий', 'блакитний', 'білий',
    'весна', 'літо', 'осінь', 'зима', 'друг', 'друзі', 'любов', 'радість', 'надія', 'мрія',
    'гра', 'ігри', 'спорт', 'біг', 'плавання', 'теніс', 'велосипед', 'футбол', 'баскетбол',
    'школа', 'урок', 'завдання', 'зошит', 'ручка', 'олівець', 'клас', 'вчитель', 'учень', 'книга',
    'транспорт', 'машина', 'автобус', 'поїзд', 'літак', 'мотоцикл', 'дорога', 'швидко', 'тихо',
    'рано', 'вечір', 'ранок', 'вчора', 'сьогодні', 'завтра', 'добре', 'краще', 'повільно', 'порядок',
    'радісно', 'сміх', 'слухай', 'пиши', 'читай', 'вивчай', 'працюй', 'думай'
].map(w => String(w).toLowerCase());

function sanitizeUaBeginnerWord(word) {
    if (!word) return '';
    // Lowercase + keep only letters from the allowed Ukrainian alphabet.
    const lower = String(word).toLowerCase();
    const stripped = lower.replace(UA_BEGINNER_WORD_STRIP_RE, '');
    // Avoid pathological results (e.g. empty or non-letter-only).
    if (!stripped) return '';
    // Ensure we really have at least one allowed letter.
    if (!UA_BEGINNER_ALLOWED_LETTERS_RE.test(stripped)) return '';
    return stripped;
}

function cryptoRandInt(max) {
    if (max <= 0) return 0;
    try {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const arr = new Uint32Array(1);
            crypto.getRandomValues(arr);
            return arr[0] % max;
        }
    } catch (e) {}
    return Math.floor(Math.random() * max);
}

function cryptoShuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = cryptoRandInt(i + 1);
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

function generateUaBeginnerLessonText(poolText, minChars = 100, maxChars = 200) {
    const rawWords = String(poolText || '')
        .split(/\s+/)
        .map(s => sanitizeUaBeginnerWord(s))
        .filter(Boolean);

    let candidates = Array.from(new Set(rawWords));

    // Small pool (e.g. keyboard drills like "фіва олдж") — cycle through existing
    // words with shuffle instead of polluting with unrelated fallback vocabulary.
    const isSmallPool = candidates.length > 0 && candidates.length < 5;

    if (candidates.length === 0) {
        return 'дім кіт мама тато вода рука нога день ніч стіл стілець вікно двері лампа книга';
    }

    if (isSmallPool) {
        return generateCyclicWordText(candidates, minChars, maxChars);
    }

    // No fallback enrichment — keep only the lesson's own vocabulary.

    // Build targets without repeating words within a single output string.
    const maxAttempts = 12;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const shuffled = cryptoShuffle(candidates);
        const outWords = [];
        let outLen = 0;

        for (let i = 0; i < shuffled.length; i++) {
            const w = shuffled[i];
            const sep = outWords.length ? 1 : 0;
            const nextLen = outLen + sep + w.length;
            if (nextLen > maxChars) continue;
            outWords.push(w);
            outLen = nextLen;
            if (outLen >= minChars) break;
        }

        const outText = outWords.join(' ').trim().replace(/\s+/g, ' ');
        if (outText.length >= minChars && outText.length <= maxChars) {
            return outText;
        }
    }

    return generateShuffledPoolText(candidates, minChars, maxChars);
}

// More "sentence-like" UA beginner generator (still: only lowercase Ukrainian letters + spaces).
function generateUaBeginnerSentenceText(poolText, minChars = 100, maxChars = 200) {
    const poolLower = String(poolText || '').toLowerCase();
    const rawWords = String(poolText || '')
        .split(/\s+/)
        .map(s => sanitizeUaBeginnerWord(s))
        .filter(Boolean);

    let candidates = Array.from(new Set(rawWords));

    // Small/medium pool: delegate to the word-shuffler generator which handles
    // repetition correctly without injecting unrelated fallback vocabulary.
    // Threshold 14 covers: keyboard drills (2 words), standard vocabulary lessons (10-15 words).
    // Only pools with 14+ unique words (shop lessons, rich themed texts) use the sentence builder.
    if (candidates.length === 0) {
        return generateUaBeginnerLessonText(poolText, minChars, maxChars);
    }
    if (candidates.length < 14) {
        return generateUaBeginnerLessonText(poolText, minChars, maxChars);
    }

    // Never add unrelated fallback words — the sentence builder works only with
    // the lesson's own vocabulary so the output always matches the lesson topic.

    const helpers = [
        'я', 'ми', 'ти', 'він', 'вона', 'воно', 'це',
        'сьогодні', 'щодня', 'зараз', 'рано', 'ввечері', 'вночі',
        'та', 'і', 'але', 'бо', 'тому', 'потім', 'завжди'
    ].map(w => sanitizeUaBeginnerWord(w)).filter(Boolean);

    // Optional topic-neutral verbs to make sentence skeletons readable.
    const verbs = [
        'працюю', 'роблю', 'вчу', 'пишу', 'читаю', 'бачу', 'знаю', 'граю',
        'пакую', 'клею', 'продаю', 'вантажу', 'ремонтують', 'ремонтуємо', 'ремонтую',
        'допомагаю', 'навчаю', 'готую', 'вожу'
    ].map(w => sanitizeUaBeginnerWord(w)).filter(Boolean);

    // Keep a single subject for readability (1st person singular).
    const subjects = ['я'].map(w => sanitizeUaBeginnerWord(w)).filter(Boolean);

    // Choose a stable verb by topic keywords (to keep the sentence coherent).
    const has = (needle) => poolLower.includes(String(needle || '').toLowerCase());
    let fixedVerb = null;
    if (has('клей') || has('стикер') || has('етикет') || has('наклей') || has('клейщик')) fixedVerb = 'клею';
    else if (has('пакет') || has('короб') || has('комплект') || has('замов') || has('посил') || has('посилка')) fixedVerb = 'пакую';
    else if (has('вантаж') || has('груз') || has('ящик') || has('грузчик')) fixedVerb = 'вантажу';
    else if (has('продав') || has('магазин') || has('клієнт') || has('клиент') || has('чек') || has('покуп')) fixedVerb = 'продаю';
    else if (has('айтіш') || has('айти') || has('код') || has('програма') || has('сервер') || has('тест')) fixedVerb = 'пишу';
    else if (has('вчитель') || has('учень') || has('урок') || has('навч')) fixedVerb = 'вчу';
    else if (has('водій') || has('маршрут') || has('кермо') || has('водiй')) fixedVerb = 'керую';
    else if (has('ножиці') || has('ножи') || has('ножиц') || has('стриж') || has('перукар') || has('гребін')) fixedVerb = 'стрижу';
    else if (has('фарб') || has('пензель') || has('валик') || has('маляр')) fixedVerb = 'малюю';
    else if (has('ремонт') || has('сервіс') || has('сервис') || has('гайка') || has('болт') || has('слюсар') || has('механ')) fixedVerb = 'ремонтую';
    else if (has('полив') || has('садівник') || has('садов') || has('квітка') || has('квитка') || has('квiтка')) fixedVerb = 'поливаю';
    else if (has('кухня') || has('суп') || has('каша') || has('борщ') || has('кондитер') || has('торт')) fixedVerb = 'готую';
    else if (has('лікар') || has('ліки')) fixedVerb = 'лікую';
    else if (has('поштар') || has('лист')) fixedVerb = 'відправляю';
    else fixedVerb = 'працюю';
    fixedVerb = sanitizeUaBeginnerWord(fixedVerb) || 'працюю';

    // Coherent beginner sentence attempt (no punctuation, only words from pool).
    // If we can fit 100-200 chars, return immediately to avoid "word salad".
    // poolLower and has(...) are already defined above in this function.
    const adverbsUa = ['акуратно', 'точно', 'спритно', 'швидко', 'повільно', 'уважно', 'спокійно', 'впевнено', 'чітко'].map(w => sanitizeUaBeginnerWord(w)).filter(Boolean);
    let fixedAdverb = null;
    if (has('акурат') || has('рівно') || has('безп') || has('помилка')) fixedAdverb = 'акуратно';
    else if (has('швидко') || has('швид')) fixedAdverb = 'швидко';
    else if (has('сприт')) fixedAdverb = 'спритно';
    else if (has('повіль')) fixedAdverb = 'повільно';
    else fixedAdverb = 'точно';
    fixedAdverb = sanitizeUaBeginnerWord(fixedAdverb) || adverbsUa[0] || 'точно';

    const goalWordsUa = ['порядок', 'точність', 'спокій', 'успіх', 'впевненість', 'увага', 'знання', 'радість', 'мрія', 'терпіння'].map(w => sanitizeUaBeginnerWord(w)).filter(Boolean);
    let fixedGoal = null;
    if (has('поряд') || has('склад') || has('комплект') || has('короб')) fixedGoal = 'порядок';
    else if (has('етик') || has('стік') || has('клей')) fixedGoal = 'точність';
    else if (has('вантаж') || has('вантаж')) fixedGoal = 'успіх';
    else if (has('айті') || has('код') || has('тест')) fixedGoal = 'впевненість';
    else if (has('вчитель') || has('урок') || has('знання')) fixedGoal = 'знання';
    else fixedGoal = 'точність';
    fixedGoal = sanitizeUaBeginnerWord(fixedGoal) || goalWordsUa[0] || 'точність';

    const stopWordsUa = new Set([
        'я', 'і', 'та', 'але', 'бо', 'тому', 'потім', 'завжди', 'це', 'щоб',
        'сьогодні', 'щодня', 'зараз', 'рано', 'ввечері', 'вночі'
    ].map(w => sanitizeUaBeginnerWord(w)).filter(Boolean));

    const objCandidates = candidates
        .filter(w => w && !stopWordsUa.has(w))
        .filter(w => w !== fixedVerb && w !== fixedAdverb && w !== fixedGoal)
        .slice();

    const pickUnique = () => {
        const available = objCandidates.filter(w => !used.has(w));
        const w = available.length ? available[cryptoRandInt(available.length)] : null;
        if (w) used.add(w);
        return w;
    };

    // Build: {time} я {verb} {obj1} і {obj2} щоб {goal} та {obj3} {adverb}
    // (word order is intentionally fixed for readability).
    const templateTimeWords = ['сьогодні', 'щодня', 'зараз', 'рано', 'ввечері'];
    const timeCandidates = templateTimeWords.filter(w => !stopWordsUa.has(w));
    const time = timeCandidates.length
        ? timeCandidates[cryptoRandInt(timeCandidates.length)]
        : (templateTimeWords.length ? templateTimeWords[cryptoRandInt(templateTimeWords.length)] : null);
    const connectorI = sanitizeUaBeginnerWord('і') || 'і';
    const connectorTa = sanitizeUaBeginnerWord('та') || 'та';
    const wordShchob = sanitizeUaBeginnerWord('щоб') || 'щоб';

    const used = new Set();
    const obj1 = pickUnique();
    const obj2 = pickUnique();
    const obj3 = pickUnique();
    const subj = sanitizeUaBeginnerWord('я') || 'я';
    const verb = fixedVerb;
    const adverb = fixedAdverb;
    const goal = fixedGoal;

    if (time && obj1 && obj2 && obj3) {
        let attemptWords = [time, subj, verb, obj1, connectorI, obj2, wordShchob, goal, connectorTa, obj3, adverb]
            .map(w => sanitizeUaBeginnerWord(w))
            .filter(Boolean);

        let attemptText = attemptWords.join(' ').replace(/\s+/g, ' ').trim();

        // Extend until we hit 100-200 chars (still without changing the grammar skeleton too much).
        const usedObjs = new Set([obj1, obj2, obj3].filter(Boolean));
        let loops = 0;
        while (attemptText.length < minChars && loops < 60) {
            loops++;
            const availableObjs = objCandidates.filter(w => w && !usedObjs.has(w));
            const poolForPick = availableObjs.length ? availableObjs : objCandidates.filter(Boolean);
            if (!poolForPick.length) break;
            const nextObj = poolForPick[cryptoRandInt(poolForPick.length)];
            const connector = cryptoRandInt(2) === 0 ? connectorI : connectorTa;
            const candidateWords = attemptWords.concat([connector, nextObj]);
            const candidateText = candidateWords.join(' ').replace(/\s+/g, ' ').trim();
            if (candidateText.length > maxChars) break;
            attemptWords = candidateWords;
            attemptText = candidateText;
            usedObjs.add(nextObj);
        }

        if (attemptText.length >= minChars && attemptText.length <= maxChars) return attemptText;
    }

    candidates = Array.from(new Set(candidates.concat(helpers)));
    const connectors = ['і', 'та', 'але', 'бо', 'тому', 'потім'];
    // templateTimeWords is already defined above (used by the coherent skeleton).

    const templates = [
        // Skeletons (fixed words + placeholders from candidates).
        ['{time}', '{subj}', '{verb}', '{w}', '{w}', 'та', '{w}', '{w}', 'і', '{w}', '{w}'],
        ['{time}', '{subj}', '{verb}', '{w}', '{w}', 'і', '{w}', '{w}', 'та', '{w}', '{w}'],
        ['{time}', '{subj}', '{verb}', '{w}', 'і', '{w}', '{w}', 'але', '{w}', '{w}'],
        ['{time}', '{subj}', '{verb}', '{w}', '{w}', 'та', '{w}', '{w}', 'бо', '{w}', '{w}'],
        ['{time}', '{subj}', '{verb}', '{w}', '{w}', 'і', '{w}', 'та', '{w}', '{w}', 'завжди']
    ];

    const pickRandom = (arr) => {
        if (!arr || arr.length === 0) return null;
        return arr[cryptoRandInt(arr.length)];
    };

    const maxAttempts = 24;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const template = templates[cryptoRandInt(templates.length)];
        const used = new Set();
        const outWords = [];
        let outLen = 0;

        let ok = true;

        for (let i = 0; i < template.length; i++) {
            const token = template[i];
            let word = null;

            if (token === '{w}') {
                const available = candidates.filter(w => !used.has(w) && !w.includes('ґ'));
                word = pickRandom(available);
            } else if (token === '{verb}') {
                word = fixedVerb;
            } else if (token === '{subj}') {
                const available = subjects.filter(w => !used.has(w) && !w.includes('ґ'));
                word = pickRandom(available);
            } else if (token === '{time}') {
                word = pickRandom(templateTimeWords.filter(w => !used.has(w) && !w.includes('ґ')));
            } else {
                word = sanitizeUaBeginnerWord(token);
                if (!word) ok = false;
            }

            if (!ok || !word) {
                ok = false;
                break;
            }

            // Enforce no word repeats in the output.
            if (used.has(word)) {
                ok = false;
                break;
            }

            const sepLen = outWords.length ? 1 : 0;
            if (outLen + sepLen + word.length > maxChars) {
                ok = false;
                break;
            }

            outWords.push(word);
            used.add(word);
            outLen += sepLen + word.length;
        }

        if (!ok) continue;

        // Append extra words (with occasional connectors) to reach 100-200 chars.
        let safeLoops = 0;
        while (outLen < minChars && safeLoops < 60) {
            safeLoops++;

            // If we can, sometimes insert a connector + a word.
            const insertConnector = outLen + 1 + 1 < maxChars && cryptoRandInt(100) < 35;
            if (insertConnector) {
                const availableConnector = connectors.filter(c => !used.has(c) && !c.includes('ґ'));
                const connector = pickRandom(availableConnector);
                const available = candidates.filter(w => !used.has(w) && !w.includes('ґ'));
                const next = pickRandom(available);
                if (connector && next) {
                    const sep1 = outWords.length ? 1 : 0;
                    const sep2 = 1; // between connector and next word
                    const addLen = connector.length + sep1 + next.length + sep2;
                    if (outLen + addLen <= maxChars) {
                        outWords.push(connector);
                        outWords.push(next);
                        used.add(connector);
                        used.add(next);
                        outLen += addLen;
                        continue;
                    }
                }
            }

            // Fallback: just append a content word.
            const available = candidates.filter(w => !used.has(w) && !w.includes('ґ'));
            const w = pickRandom(available);
            if (!w) break;
            const sepLen = outWords.length ? 1 : 0;
            if (outLen + sepLen + w.length > maxChars) break;
            outWords.push(w);
            used.add(w);
            outLen += sepLen + w.length;
        }

        // Validate final length.
        if (outLen >= minChars && outLen <= maxChars) {
            const outText = outWords.join(' ').replace(/\s+/g, ' ').trim();
            if (outText.length >= minChars && outText.length <= maxChars) {
                return outText;
            }
        }
    }

    // Fallback to the word bag generator (also uses shared helpers internally).
    return generateUaBeginnerLessonText(poolText, minChars, maxChars);
}

// ------------------------------
// Shared helpers for all language beginner generators
// ------------------------------

// Cyclic shuffle: repeat a small word set until minChars is reached (for keyboard drills).
function generateCyclicWordText(words, minChars, maxChars) {
    const outWords = [];
    let outLen = 0;
    let pass = 0;
    while (outLen < minChars && pass < 60) {
        const shuffled = cryptoShuffle(words.slice());
        for (let i = 0; i < shuffled.length; i++) {
            const w = shuffled[i];
            const sep = outWords.length ? 1 : 0;
            const nextLen = outLen + sep + w.length;
            if (nextLen > maxChars) break;
            outWords.push(w);
            outLen = nextLen;
            if (outLen >= minChars) break;
        }
        pass++;
    }
    const result = outWords.join(' ').trim();
    if (result.length >= minChars) return result;
    // Ultimate fallback for extremely short words
    return (words.join(' ') + ' ').repeat(Math.ceil(minChars / (words.join(' ').length + 1))).trim().slice(0, maxChars);
}

// Pool shuffler: shuffle pool words and cycle if total pool chars < minChars (for vocab lessons).
function generateShuffledPoolText(words, minChars, maxChars) {
    const totalChars = words.reduce((s, w) => s + w.length, 0) + Math.max(0, words.length - 1);
    if (totalChars < minChars) {
        return generateCyclicWordText(words, minChars, maxChars);
    }
    const maxAttempts = 12;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const shuffled = cryptoShuffle(words.slice());
        const outWords = [];
        let outLen = 0;
        for (let i = 0; i < shuffled.length; i++) {
            const w = shuffled[i];
            const sep = outWords.length ? 1 : 0;
            const nextLen = outLen + sep + w.length;
            if (nextLen > maxChars) continue;
            outWords.push(w);
            outLen = nextLen;
            if (outLen >= minChars) break;
        }
        const text = outWords.join(' ').trim().replace(/\s+/g, ' ');
        if (text.length >= minChars && text.length <= maxChars) return text;
    }
    // Last resort: just join all words
    return words.join(' ').slice(0, maxChars);
}

// ------------------------------
// RU/EN beginner generators
// Keep output lowercase letters + spaces only (no punctuation).
// ------------------------------
function sanitizeRuBeginnerWord(word) {
    if (!word) return '';
    const lower = String(word).toLowerCase();
    // Keep only lowercase Russian letters (incl. ё).
    const stripped = lower.replace(/[^абвгдеёжзиийклмнопрстуфхцчшщъыьэюя]+/gi, '');
    if (!/[абвгдеёжзиийклмнопрстуфхцчшщъыьэюя]/i.test(stripped)) return '';
    return stripped;
}

function sanitizeEnBeginnerWord(word) {
    if (!word) return '';
    const lower = String(word).toLowerCase();
    const stripped = lower.replace(/[^a-z]+/g, '');
    if (!/[a-z]/i.test(stripped)) return '';
    return stripped;
}

function generateRuBeginnerSentenceText(poolText, minChars = 100, maxChars = 200) {
    const poolLower = String(poolText || '').toLowerCase();
    const rawWords = String(poolText || '')
        .split(/\s+/)
        .map(s => sanitizeRuBeginnerWord(s))
        .filter(Boolean);

    let candidates = Array.from(new Set(rawWords));

    if (candidates.length === 0) return 'я учусь печатать и читаю слова';

    // Small pool (keyboard drills like "фыва олдж"): cyclic repetition, no foreign words.
    if (candidates.length < 5) {
        return generateCyclicWordText(candidates, minChars, maxChars);
    }
    // Medium pool (standard vocabulary lessons 5-17 words): shuffle pool-only, no sentence builder.
    if (candidates.length < 17) {
        return generateShuffledPoolText(candidates, minChars, maxChars);
    }

    // Beginner readability: always use 1st person singular.
    const subjects = ['я'];
    const times = ['сегодня', 'вчера', 'завтра', 'утром', 'вечером', 'ночью', 'днем', 'теперь', 'всегда'];
    const verbs = ['учусь', 'пишу', 'читаю', 'делаю', 'знаю', 'вижу', 'помню', 'повторяю', 'практикую', 'тренируюсь'];
    const connectors = ['и', 'а', 'но', 'потом', 'снова', 'тогда'];

    // Choose a stable verb by keywords.
    const has = (needle) => poolLower.includes(String(needle || '').toLowerCase());
    let fixedVerb = null;
    if (has('клей') || has('стикер') || has('наклей')) fixedVerb = 'клею';
    else if (has('склад') || has('заказ') || has('комплект') || has('короб') || has('упаков')) fixedVerb = 'комплектую';
    else if (has('груз') || has('ящик')) fixedVerb = 'гружу';
    else if (has('продав') || has('магазин') || has('клиент') || has('чек')) fixedVerb = 'продаю';
    else if (has('айтиш') || has('код') || has('программа') || has('сервер') || has('тест')) fixedVerb = 'пишу';
    else if (has('учитель') || has('учен') || has('урок') || has('знани')) fixedVerb = 'учу';
    else if (has('водител') || has('маршрут') || has('руль')) fixedVerb = 'вожу';
    else fixedVerb = 'учусь';
    fixedVerb = sanitizeRuBeginnerWord(fixedVerb) || 'учусь';

    // Coherent beginner sentence attempt to avoid "word salad".
    // Pattern: {time} я {verb} {obj1} и {obj2} чтобы {goal} и {obj3} {adverb}
    const adverbsRu = ['аккуратно', 'точно', 'спритно', 'быстро', 'внимательно', 'спокойно', 'уверенно', 'сосредоточенно', 'чётко']
        .map(w => sanitizeRuBeginnerWord(w))
        .filter(Boolean);
    let fixedAdverb = 'точно';
    if (has('аккурат') || has('ровн')) fixedAdverb = 'аккуратно';
    else if (has('внимат')) fixedAdverb = 'внимательно';
    else if (has('быстр') || has('швидк')) fixedAdverb = 'быстро';
    else if (has('споко')) fixedAdverb = 'спокойно';
    else if (has('увер')) fixedAdverb = 'уверенно';
    fixedAdverb = sanitizeRuBeginnerWord(fixedAdverb) || adverbsRu[0] || 'точно';

    const goalWordsRu = ['порядок', 'точность', 'спокойствие', 'успех', 'уверенность', 'внимание', 'знания', 'терпение', 'радость', 'мечта']
        .map(w => sanitizeRuBeginnerWord(w))
        .filter(Boolean);
    let fixedGoal = 'точность';
    if (has('склад') || has('поряд')) fixedGoal = 'порядок';
    else if (has('клей') || has('стикер') || has('накле')) fixedGoal = 'точность';
    else if (has('груз') || has('вантаж')) fixedGoal = 'успех';
    else if (has('код') || has('тест') || has('программ')) fixedGoal = 'уверенность';
    else if (has('вчитель') || has('урок') || has('знан')) fixedGoal = 'знания';
    fixedGoal = sanitizeRuBeginnerWord(fixedGoal) || goalWordsRu[0] || 'точность';

    const stopWordsRu = new Set([
        'я', 'и', 'а', 'но', 'потом', 'снова', 'тогда',
        'сегодня', 'вчера', 'завтра', 'утром', 'вечером', 'ночью', 'днем', 'теперь', 'всегда',
        'чтобы'
    ].map(w => sanitizeRuBeginnerWord(w)).filter(Boolean));

    const objCandidates = candidates
        .filter(w => w && !stopWordsRu.has(w))
        .filter(w => w !== fixedVerb && w !== fixedAdverb && w !== fixedGoal)
        .slice();

    const timeCandidates = times.filter(w => !stopWordsRu.has(w));
    const time = timeCandidates.length ? timeCandidates[cryptoRandInt(timeCandidates.length)] : (times.length ? times[cryptoRandInt(times.length)] : null);

    const used = new Set();
    [fixedVerb, fixedGoal, fixedAdverb].forEach(w => { if (w) used.add(w); });
    const pickUnique = () => {
        const available = objCandidates.filter(w => !used.has(w));
        if (!available.length) return null;
        const w = available[cryptoRandInt(available.length)];
        used.add(w);
        return w;
    };

    const obj1 = pickUnique();
    const obj2 = pickUnique();
    const obj3 = pickUnique();
    const wordChToBy = sanitizeRuBeginnerWord('чтобы') || 'чтобы';

    if (time && obj1 && obj2 && obj3) {
        let attemptWords = [time, 'я', fixedVerb, obj1, 'и', obj2, wordChToBy, fixedGoal, 'и', obj3, fixedAdverb]
            .map(w => sanitizeRuBeginnerWord(w))
            .filter(Boolean);
        let attemptText = attemptWords.join(' ').replace(/\s+/g, ' ').trim();

        // Extend until we hit 100-200 chars.
        const usedObjs = new Set([obj1, obj2, obj3].filter(Boolean));
        let loops = 0;
        while (attemptText.length < minChars && loops < 60) {
            loops++;
            const availableObjs = objCandidates.filter(w => w && !usedObjs.has(w));
            const poolForPick = availableObjs.length ? availableObjs : objCandidates.filter(Boolean);
            if (!poolForPick.length) break;
            const nextObj = poolForPick[cryptoRandInt(poolForPick.length)];
            const candidateWords = attemptWords.concat(['и', nextObj]);
            const candidateText = candidateWords.join(' ').replace(/\s+/g, ' ').trim();
            if (candidateText.length > maxChars) break;
            attemptWords = candidateWords;
            attemptText = candidateText;
            usedObjs.add(nextObj);
        }

        if (attemptText.length >= minChars && attemptText.length <= maxChars) return attemptText;
    }

    const templates = [
        ['{time}', '{subj}', '{verb}', '{w}', '{w}', '{c}', '{w}', '{w}'],
        ['{time}', '{subj}', '{verb}', '{w}', '{w}', 'и', '{w}', '{w}', '{c}'],
        ['{time}', '{subj}', '{verb}', '{w}', 'и', '{w}', '{w}', '{c}', '{w}'],
        ['{time}', '{subj}', '{verb}', '{w}', '{c}', '{w}', '{w}', 'и', '{w}']
    ];

    const pickRandom = (arr) => {
        if (!arr || arr.length === 0) return null;
        return arr[cryptoRandInt(arr.length)];
    };

    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const template = templates[cryptoRandInt(templates.length)];
        const used = new Set();
        const outWords = [];
        let outLen = 0;
        let ok = true;

        for (let i = 0; i < template.length; i++) {
            const token = template[i];
            let word = null;
            if (token === '{w}') {
                word = pickRandom(candidates.filter(w => !used.has(w)));
            } else if (token === '{subj}') {
                word = pickRandom(subjects.filter(w => !used.has(w)));
            } else if (token === '{verb}') {
                word = fixedVerb;
            } else if (token === '{time}') {
                word = pickRandom(times.filter(w => !used.has(w)));
            } else if (token === '{c}') {
                word = pickRandom(connectors.filter(w => !used.has(w)));
            } else {
                word = sanitizeRuBeginnerWord(token);
            }

            if (!word) {
                ok = false;
                break;
            }
            // No repeats in a single output.
            if (used.has(word)) {
                ok = false;
                break;
            }

            const sepLen = outWords.length ? 1 : 0;
            if (outLen + sepLen + word.length > maxChars) {
                ok = false;
                break;
            }

            outWords.push(word);
            used.add(word);
            outLen += sepLen + word.length;
        }

        if (!ok) continue;

        // Fill a bit to reach 100-200 chars.
        let safeLoops = 0;
        while (outLen < minChars && safeLoops < 60) {
            safeLoops++;
            const insertConnector = outLen + 2 < maxChars && cryptoRandInt(100) < 30;
            if (insertConnector) {
                const c = pickRandom(connectors.filter(x => !used.has(x)));
                const w = pickRandom(candidates.filter(x => !used.has(x)));
                if (!c || !w) break;
                const addLen = c.length + 1 + w.length + (outWords.length ? 1 : 0) + 1; // spaces: before c + between + before w
                if (outLen + addLen > maxChars) break;
                outWords.push(c);
                outWords.push(w);
                used.add(c);
                used.add(w);
                outLen += 1 + c.length + 1 + w.length;
            } else {
                const w = pickRandom(candidates.filter(x => !used.has(x)));
                if (!w) break;
                const sepLen = outWords.length ? 1 : 0;
                if (outLen + sepLen + w.length > maxChars) break;
                outWords.push(w);
                used.add(w);
                outLen += sepLen + w.length;
            }
        }

        if (outLen >= minChars && outLen <= maxChars) {
            const outText = outWords.join(' ').replace(/\s+/g, ' ').trim();
            if (outText.length >= minChars && outText.length <= maxChars) return outText;
        }
    }

    // Fallback to simple RU word-bag (still: lowercase letters + spaces only).
    const shuffled = cryptoShuffle(candidates);
    const outWords = [];
    let outLen = 0;
    for (let i = 0; i < shuffled.length; i++) {
        const w = shuffled[i];
        const sepLen = outWords.length ? 1 : 0;
        const nextLen = outLen + sepLen + w.length;
        if (nextLen > maxChars) continue;
        outWords.push(w);
        outLen = nextLen;
        if (outLen >= minChars) break;
    }
    return outWords.join(' ').trim().replace(/\s+/g, ' ');
}

function generateEnBeginnerSentenceText(poolText, minChars = 100, maxChars = 200) {
    const poolLower = String(poolText || '').toLowerCase();
    const rawWords = String(poolText || '')
        .split(/\s+/)
        .map(s => sanitizeEnBeginnerWord(s))
        .filter(Boolean);

    let candidates = Array.from(new Set(rawWords));

    if (candidates.length === 0) return 'i practice typing and read words';

    // Small pool (keyboard drills): cyclic repetition, no foreign words.
    if (candidates.length < 5) {
        return generateCyclicWordText(candidates, minChars, maxChars);
    }
    // Medium pool (standard vocabulary lessons): shuffle pool-only, no sentence builder.
    if (candidates.length < 17) {
        return generateShuffledPoolText(candidates, minChars, maxChars);
    }

    // Beginner readability: always use "i".
    const subjects = ['i'];
    const times = ['today', 'now', 'morning', 'evening', 'night', 'always', 'then'];
    const verbs = ['type', 'learn', 'read', 'write', 'practice', 'repeat', 'improve', 'focus'];
    const connectors = ['and', 'but', 'then', 'because', 'so', 'always'];

    // Choose a stable verb by keywords.
    const has = (needle) => poolLower.includes(String(needle || '').toLowerCase());
    let fixedVerb = null;
    if (has('warehouse') || has('pack') || has('order') || has('box')) fixedVerb = 'pack';
    else if (has('sticker') || has('label')) fixedVerb = 'stick';
    else if (has('loader') || has('load') || has('crate') || has('cargo')) fixedVerb = 'load';
    else if (has('seller') || has('shop') || has('customer')) fixedVerb = 'sell';
    else if (has('it') || has('code') || has('program') || has('server') || has('test')) fixedVerb = 'code';
    else if (has('driver') || has('route') || has('car')) fixedVerb = 'drive';
    else if (has('read') || has('book') || has('words')) fixedVerb = 'read';
    else fixedVerb = 'type';
    fixedVerb = sanitizeEnBeginnerWord(fixedVerb) || 'type';

    // Coherent beginner sentence attempt to avoid "word salad".
    // Pattern: {time} i {verb} {obj1} and {obj2} so {goal} and {obj3} {adverb}
    const adverbsEn = ['carefully', 'accurately', 'clearly', 'steadily', 'calmly', 'quickly', 'confidently', 'patiently']
        .map(w => sanitizeEnBeginnerWord(w))
        .filter(Boolean);
    let fixedAdverb = 'clearly';
    if (has('care') || has('accur')) fixedAdverb = 'carefully';
    else if (has('fast') || has('quick')) fixedAdverb = 'quickly';
    else if (has('calm') || has('quiet')) fixedAdverb = 'calmly';
    fixedAdverb = sanitizeEnBeginnerWord(fixedAdverb) || adverbsEn[0] || 'clearly';

    const goalWordsEn = ['order', 'accuracy', 'focus', 'progress', 'calm', 'confidence', 'knowledge', 'success', 'clarity']
        .map(w => sanitizeEnBeginnerWord(w))
        .filter(Boolean);
    let fixedGoal = 'accuracy';
    if (has('order') || has('warehouse') || has('pack')) fixedGoal = 'order';
    else if (has('sticker') || has('label')) fixedGoal = 'accuracy';
    else if (has('code') || has('test') || has('program')) fixedGoal = 'confidence';
    else fixedGoal = 'focus';
    fixedGoal = sanitizeEnBeginnerWord(fixedGoal) || goalWordsEn[0] || 'accuracy';

    const stopWordsEn = new Set([
        'i', 'we', 'you', 'he', 'she', 'it',
        'and', 'but', 'then', 'because', 'so', 'always',
        'today', 'now', 'morning', 'evening', 'night', 'then'
    ].map(w => sanitizeEnBeginnerWord(w)).filter(Boolean));

    const objCandidates = candidates
        .filter(w => w && !stopWordsEn.has(w))
        .filter(w => w !== fixedVerb && w !== fixedAdverb && w !== fixedGoal)
        .slice();

    const timeCandidates = times.filter(w => !stopWordsEn.has(w));
    const time = timeCandidates.length ? timeCandidates[cryptoRandInt(timeCandidates.length)] : (times.length ? times[cryptoRandInt(times.length)] : null);

    const used = new Set();
    [fixedVerb, fixedGoal, fixedAdverb].forEach(w => { if (w) used.add(w); });
    const pickUnique = () => {
        const available = objCandidates.filter(w => !used.has(w));
        if (!available.length) return null;
        const w = available[cryptoRandInt(available.length)];
        used.add(w);
        return w;
    };

    const obj1 = pickUnique();
    const obj2 = pickUnique();
    const obj3 = pickUnique();
    const wordSo = sanitizeEnBeginnerWord('so') || 'so';

    if (time && obj1 && obj2 && obj3) {
        const attemptWords = [time, 'i', fixedVerb, obj1, 'and', obj2, wordSo, fixedGoal, 'and', obj3, fixedAdverb]
            .map(w => sanitizeEnBeginnerWord(w))
            .filter(Boolean);
        let attemptText = attemptWords.join(' ').replace(/\s+/g, ' ').trim();

        // Extend with more objects if we ended up slightly too short.
        const usedObjs = new Set([obj1, obj2, obj3].filter(Boolean));
        let loops = 0;
        while (attemptText.length < minChars && loops < 60) {
            loops++;
            const availableObjs = objCandidates.filter(w => w && !usedObjs.has(w));
            const poolForPick = availableObjs.length ? availableObjs : objCandidates.filter(Boolean);
            if (!poolForPick.length) break;
            const nextObj = poolForPick[cryptoRandInt(poolForPick.length)];
            const candidateWords = attemptWords.concat(['and', nextObj].filter(Boolean));
            const candidateText = candidateWords.join(' ').replace(/\s+/g, ' ').trim();
            if (candidateText.length > maxChars) break;
            attemptWords.push('and', nextObj);
            attemptText = candidateText;
            usedObjs.add(nextObj);
        }

        if (attemptText.length >= minChars && attemptText.length <= maxChars) return attemptText;
    }

    const templates = [
        ['{time}', '{subj}', '{verb}', '{w}', '{w}', '{c}', '{w}', '{w}'],
        ['{time}', '{subj}', '{verb}', '{w}', '{w}', 'and', '{w}', '{w}'],
        ['{time}', '{subj}', '{verb}', '{w}', 'and', '{w}', '{w}', '{c}', '{w}'],
        ['{time}', '{subj}', '{verb}', '{w}', '{c}', '{w}', '{w}', 'and', '{w}']
    ];

    const pickRandom = (arr) => {
        if (!arr || arr.length === 0) return null;
        return arr[cryptoRandInt(arr.length)];
    };

    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const template = templates[cryptoRandInt(templates.length)];
        const used = new Set();
        const outWords = [];
        let outLen = 0;
        let ok = true;

        for (let i = 0; i < template.length; i++) {
            const token = template[i];
            let word = null;
            if (token === '{w}') word = pickRandom(candidates.filter(w => !used.has(w)));
            else if (token === '{subj}') word = pickRandom(subjects.filter(w => !used.has(w)));
            else if (token === '{verb}') word = fixedVerb;
            else if (token === '{time}') word = pickRandom(times.filter(w => !used.has(w)));
            else if (token === '{c}') word = pickRandom(connectors.filter(w => !used.has(w)));
            else word = sanitizeEnBeginnerWord(token);

            if (!word || used.has(word)) {
                ok = false;
                break;
            }
            const sepLen = outWords.length ? 1 : 0;
            if (outLen + sepLen + word.length > maxChars) {
                ok = false;
                break;
            }
            outWords.push(word);
            used.add(word);
            outLen += sepLen + word.length;
        }

        if (!ok) continue;

        let safeLoops = 0;
        while (outLen < minChars && safeLoops < 60) {
            safeLoops++;
            const insertConnector = outLen + 2 < maxChars && cryptoRandInt(100) < 30;
            if (insertConnector) {
                const c = pickRandom(connectors.filter(x => !used.has(x)));
                const w = pickRandom(candidates.filter(x => !used.has(x)));
                if (!c || !w) break;
                const addLen = c.length + 1 + w.length + (outWords.length ? 1 : 0) + 1;
                if (outLen + addLen > maxChars) break;
                outWords.push(c);
                outWords.push(w);
                used.add(c);
                used.add(w);
                outLen += 1 + c.length + 1 + w.length;
            } else {
                const w = pickRandom(candidates.filter(x => !used.has(x)));
                if (!w) break;
                const sepLen = outWords.length ? 1 : 0;
                if (outLen + sepLen + w.length > maxChars) break;
                outWords.push(w);
                used.add(w);
                outLen += sepLen + w.length;
            }
        }

        if (outLen >= minChars && outLen <= maxChars) {
            const outText = outWords.join(' ').replace(/\s+/g, ' ').trim();
            if (outText.length >= minChars && outText.length <= maxChars) return outText;
        }
    }

    // Fallback to simple word bag from original.
    return String(poolText || '').toLowerCase().split(/\s+/).filter(Boolean).slice(0, 30).join(' ');
}

function loadRecentTexts(storageKey) {
    if (!storageKey) return [];
    try {
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveRecentTexts(storageKey, texts, maxHistory = 16) {
    if (!storageKey) return;
    try {
        const trimmed = Array.isArray(texts) ? texts.slice(-maxHistory) : [];
        localStorage.setItem(storageKey, JSON.stringify(trimmed));
    } catch (e) {
        // ignore
    }
}

function generateRuEnBeginnerUniqueText(poolText, lessonKey, layout, minChars = 100, maxChars = 200) {
    const storageKey = lessonKey ? (`ruen_beginner_recentTexts_${layout}_${lessonKey}`) : null;
    const recentTexts = loadRecentTexts(storageKey);

    const maxAttempts = 24;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const candidate = layout === 'ru'
            ? generateRuBeginnerSentenceText(poolText, minChars, maxChars)
            : generateEnBeginnerSentenceText(poolText, minChars, maxChars);
        if (!storageKey || !recentTexts.includes(candidate)) {
            if (storageKey) saveRecentTexts(storageKey, recentTexts.concat([candidate]), 16);
            return candidate;
        }
    }

    // Fallback: last candidate even if collision.
    const fallback = layout === 'ru'
        ? generateRuBeginnerSentenceText(poolText, minChars, maxChars)
        : generateEnBeginnerSentenceText(poolText, minChars, maxChars);
    if (storageKey) saveRecentTexts(storageKey, recentTexts.concat([fallback]), 16);
    return fallback;
}

function splitIntoSentenceChunks(text) {
    const s = String(text || '').trim();
    if (!s) return [];
    const re = /[^.!?]+[.!?]+|[^.!?]+$/g;
    const chunks = s.match(re) || [];
    return chunks.map(c => c.trim()).filter(Boolean);
}

function generateRuEnShuffledUniqueText(poolText, lessonKey, layout, minChars, maxChars) {
    const storageKey = lessonKey ? (`ruen_lesson_recentTexts_${layout}_${lessonKey}`) : null;
    const recentTexts = loadRecentTexts(storageKey);
    const poolTextStr = String(poolText || '');
    const originalLen = poolTextStr.length || 200;

    // Keep length in a similar order of magnitude to reduce UI surprises.
    const targetMin = minChars ?? Math.max(80, Math.round(originalLen * 0.85));
    const targetMax = maxChars ?? Math.min(4500, Math.max(targetMin + 20, Math.round(originalLen * 1.08)));

    const maxAttempts = 24;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const chunks = splitIntoSentenceChunks(poolTextStr);
        let candidate = '';

        if (chunks.length >= 2) {
            const maxUse = Math.min(4, chunks.length);
            // Choose subset size 2..maxUse (prefer more when text is short).
            const useCount = Math.min(maxUse, Math.max(2, cryptoRandInt(maxUse - 1) + 2));
            // Pick consecutive sentence chunks (keeps readability).
            const start = chunks.length - useCount > 0 ? cryptoRandInt(chunks.length - useCount + 1) : 0;
            const picked = chunks.slice(start, start + useCount);
            candidate = picked.join(' ').replace(/\s+/g, ' ').trim();
        } else {
            // Fallback: shuffle word tokens if we don't have sentence boundaries.
            const tokens = poolTextStr.split(/\s+/).filter(Boolean);
            // Fallback: take a contiguous token window (better readability than full shuffle).
            if (tokens.length) {
                const maxTokensUse = Math.min(80, tokens.length);
                const window = Math.max(30, cryptoRandInt(maxTokensUse));
                const start = tokens.length - window > 0 ? cryptoRandInt(tokens.length - window + 1) : 0;
                candidate = tokens.slice(start, start + window).join(' ').replace(/\s+/g, ' ').trim();
            }
        }

        if (!candidate) continue;
        if (candidate.length < targetMin || candidate.length > targetMax) continue;
        if (!storageKey || !recentTexts.includes(candidate)) {
            if (storageKey) saveRecentTexts(storageKey, recentTexts.concat([candidate]), 16);
            return candidate;
        }
    }

    // Final fallback: use simple sentence chunk reorder; may collide but still works.
    const chunks = splitIntoSentenceChunks(poolTextStr);
    // Prefer consecutive sentences for final fallback too.
    const fallback = chunks.length >= 2
        ? (() => {
            const useCount = Math.min(chunks.length, 3);
            const start = chunks.length - useCount > 0 ? cryptoRandInt(chunks.length - useCount + 1) : 0;
            return chunks.slice(start, start + useCount).join(' ').replace(/\s+/g, ' ').trim();
        })()
        : cryptoShuffle(poolTextStr.split(/\s+/).filter(Boolean)).join(' ');
    if (storageKey) saveRecentTexts(storageKey, recentTexts.concat([fallback]), 16);
    return fallback;
}

function generateUaBeginnerLessonTextUnique(poolText, lessonKey, minChars = 100, maxChars = 200) {
    const storageKey = lessonKey ? `ua_beginner_lastText_${lessonKey}` : null;
    let lastText = null;
    if (storageKey) {
        try { lastText = localStorage.getItem(storageKey); } catch (e) { lastText = null; }
    }

    // Try a few times to avoid producing exactly the same target text.
    const maxAttempts = 8;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const candidate = generateUaBeginnerLessonText(poolText, minChars, maxChars);
        if (!storageKey || !lastText || candidate !== lastText) {
            if (storageKey) {
                try { localStorage.setItem(storageKey, candidate); } catch (e) {}
            }
            return candidate;
        }
    }

    // Best-effort fallback if we couldn't avoid a collision.
    const fallback = generateUaBeginnerLessonText(poolText, minChars, maxChars);
    if (storageKey) {
        try { localStorage.setItem(storageKey, fallback); } catch (e) {}
    }
    return fallback;
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
    
    // Очищаем переменные теста на скорость и паузы
    app.speedTestStartTime = null;
    app.speedTestEndTime = null;
    app.pauseStartTime = null;
    app.totalLessonPauseDuration = 0;
    app._pauseStartAt = null;

    // Сбрасываем кэш ошибок текущей сессии и запускаем flush-таймер
    _keyErrorsCache = {};
    _startKeyErrorsFlushTimer();

    // Запускаем запись истории скорости для WPM-графика
    if (window.wpmChartModule) window.wpmChartModule.startRecording();
    
    app.currentMode = mode;
    app.currentLesson = lesson;

    // For Ukrainian beginner lessons we generate a fresh target per start/restart
    // from the provided word pool.
    let effectiveText = text;
    if (
        mode === 'lesson' &&
        lesson &&
        lesson.layout === 'ua' &&
        (lesson.level === 'beginner' || lesson.difficulty === 'easy')
    ) {
        // Keep generated targets in history to avoid exact repeats
        // between different starts/restarts.
        var storageKey = lesson.key ? ('ua_beginner_recentTexts_' + lesson.key) : null;
        var recentTexts = [];
        if (storageKey) {
            try {
                const raw = localStorage.getItem(storageKey);
                const parsed = raw ? JSON.parse(raw) : [];
                if (Array.isArray(parsed)) recentTexts = parsed;
            } catch (e) {
                recentTexts = [];
            }
        }

        var candidate = null;
        var maxAttempts = 16;
        for (var attempt = 0; attempt < maxAttempts; attempt++) {
            var t = generateUaBeginnerSentenceText(lesson.text);
            if (!storageKey || !recentTexts.includes(t)) {
                candidate = t;
                break;
            }
        }
        if (!candidate) candidate = generateUaBeginnerSentenceText(lesson.text);

        if (storageKey) {
            try {
                recentTexts.push(candidate);
                // Keep last N targets.
                const MAX_HISTORY = 16;
                if (recentTexts.length > MAX_HISTORY) {
                    recentTexts = recentTexts.slice(-MAX_HISTORY);
                }
                localStorage.setItem(storageKey, JSON.stringify(recentTexts));
            } catch (e) {}
        }

        effectiveText = candidate;
    } else if (
        mode === 'lesson' &&
        lesson &&
        (lesson.layout === 'ru' || lesson.layout === 'en') &&
        lesson.text
    ) {
        const isBeginnerish = (lesson.level === 'beginner' || lesson.difficulty === 'easy');
        if (isBeginnerish) {
            effectiveText = generateRuEnBeginnerUniqueText(lesson.text, lesson.key, lesson.layout, 100, 200);
        } else {
            // For medium/advanced, keep original punctuation/casing by reordering sentence chunks.
            const minChars = Math.max(120, Math.round(String(lesson.text || '').length * 0.75));
            const maxChars = Math.min(4500, Math.max(minChars + 40, Math.round(String(lesson.text || '').length * 1.08)));
            effectiveText = generateRuEnShuffledUniqueText(lesson.text, lesson.key, lesson.layout, minChars, maxChars);
        }
    }

    // UA beginner hard validation: if we accidentally ended up with a non-UA string
    // (e.g. due to rapid navigation and a wrong target), force a valid UA fallback.
    if (
        mode === 'lesson' &&
        lesson &&
        lesson.layout === 'ua' &&
        (lesson.level === 'beginner' || lesson.difficulty === 'easy')
    ) {
        const uaAllowed = /^[абвгґдеєжзиіїйклмнопрстуфхцчшщьюя ]+$/i;
        const s = String(effectiveText || '');
        if (!s || !uaAllowed.test(s) || s.trim().length === 0) {
            effectiveText = generateUaBeginnerLessonText(lesson.text || text, 100, 200);
        }
    }

    // Hard safety: never allow an empty target string.
    // When `app.currentText.length === 0`, the UI renders an empty field (no spans),
    // which looks like the practice is "broken".
    if (typeof effectiveText !== 'string') effectiveText = String(effectiveText ?? '');
    if (!effectiveText || effectiveText.trim().length === 0) {
        const pool = (lesson && lesson.text) ? lesson.text : text;
        if (lesson && lesson.layout === 'ua') {
            effectiveText = generateUaBeginnerLessonText(pool, 100, 200);
        } else {
            // Best-effort fallback: use original pool (may still be generated elsewhere).
            effectiveText = String(pool || '').trim();
        }
        if (!effectiveText) effectiveText = 'дім кіт мама тато вода рука нога день ніч стіл стілець вікно двері лампа книга';
    }

    app.currentText = effectiveText;
    app.currentPosition = 0;
    app.startTime = Date.now();
    app.endTime = null;
    app.isPaused = false;
    app.errors = 0;
    app.totalChars = effectiveText.length;
    app.typedText = '';

    app._errorSnippetList = [];
    app._errorPairCounts = {};
    app._errorsAfterSpaceCount = 0;
    app._replayAutoFinishing = false;
    if (mode === 'replay-errors') {
        app._replayDeadline = Date.now() + (app._replayTimeLimitSec || 60) * 1000;
    } else {
        app._replayDeadline = null;
    }
    initLessonCheckpoints();
    
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
            // Safety: translations might not be ready yet on very fast navigation.
            const tr = window.translations && window.translations[app.lang] ? window.translations[app.lang] : null;
            const pauseText = tr && tr.pause ? tr.pause : 'Пауза';
            span.textContent = pauseText;
        }
    }
    
    renderText();
    updateStats();
    updateCheckpointHintLine();
    updateReplayDeadlineUI();
    if (mode === 'replay-errors' && typeof showToast === 'function') {
        showToast(trReplace('replayModeBanner', { s: String(app._replayTimeLimitSec || 60) }), 'info', '⏱');
    }

    // Накладываем heatmap ошибок на клавиатуру
    if (window.heatmapModule) {
        setTimeout(function () {
            var kbEl = document.getElementById('keyboardContainer');
            if (kbEl) {
                window.heatmapModule.renderHeatmap(kbEl, window.heatmapModule.getErrorMap());
            }
        }, 200);
    }
    
    if (mode === 'speedtest') {
        startSpeedTestTimer();
    } else {
        startStatsTimer();
    }
    // Фокус на body, чтобы нажатия клавиш сразу обрабатывались (особенно после «Повторить»).
    setTimeout(function () { document.body.focus(); }, 0);
}

// Render text display — reuses existing span nodes to avoid per-keypress DOM create/destroy.
function renderText() {
    const display = DOM.get('textDisplay');
    if (!display) return;

    // Safety: restore text if it got cleared unexpectedly.
    if (typeof app.currentText !== 'string' || app.currentText.length === 0) {
        const lesson = app.currentLesson;
        const pool = (lesson && lesson.text) ? lesson.text : '';
        if (lesson && lesson.layout === 'ua') {
            app.currentText = generateUaBeginnerLessonText(pool, 100, 200);
            app.totalChars = app.currentText.length;
            app.currentPosition = Math.min(app.currentPosition || 0, app.currentText.length);
            app.typedText = '';
        } else {
            app.currentText = String(pool || '').trim() || ' ';
            app.totalChars = app.currentText.length;
            app.currentPosition = Math.min(app.currentPosition || 0, app.currentText.length);
        }
    }

    const WINDOW_SIZE = 60;
    const TYPED_VISIBLE = 10;

    const startPos = Math.max(0, app.currentPosition - TYPED_VISIBLE);
    const endPos = Math.min(app.currentText.length, startPos + WINDOW_SIZE);
    const windowLen = endPos - startPos;

    if (windowLen === 0) { display.innerHTML = ''; return; }

    // Adjust child count WITHOUT clearing innerHTML — reuse existing spans.
    while (display.childElementCount > windowLen) display.removeChild(display.lastChild);
    if (display.childElementCount < windowLen) {
        const frag = document.createDocumentFragment();
        for (let i = display.childElementCount; i < windowLen; i++) frag.appendChild(document.createElement('span'));
        display.appendChild(frag);
    }

    const children = display.children;

    for (let i = 0; i < windowLen; i++) {
        const charIdx = startPos + i;
        const char = app.currentText[charIdx];
        const span = children[i];

        let newClass;
        if (charIdx < app.currentPosition) {
            newClass = 'char-typed';
            const dist = app.currentPosition - charIdx;
            const opacity = Math.max(0.2, 1 - (dist / TYPED_VISIBLE));
            // cssText batches two property writes into one style recalc.
            span.style.cssText = 'opacity:' + opacity + ';font-size:0.9em';
        } else {
            if (span.style.cssText) span.style.cssText = '';
            newClass = charIdx === app.currentPosition ? 'char-current' : 'char-future';
        }

        if (span.className !== newClass) span.className = newClass;

        // Use \u00A0 for space to avoid innerHTML (avoids HTML parser call).
        const content = char === ' ' ? '\u00A0' : char;
        if (span.textContent !== content) span.textContent = content;
    }

    // Direct O(1) index access — no querySelector('.char-current') needed.
    const cursorSpan = children[app.currentPosition - startPos];
    if (cursorSpan) {
        // 'instant' eliminates competing smooth-scroll animations during fast typing.
        cursorSpan.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
    }

    if (app.currentPosition < app.currentText.length) {
        window.keyboardModule.highlightStatic(app.currentText[app.currentPosition]);
    }
}

// Handle key press - ОПТИМИЗИРОВАНА
function handleKeyPress(e) {
    // Разрешаем ввод во всех режимах практики
    const validModes = ['practice', 'speedtest', 'lesson', 'free', 'adaptive', 'replay-errors'];
    if (!validModes.includes(app.currentMode) || app.isPaused) return;
    
    // Ignore special keys; allow Enter only when the expected character is '\n'
    const expectedChar = app.currentText[app.currentPosition];
    if (e.key.length > 1 && e.key !== 'Backspace' && !(e.key === 'Enter' && expectedChar === '\n')) return;
    
    e.preventDefault();
    
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
        // Per-key error tracking — in-memory, flush при finishPractice
        var _ec = app.currentText[app.currentPosition];
        var _p = app.currentPosition;
        var _t = app.currentText;
        if (_ec && _ec.trim()) {
            _keyErrorsCache[_ec] = (_keyErrorsCache[_ec] || 0) + 1;
        }
        if (_p > 0 && _t[_p - 1] === ' ') {
            app._errorsAfterSpaceCount = (app._errorsAfterSpaceCount || 0) + 1;
        }
        if (_p > 0 && _t.length) {
            var pair = _t[_p - 1] + (_t[_p] || '');
            if (pair.length >= 2) {
                app._errorPairCounts = app._errorPairCounts || {};
                app._errorPairCounts[pair] = (app._errorPairCounts[pair] || 0) + 1;
            }
        }
        var sn = _t.slice(Math.max(0, _p - 4), Math.min(_t.length, _p + 7)).replace(/\s+/g, ' ').trim();
        if (sn.length >= 2) {
            app._errorSnippetList = app._errorSnippetList || [];
            app._errorSnippetList.push(sn);
        }
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
    maybeTriggerTypingCheckpoint();
    updateCheckpointHintLine();
    
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
    const elapsed = app.isPaused ? 0 : Math.max(0, (Date.now() - app.startTime - (app.totalLessonPauseDuration || 0)) / 1000);
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

    updateCheckpointHintLine();
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
        if (app.currentMode === 'replay-errors' && app._replayDeadline) {
            if (currentTime - (app._lastReplayUiTs || 0) >= 250) {
                app._lastReplayUiTs = currentTime;
                updateReplayDeadlineUI();
            }
        }
        if (app.isPaused) {
            app.animationFrameId = requestAnimationFrame(update);
            return;
        }
        
        if (currentTime - lastUpdate >= 1000) {
            // startStatsTimer отвечает только за таймер; скорость/точность/прогресс — updateStats
            const elapsed = Math.max(0, (Date.now() - app.startTime - (app.totalLessonPauseDuration || 0)) / 1000);
            const timeEl = DOM.get('currentTime');
            if (timeEl) {
                const mins = Math.floor(elapsed / 60);
                const secs = Math.floor(elapsed % 60);
                const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
                if (timeEl.textContent !== timeStr) {
                    timeEl.textContent = timeStr;
                }
            }
            if (app.currentMode === 'replay-errors' && app._replayDeadline && Date.now() >= app._replayDeadline && !app._replayAutoFinishing) {
                app._replayAutoFinishing = true;
                finishPractice();
                return;
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
        
        const now = Date.now();
        if (app.currentMode === 'speedtest' && app.pauseStartTime) {
            // Speed test: сдвигаем время окончания
            const pauseDuration = now - app.pauseStartTime;
            app.speedTestEndTime += pauseDuration;
            app.pauseStartTime = null;
        } else if (app._pauseStartAt) {
            // Уроки/свободный режим: накапливаем общее время паузы
            app.totalLessonPauseDuration += now - app._pauseStartAt;
            app._pauseStartAt = null;
        }
        if (app._replayPausedAt && app._replayDeadline) {
            app._replayDeadline += now - app._replayPausedAt;
            app._replayPausedAt = null;
        }
        
        const pauseBtn = DOM.get('pauseBtn');
        if (pauseBtn) {
            const span = pauseBtn.querySelector('span');
            if (span) {
                const tr = window.translations && window.translations[app.lang] ? window.translations[app.lang] : null;
                span.textContent = (tr && tr.pause) ? tr.pause : 'Пауза';
            }
        }
        updateReplayDeadlineUI();
    } else {
        // Ставим на паузу
        app.isPaused = true;
        
        if (app.currentMode === 'speedtest') {
            app.pauseStartTime = Date.now();
        } else {
            // Для уроков — запоминаем момент начала паузы
            app._pauseStartAt = Date.now();
        }
        if (app.currentMode === 'replay-errors' && app._replayDeadline) {
            app._replayPausedAt = Date.now();
        }
        
        const pauseBtn = DOM.get('pauseBtn');
        if (pauseBtn) {
            const span = pauseBtn.querySelector('span');
            if (span) {
                const tr = window.translations && window.translations[app.lang] ? window.translations[app.lang] : null;
                span.textContent = (tr && tr.resume) ? tr.resume : 'Продолжить';
            }
        }
        updateReplayDeadlineUI();
    }
}

// Restart practice
function restartPractice() {
    // Speed test: always generate a fresh random word set.
    if (app.currentMode === 'speedtest') {
        showSpeedTest();
        return;
    }

    // Ukrainian beginner lessons: re-generate from the pool each time.
    if (
        app.currentLesson &&
        app.currentLesson.layout === 'ua' &&
        app.currentLesson.level === 'beginner' &&
        app.currentMode === 'lesson'
    ) {
        startPractice(app.currentLesson.text, app.currentMode, app.currentLesson);
        return;
    }

    startPractice(app.currentText, app.currentMode, app.currentLesson);
}

// Exit practice - ОПТИМИЗИРОВАНА
function exitPractice() {
    // Сбрасываем паузу при выходе
    app.isPaused = false;
    app._replayDeadline = null;
    app._replayPausedAt = null;
    app._replayAutoFinishing = false;
    app._lastReplayUiTs = 0;
    var rdl = document.getElementById('replayDeadlineLine');
    if (rdl) {
        rdl.classList.add('hidden');
        rdl.textContent = '';
    }
    if (window.wpmChartModule) window.wpmChartModule.stopRecording();
    
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

    app._replayDeadline = null;
    app._replayPausedAt = null;
    app._replayAutoFinishing = false;
    app._lastReplayUiTs = 0;
    var _replayLineEl = document.getElementById('replayDeadlineLine');
    if (_replayLineEl) {
        _replayLineEl.classList.add('hidden');
        _replayLineEl.textContent = '';
    }
    
    // БЛОКИРУЕМ ДАЛЬНЕЙШИЙ ВВОД
    app.isPaused = true;
    
    app.endTime = Date.now();
    // Вычитаем накопленное время пауз (для уроков/свободного режима)
    const pauseOffset = app.currentMode === 'speedtest' ? 0 : (app.totalLessonPauseDuration || 0);
    const elapsed = Math.max(1, (app.endTime - app.startTime - pauseOffset) / 1000);
    const minutes = elapsed / 60;
    const speed = Math.round(app.currentPosition / minutes);
    
    // НОВАЯ ФОРМУЛА ТОЧНОСТИ
    const totalAttempts = app.currentPosition + app.errors;
    const accuracy = totalAttempts > 0 
        ? Math.round((app.currentPosition / totalAttempts) * 100) 
        : 100;
    
    var _sessionMode = app.currentMode;
    if (app.currentMode === 'practice' && app.currentLesson) _sessionMode = 'lesson';
    const sessionData = {
        speed,
        accuracy,
        time: Math.round(elapsed),
        errors: app.errors,
        mode: _sessionMode,
        layout: app.currentLayout,
        lessonKey: app.currentLesson?.key || null,
        lessonName: app.currentLesson?.name || null,
        timestamp: Date.now()
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
        renderLevelBlock();
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
    
    // Mark timestamp so handleGlobalHotkeys ignores the same keydown event
    // that finished the lesson (prevents instant repeat-round trigger).
    app.practiceFinishedAt = Date.now();

    // Сохраняем снимок ошибок сессии ДО flush (для показа в результатах)
    app._lastSessionErrors = Object.assign({}, _keyErrorsCache);

    app._lastErrorReplaySnippets = app.errors > 0 ? buildUniqueErrorSnippets() : [];

    // Сохраняем накопленные ошибки по клавишам в localStorage
    _flushKeyErrors();

    // Идеальная сессия: уменьшаем исторические счётчики по напечатанным буквам
    _decayKeyErrorsIfPerfect(accuracy, app.errors);

    // Останавливаем запись скорости
    if (window.wpmChartModule) window.wpmChartModule.stopRecording();

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
    
    // === PB (личный рекорд) сравнение ===
    const pbBadge = document.getElementById('resultPbBadge');
    if (pbBadge) {
        try {
            // Пробуем разные пути к bestSpeed
            let bestSpeed = 0;
            if (window.statsModule && window.statsModule.data) {
                bestSpeed = window.statsModule.data.bestSpeed || 0;
            } else {
                try { bestSpeed = JSON.parse(localStorage.getItem('zoobastiks_stats') || '{}').bestSpeed || 0; } catch (_) {}
            }
            // Сравниваем ПРЕДЫДУЩИЙ рекорд (до этой сессии, он уже мог обновиться)
            // Считаем: если speed >= bestSpeed — новый рекорд
            if (speed > 0 && speed >= bestSpeed && bestSpeed > 0) {
                pbBadge.textContent = speed > bestSpeed ? '🏆 Новый рекорд!' : '🏆 Рекорд!';
                pbBadge.className = 'mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300';
            } else if (bestSpeed > 0 && speed < bestSpeed) {
                const diff = bestSpeed - speed;
                pbBadge.textContent = '–' + diff + ' до рекорда';
                pbBadge.className = 'mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400';
            } else {
                pbBadge.className = 'hidden';
            }
        } catch (_e) {
            pbBadge.className = 'hidden';
        }
    }

    // === WPM-график ===
    const chartCanvas = document.getElementById('resultSpeedChart');
    if (chartCanvas && window.wpmChartModule) {
        const history = (app.speedHistory && app.speedHistory.length) ? app.speedHistory.slice() : [];
        // Добавляем финальную точку с реальными данными
        if (speed > 0) {
            history.push({ t: Math.round(time), cpm: speed });
        }
        // Задержка: даём модалу стать visible до рендера (иначе canvas.offsetWidth = 0)
        setTimeout(function () {
            window.wpmChartModule.renderChart(chartCanvas, history);
        }, 80);
    }

    // === Сравнение скорости с медианой недели / вчера ===
    var insightBox = document.getElementById('resultSpeedInsight');
    var insightMed = document.getElementById('resultSpeedInsightMedian');
    var insightY = document.getElementById('resultSpeedInsightYesterday');
    if (insightBox && insightMed && insightY) {
        var ins = computeResultSpeedInsights(speed);
        if (ins.medianLine || ins.yesterdayLine) {
            insightBox.classList.remove('hidden');
            insightMed.textContent = ins.medianLine || '';
            insightY.textContent = ins.yesterdayLine || '';
            insightMed.classList.toggle('hidden', !ins.medianLine);
            insightY.classList.toggle('hidden', !ins.yesterdayLine);
        } else {
            insightBox.classList.add('hidden');
        }
    }

    // === Совет тренера (биграммы / пробел) ===
    var coachBox = document.getElementById('resultCoachTip');
    var coachTxt = document.getElementById('resultCoachTipText');
    if (coachBox && coachTxt) {
        var coach = buildCoachTipFromSession();
        if (coach) {
            coachTxt.textContent = coach;
            coachBox.classList.remove('hidden');
        } else {
            coachBox.classList.add('hidden');
        }
    }

    // === Топ-3 проблемных клавиши сессии ===
    const topErrorsBlock = document.getElementById('resultTopErrors');
    const topErrorsList = document.getElementById('resultTopErrorsList');
    var replayWrap = document.getElementById('resultReplayErrorsWrap');
    var replayBtn = document.getElementById('resultReplayErrorsBtn');
    var canReplay = errors > 0 && app._lastErrorReplaySnippets && app._lastErrorReplaySnippets.length > 0;
    if (replayWrap) {
        if (canReplay) {
            replayWrap.classList.remove('hidden');
            if (replayBtn) replayBtn.textContent = t('resultReplayErrors');
        } else {
            replayWrap.classList.add('hidden');
        }
    }
    if (topErrorsBlock && topErrorsList && window.heatmapModule) {
        // Используем снимок ошибок сессии (до flush), не опустевший _keyErrorsCache
        const sessionErrors = app._lastSessionErrors || {};
        const top = window.heatmapModule.getTopErrors(sessionErrors, 3);
        if (top.length > 0 || canReplay) {
            if (top.length > 0) {
                topErrorsList.innerHTML = top.map(function (e) {
                    return '<span class="px-3 py-1 rounded-lg bg-red-500/20 text-red-300 font-mono font-bold text-sm border border-red-500/30">' +
                        (e.key === ' ' ? '␣' : e.key) +
                        ' <span class="text-xs font-normal text-red-400/70">×' + e.count + '</span></span>';
                }).join('');
                topErrorsList.classList.remove('hidden');
            } else {
                topErrorsList.innerHTML = '';
                topErrorsList.classList.add('hidden');
            }
            topErrorsBlock.classList.remove('hidden');
        } else {
            topErrorsBlock.classList.add('hidden');
        }
    } else if (topErrorsBlock) {
        topErrorsBlock.classList.add('hidden');
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

function _countCharInString(str, c) {
    var s = str.toLowerCase();
    var cl = c.toLowerCase();
    var n = 0;
    for (var i = 0; i < s.length; i++) {
        if (s[i] === cl) n++;
    }
    return n;
}

/**
 * Адаптивный текст: приоритет словам с редкими в словаре слабыми буквами (ф, ы, г…),
 * а не только «о», плюс гарантированные вставки по каждой топ-букве.
 */
function generateAdaptiveText(lang) {
    var layout = (app && app.currentLayout) || lang || 'ru';
    if (typeof speedTestWords === 'undefined') layout = 'ru';
    if (!speedTestWords[layout]) {
        layout = speedTestWords[lang] ? lang : (speedTestWords.ru ? 'ru' : 'en');
    }

    var errorMap = window.heatmapModule ? window.heatmapModule.getErrorMap() : {};
    var top = window.heatmapModule ? window.heatmapModule.getTopErrors(errorMap, 8) : [];

    var words = (speedTestWords[layout] || []).slice();
    var extra = (typeof adaptiveExtraWords !== 'undefined' && adaptiveExtraWords[layout]) ? adaptiveExtraWords[layout] : [];
    extra.forEach(function (w) {
        if (words.indexOf(w) === -1) words.push(w);
    });

    if (top.length === 0) {
        return shuffleArray(words).slice(0, 45).join(' ');
    }

    var weakChars = [];
    var weight = {};
    top.forEach(function (e) {
        var raw = (e.key && String(e.key)) ? String(e.key) : '';
        if (!raw || raw === ' ') return;
        var k = raw.length === 1 ? raw.toLowerCase() : raw.toLowerCase().charAt(0);
        if (!k || k === ' ') return;
        if (weakChars.indexOf(k) === -1) weakChars.push(k);
        weight[k] = Math.max(weight[k] || 0, Math.max(1, Math.round(Number(e.count) || 1)));
    });

    if (weakChars.length === 0) {
        return shuffleArray(words).slice(0, 45).join(' ');
    }

    var corpFreq = {};
    weakChars.forEach(function (c) { corpFreq[c] = 0; });
    words.forEach(function (w) {
        var wl = w.toLowerCase();
        weakChars.forEach(function (c) {
            corpFreq[c] += _countCharInString(wl, c);
        });
    });

    function scoreWord(w) {
        var wl = w.toLowerCase();
        var s = 0;
        var distinct = 0;
        weakChars.forEach(function (c) {
            var occ = _countCharInString(wl, c);
            if (!occ) return;
            distinct++;
            var cf = corpFreq[c] || 0;
            s += occ * weight[c] / Math.sqrt(0.75 + cf);
        });
        s += distinct * 12;
        var len = wl.replace(/\s+/g, '').length || 1;
        s += (distinct / len) * 30;
        return s;
    }

    var scored = words.map(function (w) { return { w: w, s: scoreWord(w) }; });
    scored.sort(function (a, b) { return b.s - a.s; });

    var selected = [];
    var used = {};
    var i;
    for (i = 0; i < scored.length && selected.length < 50; i++) {
        if (scored[i].s <= 0) break;
        if (!used[scored[i].w]) {
            selected.push(scored[i].w);
            used[scored[i].w] = 1;
        }
    }

    weakChars.slice(0, 6).forEach(function (c) {
        var candidates = words
            .filter(function (w) { return w.toLowerCase().indexOf(c) !== -1; })
            .map(function (w) {
                var wl = w.toLowerCase();
                var occ = _countCharInString(wl, c);
                return { w: w, ratio: occ / Math.max(1, wl.length) };
            })
            .sort(function (a, b) { return b.ratio - a.ratio || b.w.length - a.w.length; });
        var added = 0;
        for (var j = 0; j < candidates.length && added < 6; j++) {
            var ww = candidates[j].w;
            if (!used[ww]) {
                selected.push(ww);
                used[ww] = 1;
                added++;
            }
        }
    });

    selected = shuffleArray(selected);

    if (selected.length < 14) {
        var fb = shuffleArray(words);
        fb.forEach(function (w) {
            if (selected.length >= 55) return;
            if (!used[w]) {
                selected.push(w);
                used[w] = 1;
            }
        });
    }

    var text = selected.join(' ');
    if (text.length > 520) {
        var cut = text.slice(0, 520);
        var lastSp = cut.lastIndexOf(' ');
        text = lastSp > 0 ? cut.slice(0, lastSp) : cut;
    }
    return text;
}

/** Запускает тренировку слабых клавиш из модала результатов. */
function startAdaptivePractice() {
    // Закрываем модал результатов если открыт
    var modal = DOM.get('resultsModal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    // Закрываем экран профиля если открыт
    var profileScreen = document.getElementById('profileScreen');
    if (profileScreen && !profileScreen.classList.contains('hidden')) {
        profileScreen.classList.add('hidden');
    }
    var text = generateAdaptiveText(app.lang);
    startPractice(text, 'adaptive', null);
}

function updateResultsModalHotkeysHint() {
    const el = document.getElementById('resultsHotkeysHint');
    const row = translations[app.lang] || translations.ru;
    if (el && row && row.hotkeysHint) el.textContent = row.hotkeysHint;
}

// Copy result to clipboard (for sharing). Используем Clipboard API с fallback на execCommand.
function copyResultsToClipboard() {
    const d = lastResultData;
    const mins = Math.floor(d.time / 60);
    const secs = Math.floor(d.time % 60);
    const timeStr = mins + ':' + (secs < 10 ? '0' : '') + secs;
    const site = 'Zoobastiks';
    const text = app.lang === 'en'
        ? site + ' — ' + d.speed + ' cpm, ' + d.accuracy + '% accuracy, ' + timeStr + ', ' + d.errors + ' errors'
        : app.lang === 'ua'
            ? site + ' — ' + d.speed + ' зн/хв, точність ' + d.accuracy + '%, час ' + timeStr + ', помилок ' + d.errors
            : site + ' — ' + d.speed + ' зн/мин, точность ' + d.accuracy + '%, время ' + timeStr + ', ошибок ' + d.errors;

    function onSuccess() {
        showToast(t('resultCopied'), 'success', '');
    }
    function onFail() {
        showToast(typeof t('copyFailed') !== 'undefined' ? t('copyFailed') : 'Не удалось скопировать', 'warning', '');
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).then(function () {
            onSuccess();
        }).catch(function () {
            fallbackCopy();
        });
    } else {
        fallbackCopy();
    }

    function fallbackCopy() {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        try {
            textarea.select();
            textarea.setSelectionRange(0, text.length);
            var ok = document.execCommand('copy');
            if (ok) onSuccess(); else onFail();
        } catch (e) {
            onFail();
        }
        document.body.removeChild(textarea);
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
        var tip;
        if (app.lang === 'en') {
            tip = 'Level ' + info.level + ' — ' + info.tierName + ' · ' + info.xpInLevel + '/' + info.xpToNext + ' XP to next';
            if (info.xpToNext <= 0) tip = 'Level ' + info.level + ' — ' + info.tierName;
        } else if (app.lang === 'ua') {
            tip = 'Рівень ' + info.level + ' — ' + info.tierName + ' · ' + info.xpInLevel + '/' + info.xpToNext + ' XP до наступного';
            if (info.xpToNext <= 0) tip = 'Рівень ' + info.level + ' — ' + info.tierName;
        } else {
            tip = 'Уровень ' + info.level + ' — ' + info.tierName + ' · ' + info.xpInLevel + '/' + info.xpToNext + ' XP до следующего';
            if (info.xpToNext <= 0) tip = 'Уровень ' + info.level + ' — ' + info.tierName;
        }
        levelBlock.setAttribute('title', tip);
    }
    var streakEl = DOM.get('streakBadge');
    if (streakEl) {
        var streak = getStreak();
        var numEl = streakEl.querySelector ? streakEl.querySelector('.streak-number') : null;
        if (streak > 0) {
            if (numEl) numEl.textContent = streak; else streakEl.textContent = '\uD83D\uDD25 ' + streak;
            var tr = translations[app.lang] || {};
            var base = (tr.streakHint || 'Серия дней с тренировкой') + ': ' + streak + ' ' + (tr.streakDays || 'дней подряд');
            var freeze = tr.streakFreezeHint || '';
            streakEl.title = freeze ? base + '\n' + freeze : base;
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
    var html = '<div class="level-list-scroll space-y-1.5 max-h-[60vh] pr-1">';
    for (var lvl = 1; lvl <= 50; lvl++) {
        var tier = getTier(lvl);
        var xpFrom = getXP(lvl);
        var xpTo = getXP(lvl + 1);
        var isCurrent = lvl === current;
        var xpText = xpFrom + ' – ' + xpTo + ' XP';
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
// Pre-allocated audio pools — avoids cloneNode() and GC pressure on every keypress.
const _SFX_POOL_SIZE = 6;
let _clickPool = null, _clickIdx = 0;
let _errorPool = null, _errorIdx = 0;

function _initSfxPools() {
    try {
        if (audioClick && !_clickPool) {
            _clickPool = [];
            for (let i = 0; i < _SFX_POOL_SIZE; i++) {
                const a = audioClick.cloneNode();
                a.volume = SFX_VOLUME;
                _clickPool.push(a);
            }
        }
        if (audioError && !_errorPool) {
            _errorPool = [];
            for (let i = 0; i < _SFX_POOL_SIZE; i++) {
                const a = audioError.cloneNode();
                a.volume = SFX_VOLUME;
                _errorPool.push(a);
            }
        }
    } catch (e) {}
}

function playSound(type) {
    if (!app.soundEnabled) return;
    if (!_clickPool) _initSfxPools();

    try {
        if (type === 'correct' && _clickPool && _clickPool.length) {
            const sound = _clickPool[_clickIdx % _clickPool.length];
            _clickIdx++;
            sound.currentTime = 0;
            sound.play().catch(() => {});
        } else if (type === 'error' && _errorPool && _errorPool.length) {
            const sound = _errorPool[_errorIdx % _errorPool.length];
            _errorIdx++;
            sound.currentTime = 0;
            sound.play().catch(() => {});
        } else if (type === 'correct' && audioClick) {
            audioClick.currentTime = 0;
            audioClick.play().catch(() => {});
        } else if (type === 'error' && audioError) {
            audioError.currentTime = 0;
            audioError.play().catch(() => {});
        } else if (type === 'checkpoint' && audioClick) {
            try {
                audioClick.volume = 0.45;
                audioClick.currentTime = 0;
                audioClick.play().catch(() => {});
                setTimeout(function () { try { audioClick.volume = 1; } catch (_e) {} }, 120);
            } catch (_e) {}
        }
    } catch (e) {
        // Fallback to Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            var fq = type === 'correct' ? 800 : type === 'checkpoint' ? 1100 : 200;
            oscillator.frequency.value = fq;
            gainNode.gain.value = type === 'checkpoint' ? SFX_VOLUME * 0.55 : SFX_VOLUME;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + (type === 'checkpoint' ? 0.07 : 0.05));
        } catch (e2) {}
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
    const tr = window.translations || {};
    const langTable = tr[app.lang] || {};
    var val = langTable[key];
    if ((val === undefined || val === '') && app.lang === 'ua' && tr.ru) {
        val = tr.ru[key];
    }
    return (val !== undefined && val !== '') ? val : key;
}

function trReplace(key, map) {
    var s = t(key);
    if (!map) return s;
    Object.keys(map).forEach(function (k) {
        s = s.split('{{' + k + '}}').join(String(map[k]));
    });
    return s;
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
    if (!modal) return;
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
        if (result.user) {
            currentUserProfile = result.user;
            updateUserUI(result.user, result.user);
        }
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
        if (result.user) {
            currentUserProfile = result.user;
            updateUserUI(result.user, result.user);
        }
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

// ── Profile Tabs ──────────────────────────────────────────────────────────────

function _t(key) {
    var lang = (app && app.lang) || 'ru';
    return (translations[lang] && translations[lang][key]) || (translations['ru'] && translations['ru'][key]) || key;
}

function _sessionTimeAgo(ts) {
    if (!ts) return '';
    var lang = (app && app.lang) || 'ru';
    var mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
    if (lang === 'en') {
        if (mins < 1) return 'just now';
        if (mins < 60) return mins + ' min ago';
        if (mins < 1440) return Math.floor(mins / 60) + ' h ago';
        return Math.floor(mins / 1440) + ' d ago';
    }
    if (lang === 'ua') {
        if (mins < 1) return 'щойно';
        if (mins < 60) return mins + ' хв тому';
        if (mins < 1440) return Math.floor(mins / 60) + ' год тому';
        return Math.floor(mins / 1440) + ' дн. тому';
    }
    if (mins < 1) return 'только что';
    if (mins < 60) return mins + ' мин назад';
    if (mins < 1440) return Math.floor(mins / 60) + ' ч назад';
    return Math.floor(mins / 1440) + ' дн. назад';
}

/**
 * Рисует Canvas line-chart скорости последних 20 сессий в профиле.
 */
// Хранилище listeners профиль-чарта (чтобы не дублировать)
var _profileChartListeners = null;

function _renderProfileProgressChart() {
    var canvas = document.getElementById('profileProgressChart');
    if (!canvas) return;

    var sessions = (window.statsModule && window.statsModule.getRecentSessions) ? window.statsModule.getRecentSessions(20) : [];

    var dpr = window.devicePixelRatio || 1;
    var W = canvas.offsetWidth || 400;
    var H = 140;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    if (!sessions || sessions.length < 2) {
        ctx.fillStyle = 'rgba(99,102,241,0.08)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(148,163,184,0.5)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        var need2 = (app.lang === 'en') ? 'Need at least 2 sessions' : (app.lang === 'ua') ? 'Потрібно щонайменше 2 сесії' : 'Нужно минимум 2 сессии';
        ctx.fillText(need2, W / 2, H / 2);
        return;
    }

    var padL = 40, padR = 14, padT = 12, padB = 26;
    var cw = W - padL - padR;
    var ch = H - padT - padB;

    var defPrac = (app.lang === 'en') ? 'Free Practice' : (app.lang === 'ua') ? 'Вільна практика' : 'Свободная практика';
    var points = sessions.slice().reverse().map(function (s) {
        return { cpm: s.speed || 0, acc: s.accuracy || 0, name: _resolveLessonName(s) || defPrac };
    });
    var maxCpm = Math.max.apply(null, points.map(function (p) { return p.cpm; }));
    maxCpm = Math.max(maxCpm, 60);

    var step = cw / Math.max(points.length - 1, 1);

    // Фон
    ctx.fillStyle = 'rgba(99,102,241,0.06)';
    ctx.fillRect(padL, padT, cw, ch);

    // Сетка Y
    ctx.strokeStyle = 'rgba(148,163,184,0.15)';
    ctx.lineWidth = 1;
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
        var gy = padT + ch - f * ch;
        ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(padL + cw, gy); ctx.stroke();
        if (f > 0) {
            ctx.fillStyle = 'rgba(148,163,184,0.6)';
            ctx.font = '9px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(Math.round(f * maxCpm), padL - 4, gy + 3);
        }
    });

    // Заливка под линией
    ctx.beginPath();
    points.forEach(function (p, i) {
        var x = padL + i * step;
        var y = padT + ch - (p.cpm / maxCpm) * ch;
        if (i === 0) { ctx.moveTo(x, padT + ch); ctx.lineTo(x, y); }
        else ctx.lineTo(x, y);
    });
    ctx.lineTo(padL + (points.length - 1) * step, padT + ch);
    ctx.closePath();
    var areaGrad = ctx.createLinearGradient(0, padT, 0, padT + ch);
    areaGrad.addColorStop(0, 'rgba(99,102,241,0.22)');
    areaGrad.addColorStop(1, 'rgba(99,102,241,0.02)');
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Линия
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    var lineGrad = ctx.createLinearGradient(padL, 0, padL + cw, 0);
    lineGrad.addColorStop(0, '#6366f1');
    lineGrad.addColorStop(1, '#06b6d4');
    ctx.strokeStyle = lineGrad;
    points.forEach(function (p, i) {
        var x = padL + i * step;
        var y = padT + ch - (p.cpm / maxCpm) * ch;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Точки
    points.forEach(function (p, i) {
        var x = padL + i * step;
        var y = padT + ch - (p.cpm / maxCpm) * ch;
        var color = p.acc >= 95 ? '#10b981' : p.acc >= 75 ? '#f59e0b' : '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    });

    // Метки X
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    var showEvery = Math.max(1, Math.floor(points.length / 5));
    points.forEach(function (p, i) {
        if (i % showEvery === 0 || i === points.length - 1) {
            ctx.fillText('#' + (i + 1), padL + i * step, padT + ch + 16);
        }
    });

    // ── Tooltip ──────────────────────────────────────────────────────────────
    if (_profileChartListeners) {
        canvas.removeEventListener('mousemove', _profileChartListeners.move);
        canvas.removeEventListener('mouseleave', _profileChartListeners.leave);
        if (_profileChartListeners.tip && _profileChartListeners.tip.parentNode) {
            _profileChartListeners.tip.parentNode.removeChild(_profileChartListeners.tip);
        }
        _profileChartListeners = null;
    }

    var wrapper = canvas.parentElement;
    if (!wrapper) return;
    wrapper.style.position = 'relative';

    var tip = document.createElement('div');
    tip.style.cssText = [
        'position:absolute;pointer-events:none;display:none;',
        'background:rgba(15,23,42,0.96);color:#e2e8f0;',
        'border:1px solid rgba(99,102,241,0.55);border-radius:9px;',
        'padding:7px 12px;font-size:12px;font-family:monospace;',
        'white-space:nowrap;z-index:9999;',
        'box-shadow:0 4px 20px rgba(0,0,0,0.55);',
        'line-height:1.6;'
    ].join('');
    wrapper.appendChild(tip);

    function onMove(e) {
        var rect = canvas.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;

        var closest = null, minDist = Infinity, closestIdx = -1;
        points.forEach(function (p, i) {
            var px = padL + i * step;
            var py = padT + ch - (p.cpm / maxCpm) * ch;
            var d = Math.abs(mx - px);
            if (d < minDist) { minDist = d; closest = p; closestIdx = i; }
        });

        if (closest && minDist < step * 0.55) {
            var color = closest.acc >= 95 ? '#10b981' : closest.acc >= 75 ? '#f59e0b' : '#ef4444';
            tip.innerHTML =
                '<b style="color:#6366f1">' + closest.cpm + '</b> зн/мин · ' +
                '<b style="color:' + color + '">' + closest.acc + '%</b><br>' +
                '<span style="color:#94a3b8;font-size:10px">#' + (closestIdx + 1) + ' · ' + escapeHtml(closest.name.slice(0, 28)) + '</span>';

            var px = padL + closestIdx * step;
            var tipW = 200;
            var tipX = Math.max(2, Math.min(px - tipW / 2, W - tipW - 4));
            var tipY = 4;
            tip.style.left = tipX + 'px';
            tip.style.top  = tipY + 'px';
            tip.style.display = 'block';
            canvas.style.cursor = 'crosshair';
        } else {
            tip.style.display = 'none';
            canvas.style.cursor = '';
        }
    }
    function onLeave() { tip.style.display = 'none'; canvas.style.cursor = ''; }

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    _profileChartListeners = { move: onMove, leave: onLeave, tip: tip };
}

var _lastProfileTab = 'overview';

function showProfileTab(tab) {
    _lastProfileTab = tab || 'overview';
    ['overview', 'history', 'errors'].forEach(function (t) {
        var btn = document.getElementById('profileTab-' + t);
        var panel = document.getElementById('profileTab' + t.charAt(0).toUpperCase() + t.slice(1));
        if (btn) btn.classList.toggle('active', t === tab);
        if (panel) panel.classList.toggle('hidden', t !== tab);
    });
    if (tab === 'overview') renderProfileOverview();
    if (tab === 'history') {
        renderProfileHistory();
        // Задержка: canvas нужен layout после DOM-рендера
        setTimeout(_renderProfileProgressChart, 80);
    }
    if (tab === 'errors') renderProfileErrors();
}

// Lookup real lesson name from LESSONS_DATA by lessonKey + layout
function _resolveLessonName(session) {
    if (session.lessonName) return session.lessonName;
    var key = session.lessonKey;
    if (!key) return null;
    // key format: lesson_beginner_2, lesson_medium_5, etc.
    try {
        if (typeof LESSONS_DATA !== 'undefined') {
            var m = key.match(/^lesson_(beginner|medium|advanced)_(\d+)$/);
            if (m) {
                var lvl = m[1], id = parseInt(m[2]);
                var lvlData = LESSONS_DATA[lvl];
                if (lvlData && lvlData.lessons) {
                    var found = lvlData.lessons.find(function (l) { return l.id === id; });
                    if (found) return found.name;
                }
            }
            // shop lesson: shop_lesson_3
            var sm = key.match(/^shop_lesson_(\d+)$/);
            if (sm) {
                var sid = parseInt(sm[1]);
                for (var lvlKey in LESSONS_DATA) {
                    var lvData = LESSONS_DATA[lvlKey];
                    if (lvData && lvData.lessons) {
                        var sf = lvData.lessons.find(function (l) { return l.id === sid; });
                        if (sf) return sf.name;
                    }
                }
            }
        }
    } catch (e) {}
    return null;
}

function _calcStreak(sessions) {
    if (!sessions || sessions.length === 0) return 0;
    var dayMs = 86400000;
    var now = new Date(); now.setHours(0,0,0,0);
    var checkDay = now.getTime();
    var todayEnd = checkDay + dayMs;
    var hasToday = sessions.some(function(s) { return s.timestamp >= checkDay && s.timestamp < todayEnd; });
    if (!hasToday) checkDay -= dayMs;
    var streak = 0;
    while (true) {
        var dEnd = checkDay + dayMs;
        var has = sessions.some(function(s) { return s.timestamp >= checkDay && s.timestamp < dEnd; });
        if (!has) break;
        streak++;
        checkDay -= dayMs;
    }
    return streak;
}

function renderProfileOverview() {
    var el = document.getElementById('profileOverviewContent');
    if (!el) return;
    var lang = (app && app.lang) || 'ru';
    var en = lang === 'en';
    var uk = lang === 'ua';
    /** ru, en, ua — для текстів профілю */
    function P(ru, enStr, uaStr) {
        if (lang === 'en') return enStr;
        if (lang === 'ua') return (uaStr != null && uaStr !== '') ? uaStr : ru;
        return ru;
    }
    var profile = currentUserProfile || {};
    var stats = profile.stats || {};

    var bestSpeed        = stats.bestSpeed || 0;
    var avgAcc           = stats.averageAccuracy || 0;
    var totalSessions    = stats.totalSessions || 0;
    var completedLessons = stats.completedLessons || 0;
    var totalErrors      = stats.totalErrors || 0;
    var totalMinutes     = Math.floor((stats.totalTime || 0) / 60);
    var totalHours       = Math.floor(totalMinutes / 60);
    var timeLabel        = totalHours > 0 ? totalHours + P('ч', 'h', ' год') : (totalMinutes > 0 ? totalMinutes + P('м', 'm', ' хв') : '0' + P('м', 'm', ' хв'));

    var levelInfo = window.levelModule
        ? window.levelModule.getLevelInfo(window.levelModule.getPlayerXP())
        : { level: 1, tierName: '—', progressPct: 0, xpInLevel: 0, xpToNext: 100 };
    var balance = profile.balance != null ? profile.balance : 0;

    var sessions = (window.statsModule && window.statsModule.getRecentSessions) ? window.statsModule.getRecentSessions(30) : [];
    var streak = _calcStreak(sessions);
    var lastSession = sessions.length > 0 ? sessions[0] : null;
    var lastSessionTime = lastSession && lastSession.timestamp ? _sessionTimeAgo(lastSession.timestamp) : null;

    var allAchiev = (window.achievementsModule && window.achievementsModule.getAchievements) ? window.achievementsModule.getAchievements() : [];
    var unlockedIds = new Set();
    try { JSON.parse(localStorage.getItem('typeMasterAchievements') || '[]').forEach(function(id) { unlockedIds.add(id); }); } catch(e) {}
    var unlocked = allAchiev.filter(function(a) { return unlockedIds.has(a.id); });
    var lockedCount = allAchiev.length - unlocked.length;

    var skillLevels = [
        { min: 500, icon: '👑', title: P('Мастер', 'Master', 'Майстер'), color: '#f59e0b', sub: P('Ты в топ 1% всех печатающих!', 'Top 1% of all typists!', 'Ти в топ-1% усіх, хто друкує!') },
        { min: 400, icon: '🚀', title: P('Эксперт', 'Expert', 'Експерт'), color: '#8b5cf6', sub: P('Невероятная скорость!', 'Incredibly fast!', 'Неймовірна швидкість!') },
        { min: 300, icon: '🔥', title: P('Продвинутый', 'Advanced', 'Просунутий'), color: '#ef4444', sub: P('Быстрее большинства людей!', 'Faster than most people!', 'Швидше за більшість людей!') },
        { min: 200, icon: '⚡', title: P('Быстрый', 'Fast', 'Швидкий'), color: '#22d3ee', sub: P('Отличный прогресс!', 'Great progress, keep going!', 'Чудовий прогрес!') },
        { min: 100, icon: '💪', title: P('Уверенный', 'Confident', 'Впевнений'), color: '#10b981', sub: P('Ты на правильном пути!', 'On the right track!', 'Ти на правильному шляху!') },
        { min: 50,  icon: '✏️', title: P('Ученик', 'Student', 'Учень'), color: '#94a3b8', sub: P('Практикуйся каждый день!', 'Keep practicing every day!', 'Практикуйся щодня!') },
        { min: 0,   icon: '🐣', title: P('Новичок', 'Beginner', 'Новачок'), color: '#64748b', sub: P('Каждый мастер когда-то был новичком!', 'Every master was once a beginner!', 'Кожен майстер колись був новачком!') }
    ];
    var skillIdx = skillLevels.findIndex(function(s) { return bestSpeed >= s.min; });
    if (skillIdx < 0) skillIdx = skillLevels.length - 1;
    var skill = skillLevels[skillIdx];
    var nextSkill = skillIdx > 0 ? skillLevels[skillIdx - 1] : null;

    var tierColors = {
        'Первые шаги': '#94a3b8', 'Ученик': '#10b981', 'Практик': '#22d3ee',
        'Профессионал': '#8b5cf6', 'Мастер': '#f59e0b', 'Легенда': '#ef4444',
        'First Steps': '#94a3b8', 'Apprentice': '#10b981', 'Practitioner': '#22d3ee',
        'Professional': '#8b5cf6', 'Master': '#f59e0b', 'Legend': '#ef4444'
    };
    var ruTierForColor = window.levelModule.getTierNameForLang ? window.levelModule.getTierNameForLang(levelInfo.level, 'ru') : levelInfo.tierName;
    var tierColor = tierColors[ruTierForColor] || tierColors[levelInfo.tierName] || '#22d3ee';

    var html = '';

    // ── 1. Hero stats ────────────────────────────────────────────────────────
    var spdColor = bestSpeed >= 300 ? '#f59e0b' : bestSpeed >= 200 ? '#22d3ee' : bestSpeed >= 100 ? '#10b981' : '#94a3b8';
    var accColor = avgAcc >= 95 ? '#10b981' : avgAcc >= 80 ? '#22d3ee' : avgAcc >= 60 ? '#f59e0b' : '#ef4444';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">';
    html += '<div class="pcA" style="text-align:center;border-color:' + spdColor + '33">' +
        '<div class="pcLbl">🚀 ' + P('Рекорд', 'Best Speed', 'Рекорд') + '</div>' +
        '<div style="font-size:30px;font-weight:900;color:' + spdColor + ';line-height:1">' + bestSpeed + '</div>' +
        '<div class="pct5" style="font-size:10px;margin-top:4px">' + P('зн/мин', 'ch / min', 'зн/хв') + '</div>' +
    '</div>';
    html += '<div class="pcA" style="text-align:center;border-color:' + accColor + '33">' +
        '<div class="pcLbl">🎯 ' + P('Точность', 'Avg Accuracy', 'Точність') + '</div>' +
        '<div style="font-size:30px;font-weight:900;color:' + accColor + ';line-height:1">' + avgAcc + '%</div>' +
        '<div class="pct5" style="font-size:10px;margin-top:4px">' + P('в среднем', 'on average', 'у середньому') + '</div>' +
    '</div>';
    html += '<div class="pcA" style="text-align:center;border-color:rgba(167,139,250,0.3)">' +
        '<div class="pcLbl">⏱ ' + P('Время', 'Total Time', 'Час') + '</div>' +
        '<div style="font-size:30px;font-weight:900;color:#a78bfa;line-height:1">' + timeLabel + '</div>' +
        '<div class="pct5" style="font-size:10px;margin-top:4px">' + P('практики', 'practiced', 'практики') + '</div>' +
    '</div>';
    html += '</div>';

    // ── 2. Secondary stats ───────────────────────────────────────────────────
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">';
    [
        { v: totalSessions,    l: P('Сессий', 'Sessions', 'Сесій'),          icon: '🎮', c: 'var(--pct2)' },
        { v: completedLessons, l: P('Уроков пройдено', 'Lessons Done', 'Уроків пройдено'), icon: '📚', c: '#22d3ee' },
        { v: totalErrors,      l: P('Всего ошибок', 'Total Errors', 'Усього помилок'),    icon: '❌', c: '#f87171' }
    ].forEach(function(m) {
        html += '<div class="pcB" style="text-align:center">' +
            '<div class="pct5" style="font-size:10px;margin-bottom:5px">' + m.icon + ' ' + m.l + '</div>' +
            '<div style="font-size:22px;font-weight:800;color:' + m.c + '">' + m.v + '</div>' +
        '</div>';
    });
    html += '</div>';

    // ── 3. Level card ────────────────────────────────────────────────────────
    html += '<div class="pcLvl" style="border:1px solid ' + tierColor + '33;margin-bottom:12px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
            '<div>' +
                '<div class="pcLbl" style="margin-bottom:4px">' + P('Твой уровень', 'Your Level', 'Твій рівень') + '</div>' +
                '<div style="display:flex;align-items:baseline;gap:8px">' +
                    '<span style="font-size:26px;font-weight:900;color:' + tierColor + '">' + P('Ур. ', 'LVL ', 'Рів. ') + levelInfo.level + '</span>' +
                    '<span style="font-size:14px;color:' + tierColor + ';opacity:.85;font-weight:700">' + levelInfo.tierName + '</span>' +
                '</div>' +
            '</div>' +
            '<div style="text-align:right">' +
                '<div class="pcLbl" style="margin-bottom:2px">💰 ' + P('Монет', 'Balance', 'Монет') + '</div>' +
                '<div style="font-size:22px;font-weight:800;color:#f59e0b">' + balance + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="pcBarTr" style="height:10px;margin-bottom:6px">' +
            '<div style="height:100%;width:' + (levelInfo.progressPct || 0) + '%;background:linear-gradient(90deg,' + tierColor + '88,' + tierColor + ');border-radius:99px"></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11px" class="pct5">' +
            '<span>' + (levelInfo.xpInLevel || 0) + ' / ' + (levelInfo.xpToNext || 100) + ' XP</span>' +
            '<span>' + P('⬆️ До след. уровня: ', '⬆️ To next level: ', '⬆️ До наступного рівня: ') + Math.max(0, (levelInfo.xpToNext || 100) - (levelInfo.xpInLevel || 0)) + ' XP</span>' +
        '</div>' +
    '</div>';

    // ── 4. Typist skill ──────────────────────────────────────────────────────
    html += '<div class="pcA" style="border-color:' + skill.color + '33;display:flex;align-items:center;gap:16px;margin-bottom:12px">' +
        '<div style="font-size:40px;line-height:1;flex-shrink:0">' + skill.icon + '</div>' +
        '<div style="flex:1">' +
            '<div class="pcLbl" style="margin-bottom:2px">' + P('Класс печатника', 'Typist Class', 'Клас друкаря') + '</div>' +
            '<div style="font-size:20px;font-weight:900;color:' + skill.color + ';margin-bottom:2px">' + skill.title.toUpperCase() + '</div>' +
            '<div class="pct3" style="font-size:12px">' + skill.sub + '</div>' +
            (nextSkill
                ? '<div class="pct5" style="font-size:11px;margin-top:5px">' + P('Следующий: ', 'Next: ', 'Далі: ') + '<span style="color:' + nextSkill.color + '">' + nextSkill.icon + ' ' + nextSkill.title + '</span>' + P(' — достигни ' + nextSkill.min + ' зн/мин', ' — reach ' + nextSkill.min + ' ch/min', ' — досягни ' + nextSkill.min + ' зн/хв') + '</div>'
                : '<div style="font-size:11px;color:#f59e0b;margin-top:5px">🏆 ' + P('Максимальный класс достигнут!', 'Maximum class reached!', 'Максимальний клас досягнуто!') + '</div>') +
        '</div>' +
    '</div>';

    // ── 5. Streak + Last session ─────────────────────────────────────────────
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">';
    var streakColor = streak >= 7 ? '#f59e0b' : streak >= 3 ? '#f97316' : streak >= 1 ? '#10b981' : 'var(--pct5)';
    var streakIcon  = streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : streak >= 1 ? '✅' : '💤';
    var streakWord;
    if (en) {
        streakWord = streak + ' day' + (streak === 1 ? '' : 's') + ' in a row';
    } else if (uk) {
        var sm = streak % 10, sh = streak % 100;
        if (sm === 1 && sh !== 11) streakWord = streak + ' день поспіль';
        else if (sm >= 2 && sm <= 4 && (sh < 10 || sh >= 20)) streakWord = streak + ' дні поспіль';
        else streakWord = streak + ' днів поспіль';
    } else {
        streakWord = streak % 10 === 1 && streak !== 11 ? streak + ' день подряд'
          : streak % 10 >= 2 && streak % 10 <= 4 && (streak < 10 || streak > 20) ? streak + ' дня подряд'
          : streak + ' дней подряд';
    }

    html += '<div class="pcC" style="text-align:center;border-color:' + streakColor + '33">' +
        '<div style="font-size:30px;margin-bottom:6px">' + streakIcon + '</div>' +
        '<div style="font-size:22px;font-weight:800;color:' + streakColor + ';line-height:1">' + (streak === 0 ? P('Нет серии', 'No streak', 'Немає серії') : streakWord) + '</div>' +
        '<div class="pct4" style="font-size:11px;margin-top:4px">' + P('серия дней', 'daily streak', 'серія днів') + '</div>' +
        (streak === 0 ? '<div class="pct6" style="font-size:10px;margin-top:4px">' + P('Начни сегодня!', 'Practice today to start!', 'Почни сьогодні!') + '</div>' : '') +
    '</div>';

    html += '<div class="pcC" style="text-align:center">' +
        '<div style="font-size:30px;margin-bottom:6px">🕒</div>' +
        '<div class="pct1" style="font-size:14px;font-weight:700;line-height:1.3">' + (lastSessionTime || P('Сессий пока нет', 'No sessions yet', 'Сесій поки немає')) + '</div>' +
        '<div class="pct4" style="font-size:11px;margin-top:4px">' + P('последняя сессия', 'last session', 'остання сесія') + '</div>' +
        (lastSession ? '<div class="pct5" style="font-size:10px;margin-top:4px">' + Math.round(lastSession.accuracy || 0) + '% · ' + (lastSession.speed || 0) + P(' зн/мин', ' ch/min', ' зн/хв') + '</div>' : '') +
    '</div>';
    html += '</div>';

    // ── 6. Achievements ──────────────────────────────────────────────────────
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
        '<p class="profile-section-title mb-0">🏆 ' + P('Достижения', 'Achievements', 'Досягнення') + '</p>' +
        '<span class="pct5" style="font-size:12px;font-weight:500">' + unlocked.length + ' / ' + allAchiev.length + '</span>' +
        (unlocked.length > 0
            ? '<div style="flex:1;height:4px;margin-left:4px" class="pcBarTr"><div style="height:100%;width:' + Math.round(unlocked.length / Math.max(1,allAchiev.length) * 100) + '%;background:linear-gradient(90deg,#10b981,#22d3ee);border-radius:99px"></div></div>'
            : '') +
    '</div>';

    if (unlocked.length === 0) {
        html += '<div class="pcD" style="margin-bottom:16px">' +
            '<div style="font-size:36px;margin-bottom:8px">🏅</div>' +
            '<div class="pct4" style="font-size:13px">' + P('Проходи уроки — получай достижения!', 'Complete lessons to earn achievements!', 'Проходь уроки — отримуй досягнення!') + '</div>' +
        '</div>';
    } else {
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:16px">';
        unlocked.slice(-4).reverse().forEach(function(a) {
            var aTitle = lang === 'en' ? a.titleEn : (lang === 'ua' ? a.titleUa : a.titleRu);
            html += '<div class="pcAch">' +
                '<div style="font-size:28px;margin-bottom:6px">' + (a.icon || '🎖️') + '</div>' +
                '<div class="pct1" style="font-size:11px;font-weight:700;line-height:1.3">' + escapeHtml(aTitle || a.titleRu || '') + '</div>' +
            '</div>';
        });
        if (lockedCount > 0) {
            html += '<div class="pcAch-lock">' +
                '<div style="font-size:22px;margin-bottom:6px">🔒</div>' +
                '<div class="pct6" style="font-size:11px">+ ' + lockedCount + ' ' + P('закрыто', 'locked', 'закрито') + '</div>' +
            '</div>';
        }
        html += '</div>';
    }

    // ── 7. Background ────────────────────────────────────────────────────────
    html += '<div class="pcC" style="display:flex;flex-wrap:wrap;align-items:center;gap:12px">' +
        '<p class="profile-section-title mb-0" style="margin:0">🎨 ' + P('Фон', 'Background', 'Фон') + '</p>' +
        '<div id="profileCurrentBgPreview" style="width:72px;height:44px;border-radius:8px;background-size:cover;background-position:center;border:1px solid var(--pcbr);flex-shrink:0"></div>' +
        '<button type="button" onclick="openBackgroundSelectorModal()" style="background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.4);color:#22d3ee;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600">' + P('Выбрать фон', 'Choose Background', 'Обрати фон') + '</button>' +
    '</div>';

    el.innerHTML = html;
}

function renderProfileHistory() {
    var el = document.getElementById('profileHistoryContent');
    if (!el) return;
    var lang = (app && app.lang) || 'ru';
    function P(ru, enStr, uaStr) {
        if (lang === 'en') return enStr;
        if (lang === 'ua') return (uaStr != null && uaStr !== '') ? uaStr : ru;
        return ru;
    }

    var sessions = (window.statsModule && window.statsModule.getRecentSessions) ? window.statsModule.getRecentSessions(15) : [];
    var allAchiev = (window.achievementsModule && window.achievementsModule.getAchievements) ? window.achievementsModule.getAchievements() : [];
    var unlockedIds = [];
    try { unlockedIds = JSON.parse(localStorage.getItem('typeMasterAchievements') || '[]'); } catch (e) {}
    var unlocked = allAchiev.filter(function (a) { return unlockedIds.indexOf(a.id) !== -1; });

    var html = '';

    // ── Recent Sessions ──
    html += '<p class="profile-section-title mb-3">🕒 ' + _t('profileTabSessions') + '</p>';

    if (sessions.length === 0) {
        html += '<div class="pcD">' +
            '<div style="font-size:3rem;margin-bottom:10px">📭</div>' +
            '<div class="pct5" style="font-size:14px;font-weight:600;margin-bottom:4px">' + _t('profileTabNoSessions') + '</div>' +
        '</div>';
    } else {
        html += '<div style="display:flex;flex-direction:column;gap:8px">';
        sessions.slice(0, 10).forEach(function (s) {
            var acc = s.accuracy || 0;
            var spd = s.speed || 0;
            var err = s.errors || 0;

            var spdColor = spd >= 300 ? '#f59e0b' : spd >= 200 ? '#22d3ee' : spd >= 100 ? '#10b981' : '#94a3b8';
            var spdIcon  = spd >= 300 ? '🔥' : spd >= 200 ? '⚡' : spd >= 100 ? '✅' : '🐌';
            var spdLabel = P(
                spd >= 300 ? 'Молния' : spd >= 200 ? 'Быстро' : spd >= 100 ? 'Хорошо' : 'Тренировка',
                spd >= 300 ? 'Lightning' : spd >= 200 ? 'Fast' : spd >= 100 ? 'Good' : 'Training',
                spd >= 300 ? 'Блискавка' : spd >= 200 ? 'Швидко' : spd >= 100 ? 'Добре' : 'Тренування'
            );
            var accColor  = acc >= 95 ? '#10b981' : acc >= 80 ? '#22d3ee' : acc >= 60 ? '#f59e0b' : '#ef4444';
            var errColor  = err === 0 ? '#10b981' : err <= 5 ? '#f59e0b' : '#ef4444';
            var modeIcon  = s.mode === 'lesson' ? '📚' : s.mode === 'speedtest' ? '⚡' : '✍️';
            var modeName  = s.mode === 'lesson' ? P('Урок', 'Lesson', 'Урок')
                          : s.mode === 'speedtest' ? P('Тест скорости', 'Speed Test', 'Тест швидкості')
                          : P('Практика', 'Practice', 'Практика');
            var resolved    = _resolveLessonName(s);
            var lessonTitle = resolved || P('Свободная практика', 'Free Practice', 'Вільна практика');
            var layoutBadge = s.layout ? s.layout.toUpperCase() : '';
            var timeStr     = _sessionTimeAgo(s.timestamp);
            var dur         = s.time ? (Math.floor(s.time / 60) + ':' + String(s.time % 60).padStart(2, '0')) : null;

            html += '<div class="pcSess" style="border-left:3px solid ' + accColor + '">' +
                '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">' +
                    '<div style="width:36px;height:36px;border-radius:8px;background:var(--pchv);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' + modeIcon + '</div>' +
                    '<div style="flex:1;min-width:0">' +
                        '<div class="pct1" style="font-size:14px;font-weight:700;line-height:1.3;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(lessonTitle) + '</div>' +
                        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
                            '<span class="pct4" style="font-size:10px">' + modeName + '</span>' +
                            (layoutBadge ? '<span class="pct3" style="font-size:9px;background:var(--pchv);padding:1px 7px;border-radius:99px;font-weight:700">' + layoutBadge + '</span>' : '') +
                            '<span class="pct6" style="font-size:10px">·</span>' +
                            '<span class="pct5" style="font-size:10px">' + (timeStr || '') + (dur ? ' · ' + dur : '') + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div style="flex-shrink:0;background:var(--pchv);border:1px solid var(--pcbr);border-radius:8px;padding:4px 8px;text-align:center">' +
                        '<div style="font-size:9px;font-weight:700;color:' + spdColor + ';letter-spacing:.06em">' + spdIcon + ' ' + spdLabel + '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">' +
                    '<div style="background:var(--pchv);border-radius:8px;padding:8px;text-align:center">' +
                        '<div style="font-size:18px;font-weight:800;color:' + spdColor + ';line-height:1">' + spd + '</div>' +
                        '<div class="pct5" style="font-size:9px;margin-top:2px;font-weight:600">' + P('зн/мин', 'ch/min', 'зн/хв') + '</div>' +
                    '</div>' +
                    '<div style="background:var(--pchv);border-radius:8px;padding:8px;text-align:center">' +
                        '<div style="font-size:18px;font-weight:800;color:' + accColor + ';line-height:1">' + acc + '%</div>' +
                        '<div class="pct5" style="font-size:9px;margin-top:2px;font-weight:600">' + P('точность', 'accuracy', 'точність') + '</div>' +
                    '</div>' +
                    '<div style="background:var(--pchv);border-radius:8px;padding:8px;text-align:center">' +
                        '<div style="font-size:18px;font-weight:800;color:' + errColor + ';line-height:1">' + err + '</div>' +
                        '<div class="pct5" style="font-size:9px;margin-top:2px;font-weight:600">' + P('ошибок', 'errors', 'помилок') + '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        });
        html += '</div>';
    }

    // ── Achievements ──
    html += '<p class="profile-section-title mt-6 mb-3">🏆 ' + _t('profileTabAchievements') + '</p>';

    if (unlocked.length === 0) {
        html += '<div class="pcD">' +
            '<div style="font-size:3rem;margin-bottom:10px">🔒</div>' +
            '<div class="pct4" style="font-size:13px">' + _t('profileTabNoAchiev') + '</div>' +
        '</div>';
    } else {
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">';
        unlocked.forEach(function (a) {
            var aTitle = lang === 'en' ? a.titleEn : (lang === 'ua' ? a.titleUa : a.titleRu);
            var aDesc = lang === 'en' ? a.descEn : (lang === 'ua' ? a.descUa : a.descRu);
            html += '<div class="pcAch" style="padding:16px 12px">' +
                '<div style="font-size:32px;margin-bottom:8px;line-height:1">' + (a.icon || '🎖️') + '</div>' +
                '<div class="pct1" style="font-size:12px;font-weight:700;margin-bottom:4px;line-height:1.3">' + escapeHtml(aTitle || '') + '</div>' +
                '<div class="pct4" style="font-size:10px;line-height:1.4">' + escapeHtml(aDesc || '') + '</div>' +
            '</div>';
        });
        var lockedCount = allAchiev.length - unlocked.length;
        if (lockedCount > 0) {
            html += '<div class="pcAch-lock" style="padding:16px 12px;opacity:.6">' +
                '<div style="font-size:28px;margin-bottom:8px">🔒</div>' +
                '<div class="pct5" style="font-size:11px">+ ' + lockedCount + ' ' + _t('profileTabLocked') + '</div>' +
            '</div>';
        }
        html += '</div>';
    }

    el.innerHTML = html;
}

function renderProfileErrors() {
    var el = document.getElementById('profileErrorsContent');
    if (!el) return;
    var lang = (app && app.lang) || 'ru';
    var en = lang === 'en';
    var uk = lang === 'ua';
    function P(ru, enStr, uaStr) {
        if (lang === 'en') return enStr;
        if (lang === 'ua') return (uaStr != null && uaStr !== '') ? uaStr : ru;
        return ru;
    }

    var keyErrors = {};
    try { keyErrors = JSON.parse(localStorage.getItem('zoob_key_errors') || '{}'); } catch (e) {}
    var sorted = Object.entries(keyErrors).sort(function (a, b) { return b[1] - a[1]; });
    var maxErr = sorted.length > 0 ? sorted[0][1] : 1;
    var totalKeyErr = sorted.reduce(function (s, e) { return s + e[1]; }, 0);

    var sessions = (window.statsModule && window.statsModule.getRecentSessions) ? window.statsModule.getRecentSessions(10) : [];
    var avgAcc = sessions.length ? Math.round(sessions.reduce(function (s, x) { return s + (x.accuracy || 0); }, 0) / sessions.length) : 0;

    var grade = avgAcc >= 95 ? { l: P('ОТЛИЧНО!', 'PERFECT!', 'ЧУДОВО!'), c: '#10b981', icon: '🏆', sub: P('Невероятная точность! Так держать!', 'Incredible typing! Keep it up!', 'Неймовірна точність! Так тримай!') }
              : avgAcc >= 85 ? { l: P('ХОРОШО!', 'GREAT!', 'ДОБРЕ!'),  c: '#22d3ee', icon: '⭐', sub: P('Очень хорошо! Продолжай тренироваться!', 'Very good! Keep practicing!', 'Дуже добре! Продовжуй тренуватися!') }
              : avgAcc >= 70 ? { l: P('НЕПЛОХО!', 'NOT BAD!', 'НЕПОГАНО!'), c: '#f59e0b', icon: '📈', sub: P('Становится лучше! Не останавливайся!', 'Getting better! Don\'t stop!', 'Стає краще! Не зупиняйся!') }
              : sessions.length > 0
              ?               { l: P('ТРЕНИРУЙСЯ!', 'KEEP GOING!', 'ТРЕНУЙСЯ!'), c: '#ef4444', icon: '💪', sub: P('Больше практики — меньше ошибок!', 'More practice = fewer mistakes!', 'Більше практики — менше помилок!') }
              : null;

    var html = '';

    // ── 1. Summary card ──────────────────────────────────────────────────────
    if (grade) {
        html += '<div class="pcLvl" style="border:1px solid ' + grade.c + '33;margin-bottom:22px">' +
            '<div style="display:flex;align-items:center;gap:18px">' +
                '<div style="font-size:48px;line-height:1">' + grade.icon + '</div>' +
                '<div style="flex:1">' +
                    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">' +
                        '<span style="font-size:34px;font-weight:900;color:' + grade.c + ';line-height:1">' + avgAcc + '%</span>' +
                        '<span style="font-size:15px;font-weight:800;color:' + grade.c + ';opacity:.85;letter-spacing:.04em">' + grade.l + '</span>' +
                    '</div>' +
                    '<div class="pcBarTr" style="height:8px;margin-bottom:8px">' +
                        '<div style="height:100%;width:' + avgAcc + '%;background:linear-gradient(90deg,' + grade.c + '66,' + grade.c + ');border-radius:99px"></div>' +
                    '</div>' +
                    '<p class="pct3" style="font-size:13px;margin:0">' + grade.sub + '</p>' +
                '</div>' +
            '</div>' +
            '<div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">' +
                '<div style="flex:1;min-width:80px;background:var(--pchv);border-radius:10px;padding:10px;text-align:center">' +
                    '<div style="font-size:22px;font-weight:800;color:#f87171">' + totalKeyErr + '</div>' +
                    '<div class="pct4" style="font-size:11px;margin-top:2px">' + P('❌ Всего ошибок', '❌ Total errors', '❌ Усього помилок') + '</div>' +
                '</div>' +
                '<div style="flex:1;min-width:80px;background:var(--pchv);border-radius:10px;padding:10px;text-align:center">' +
                    '<div style="font-size:22px;font-weight:800;color:#fb923c">' + sorted.length + '</div>' +
                    '<div class="pct4" style="font-size:11px;margin-top:2px">' + P('⌨️ Трудных букв', '⌨️ Hard keys', '⌨️ Складних літер') + '</div>' +
                '</div>' +
                '<div style="flex:1;min-width:80px;background:var(--pchv);border-radius:10px;padding:10px;text-align:center">' +
                    '<div style="font-size:22px;font-weight:800;color:#a3e635">' + sessions.length + '</div>' +
                    '<div class="pct4" style="font-size:11px;margin-top:2px">' + P('🎯 Уроков', '🎯 Sessions', '🎯 Сесій') + '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    // ── 2. Problem key cards ─────────────────────────────────────────────────
    html += '<p class="profile-section-title mb-4">⌨️ ' + P('Какие буквы даются труднее всего', 'Most Missed Keys', 'Які літери даються найважче') + '</p>';

    if (sorted.length === 0) {
        html += '<div class="pcD" style="padding:32px">' +
            '<div style="font-size:48px;margin-bottom:12px">🎯</div>' +
            '<div class="pct2" style="font-size:16px;font-weight:700;margin-bottom:6px">' + P('Ошибок пока нет!', 'No mistakes yet!', 'Помилок поки немає!') + '</div>' +
            '<div class="pct4" style="font-size:13px">' + P('Пройди урок — и здесь появится статистика по буквам.', 'Complete a lesson — key stats will appear here.', 'Пройди урок — і тут з’явиться статистика по літерах.') + '</div>' +
        '</div>';
    } else {
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:10px;margin-bottom:6px">';
        sorted.slice(0, 10).forEach(function (entry, i) {
            var ch = entry[0], cnt = entry[1];
            var pct = cnt / maxErr;
            var keyColor  = pct > 0.7 ? '#ef4444' : pct > 0.4 ? '#f97316' : pct > 0.15 ? '#f59e0b' : '#64748b';
            var glowColor = pct > 0.7 ? 'rgba(239,68,68,0.35)' : pct > 0.4 ? 'rgba(249,115,22,0.3)' : pct > 0.15 ? 'rgba(245,158,11,0.25)' : 'transparent';
            var medals = ['🥇','🥈','🥉'];
            var dispChar = ch === ' ' ? '␣' : ch;
            var timesLabel;
            if (en) {
                timesLabel = cnt === 1 ? '1 time' : cnt + ' times';
            } else if (uk) {
                var u10 = cnt % 10, u100 = cnt % 100;
                if (u10 === 1 && u100 !== 11) timesLabel = cnt + '\u00a0раз';
                else if (u10 >= 2 && u10 <= 4 && (u100 < 10 || u100 >= 20)) timesLabel = cnt + '\u00a0рази';
                else timesLabel = cnt + '\u00a0разів';
            } else {
                timesLabel = cnt + '\u00a0' + (cnt % 10 === 1 && cnt !== 11 ? 'раз' : cnt % 10 >= 2 && cnt % 10 <= 4 && (cnt < 10 || cnt > 20) ? 'раза' : 'раз');
            }

            html += '<div class="pcKey" style="' +
                'display:flex;flex-direction:column;align-items:center;gap:6px;' +
                'padding:14px 10px 12px;position:relative;' +
                'border:1px solid ' + keyColor + '44;border-bottom:4px solid ' + keyColor + ';' +
                'box-shadow:0 4px 16px ' + glowColor + ';' +
            '">' +
                (medals[i] ? '<span style="position:absolute;top:5px;right:6px;font-size:13px">' + medals[i] + '</span>' : '') +
                '<span class="pct1" style="font-size:30px;font-weight:900;font-family:monospace;line-height:1">' + escapeHtml(dispChar) + '</span>' +
                '<div class="pcBarTr" style="width:85%;height:4px">' +
                    '<div style="height:100%;width:' + Math.round(pct * 100) + '%;background:' + keyColor + ';border-radius:99px"></div>' +
                '</div>' +
                '<span style="font-size:11px;font-weight:700;color:' + keyColor + ';text-align:center;line-height:1.2">' + timesLabel + '</span>' +
            '</div>';
        });
        html += '</div>';
        if (sorted.length > 10) {
            html += '<p class="pct6" style="font-size:11px;text-align:center;margin-top:4px">+ ' + P('ещё ' + (sorted.length - 10) + ' букв', (sorted.length - 10) + ' more keys', 'ще ' + (sorted.length - 10) + ' літер') + '</p>';
        }
    }

    // ── 3. Tip ───────────────────────────────────────────────────────────────
    if (sorted.length > 0) {
        var worstChar = sorted[0][0];
        var worstCnt  = sorted[0][1];
        var dispWorst = worstChar === ' ' ? '␣' : worstChar;
        var tipText = en
            ? 'You miss the key <b style="color:#f59e0b;font-size:16px;font-family:monospace">' + escapeHtml(dispWorst) + '</b> most often — <b>' + worstCnt + ' time' + (worstCnt === 1 ? '' : 's') + '</b>. Try slowing down a little when you reach this key!'
            : uk
            ? 'Найчастіше ти промахуєшся по клавіші <b style="color:#f59e0b;font-size:18px;font-family:monospace">' + escapeHtml(dispWorst) + '</b> — уже <b>' + worstCnt + ' ' + (function () { var w = worstCnt % 10, wh = worstCnt % 100; if (w === 1 && wh !== 11) return 'раз'; if (w >= 2 && w <= 4 && (wh < 10 || wh >= 20)) return 'рази'; return 'разів'; })() + '</b>. Спробуй трохи сповільнитися, коли доходиш до цієї літери!'
            : 'Чаще всего ты промахиваешься по клавише <b style="color:#f59e0b;font-size:18px;font-family:monospace">' + escapeHtml(dispWorst) + '</b> — уже <b>' + worstCnt + ' раз' + (worstCnt % 10 >= 2 && worstCnt % 10 <= 4 && (worstCnt < 10 || worstCnt > 20) ? 'а' : '') + '</b>. Попробуй немного притормозить, когда доходишь до этой буквы!';
        html += '<div class="pcTip">' +
            '<span style="font-size:30px;flex-shrink:0;line-height:1">💡</span>' +
            '<div>' +
                '<div style="font-size:12px;font-weight:800;color:#f59e0b;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">' + P('Совет лично для тебя', 'Personal Tip', 'Порада саме для тебе') + '</div>' +
                '<div class="pct2" style="font-size:14px;line-height:1.65">' + tipText + '</div>' +
            '</div>' +
        '</div>';
    }

    // ── 3.5 Кнопка тренировки слабых клавиш ─────────────────────────────────
    if (sorted.length > 0) {
        html += '<button onclick="startAdaptivePractice()" style="' +
            'width:100%;margin:18px 0 6px;padding:14px;border-radius:12px;' +
            'background:linear-gradient(135deg,rgba(99,102,241,0.25),rgba(6,182,212,0.2));' +
            'border:1px solid rgba(99,102,241,0.45);color:#a5b4fc;' +
            'font-size:14px;font-weight:700;cursor:pointer;' +
            'display:flex;align-items:center;justify-content:center;gap:10px;' +
            'transition:background 0.2s,border-color 0.2s;"' +
            ' onmouseover="this.style.background=\'linear-gradient(135deg,rgba(99,102,241,0.45),rgba(6,182,212,0.35))\'"' +
            ' onmouseout="this.style.background=\'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(6,182,212,0.2))\'">' +
            '<span style="font-size:20px">🎯</span>' +
            '<span>' + (en ? 'Train Weak Keys' : 'Тренировать слабые клавиши') + '</span>' +
        '</button>';
    }

    // ── 4. Recent attempts ───────────────────────────────────────────────────
    if (sessions.length > 0) {
        html += '<p class="profile-section-title mt-6 mb-3">🎮 ' + (en ? 'Recent Attempts' : 'Последние попытки') + '</p>';
        html += '<div style="display:flex;flex-direction:column;gap:6px">';
        sessions.slice(0, 6).forEach(function (s, i) {
            var acc = s.accuracy || 0;
            var stars = acc >= 95 ? '⭐⭐⭐' : acc >= 80 ? '⭐⭐' : acc >= 60 ? '⭐' : '';
            var label = acc >= 95 ? (en ? 'Perfect!' : 'Отлично!')
                      : acc >= 80 ? (en ? 'Good!' : 'Хорошо!')
                      : acc >= 60 ? (en ? 'Keep going!' : 'Неплохо!')
                      :             (en ? 'Need work' : 'Надо работать');
            var labelColor = acc >= 95 ? '#10b981' : acc >= 80 ? '#22d3ee' : acc >= 60 ? '#f59e0b' : '#ef4444';
            var resolved = _resolveLessonName(s);
            var title = resolved || (en ? 'Free Practice' : 'Свободная практика');
            var timeStr = _sessionTimeAgo(s.timestamp);

            html += '<div class="pcSess" style="display:flex;align-items:center;gap:12px">' +
                '<div style="font-size:20px;line-height:1;flex-shrink:0;min-width:52px;text-align:center">' + (stars || '❌') + '</div>' +
                '<div style="flex:1;min-width:0">' +
                    '<div class="pct1" style="font-size:13px;font-weight:' + (i === 0 ? '700' : '500') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(title) + '</div>' +
                    '<div class="pct5" style="font-size:10px;margin-top:1px">' + (timeStr || '') + '</div>' +
                '</div>' +
                '<div style="text-align:right;flex-shrink:0">' +
                    '<div style="font-size:18px;font-weight:800;color:' + labelColor + '">' + acc + '%</div>' +
                    '<div style="font-size:10px;color:' + labelColor + ';opacity:.8">' + label + '</div>' +
                '</div>' +
            '</div>';
        });
        html += '</div>';
    }

    el.innerHTML = html;
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

    // Reset tabs to Overview on each profile open
    showProfileTab('overview');

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
    if (bioEl) bioEl.value = (!profile.bio || profile.bio === 'null') ? '' : profile.bio;
    
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

    // Re-render dynamic overview tab with fresh profile data
    renderProfileOverview();
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
let selectedWordCount = 500; // Default (now used as "chars" length)
let selectedTheme = 'random'; // Default
let selectedMultiplayerLang = 'ru'; // Default
let selectedTextOptComma = true;
let selectedTextOptPeriod = true;
let selectedTextOptDigits = false;
let selectedTextOptMixCase = false;

// Show room settings
function showRoomSettings() {
    document.getElementById('multiplayerMainMenu').classList.add('hidden');
    document.getElementById('roomSettingsDialog').classList.remove('hidden');
    document.getElementById('joinRoomDialog').classList.add('hidden');
    updateRoomSelectionUI();
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
    updateRoomSelectionUI();
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
    updateRoomSelectionUI();
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
    updateRoomSelectionUI();
}

function setMultiplayerTextOption(type, value) {
    if (type === 'comma') selectedTextOptComma = !!value;
    if (type === 'period') selectedTextOptPeriod = !!value;
    if (type === 'digits') selectedTextOptDigits = !!value;
    if (type === 'mixCase') selectedTextOptMixCase = !!value;
    updateRoomSelectionUI();
}

function getMultiplayerTextOptions() {
    return {
        lengthMode: 'chars',
        includeComma: selectedTextOptComma,
        includePeriod: selectedTextOptPeriod,
        includeDigits: selectedTextOptDigits,
        mixCase: selectedTextOptMixCase
    };
}

function updateRoomSelectionUI() {
    const dialog = document.getElementById('roomSettingsDialog');
    if (!dialog) return;

    // Ensure selected-state attrs are always visible (independent of Tailwind generation).
    dialog.querySelectorAll('.theme-btn').forEach(btn => {
        const t = btn.getAttribute('data-theme');
        btn.dataset.selected = String(t === selectedTheme);
    });
    dialog.querySelectorAll('.mp-lang-btn').forEach(btn => {
        const l = btn.getAttribute('data-lang');
        btn.dataset.selected = String(l === selectedMultiplayerLang);
    });
    dialog.querySelectorAll('.room-setting-btn').forEach(btn => {
        const w = parseInt(btn.getAttribute('data-words') || '0', 10);
        btn.dataset.selected = String(w === selectedWordCount);
    });

    // Options visual state
    const setOptOn = (opt, on) => {
        const el = dialog.querySelector(`.mp-opt[data-opt="${opt}"]`);
        if (el) el.dataset.on = String(!!on);
    };
    setOptOn('comma', selectedTextOptComma);
    setOptOn('period', selectedTextOptPeriod);
    setOptOn('digits', selectedTextOptDigits);
    setOptOn('mixCase', selectedTextOptMixCase);

    // Summary — language-aware labels
    const isEn = app.lang === 'en';
    const isUa = app.lang === 'ua';

    const themeTitles = isEn
        ? { random: 'Random', anime: 'Anime', games: 'Games', animals: 'Animals', space: 'Space', nature: 'Nature' }
        : isUa
            ? { random: 'Випадкові', anime: 'Аніме', games: 'Ігри', animals: 'Тварини', space: 'Космос', nature: 'Природа' }
            : { random: 'Случайные', anime: 'Аниме', games: 'Игры', animals: 'Животные', space: 'Космос', nature: 'Природа' };

    const langTitles = { ru: 'RU', en: 'EN', ua: 'UA' };

    const labelTheme = isEn ? 'THEME: ' : isUa ? 'ТЕМА: ' : 'ТЕМА: ';
    const labelLang  = isEn ? 'LANG: '  : isUa ? 'МОВА: ' : 'ЯЗЫК: ';
    const labelLen   = isEn ? 'LENGTH: ' : isUa ? 'ДОВЖИНА: ' : 'ДЛИНА: ';

    const themeEl = document.getElementById('mpRoomSummaryTheme');
    const langEl = document.getElementById('mpRoomSummaryLang');
    const lenEl = document.getElementById('mpRoomSummaryLen');

    if (themeEl) themeEl.textContent = labelTheme + (themeTitles[selectedTheme] || 'RANDOM');
    if (langEl) langEl.textContent = labelLang + (langTitles[selectedMultiplayerLang] || selectedMultiplayerLang.toUpperCase());
    if (lenEl) lenEl.textContent = labelLen + String(selectedWordCount);
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
        const opts = getMultiplayerTextOptions();
        const roomCode = await window.multiplayerModule.createRoom(selectedWordCount, selectedTheme, selectedMultiplayerLang, opts);
        
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
        window.secondPlayerNotified = false;
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
async function leaveMultiplayerRoom(redirectTo = 'home') {
    try {
        // Stop game input handler to avoid "ghost" key presses after leaving.
        app.gameEnded = true;
        document.removeEventListener('keydown', handleMultiplayerKeyPress);

        await window.multiplayerModule.leaveRoom();
        showToast(t('leftRoom'), 'info', t('multiplayer'));
        if (redirectTo === 'multiplayer-menu') {
            showMultiplayerMenu();
        } else {
            showHome();
        }
        // Восстанавливаем фон и частицы
        setRandomBackground();
        createParticles();
    } catch (error) {
        console.error('Failed to leave room:', error);
        if (redirectTo === 'multiplayer-menu') {
            showMultiplayerMenu();
        } else {
            showHome();
        }
        setRandomBackground();
        createParticles();
    }
}

// Copy room code to clipboard
function copyRoomCode() {
    const roomCode = document.getElementById('multiplayerRoomCode').textContent;
    const onSuccess = () => showToast(`${t('codeCopied')}: ${roomCode}`, 'success');
    const onFail = () => showToast(t('copyFailed') || 'Ошибка копирования', 'error');

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(roomCode).then(onSuccess).catch(() => fallbackCopy());
    } else {
        fallbackCopy();
    }

    function fallbackCopy() {
        var textarea = document.createElement('textarea');
        textarea.value = roomCode;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        try {
            textarea.select();
            textarea.setSelectionRange(0, roomCode.length);
            document.execCommand('copy') ? onSuccess() : onFail();
        } catch (e) {
            onFail();
        }
        document.body.removeChild(textarea);
    }
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
    const windowLen = endPos - startPos;

    if (windowLen === 0) { display.innerHTML = ''; return; }

    // Reuse existing spans — same strategy as single-player renderText.
    while (display.childElementCount > windowLen) display.removeChild(display.lastChild);
    if (display.childElementCount < windowLen) {
        const frag = document.createDocumentFragment();
        for (let i = display.childElementCount; i < windowLen; i++) frag.appendChild(document.createElement('span'));
        display.appendChild(frag);
    }

    const children = display.children;
    for (let i = 0; i < windowLen; i++) {
        const charIdx = startPos + i;
        const char = app.currentText[charIdx];
        const span = children[i];

        let newClass;
        if (charIdx < app.currentPosition) {
            newClass = 'char-typed';
            const dist = app.currentPosition - charIdx;
            span.style.cssText = 'opacity:' + Math.max(0.2, 1 - (dist / TYPED_VISIBLE)) + ';font-size:0.9em';
        } else {
            if (span.style.cssText) span.style.cssText = '';
            newClass = charIdx === app.currentPosition ? 'char-current' : 'char-future';
        }

        if (span.className !== newClass) span.className = newClass;
        const content = char === ' ' ? '\u00A0' : char;
        if (span.textContent !== content) span.textContent = content;
    }

    const cursorSpan = children[app.currentPosition - startPos];
    if (cursorSpan) cursorSpan.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
}

window.onMultiplayerUpdate = (data) => {
    if (data && typeof data.opponentErrors !== 'undefined') {
        app.opponentErrors = data.opponentErrors || 0;
    }
    if (data && typeof data.opponentReady !== 'undefined') {
        app.opponentReady = !!data.opponentReady;
    }
    if (data && typeof data.myReady !== 'undefined') {
        app.myReady = !!data.myReady;
    }
    updateMultiplayerResultsHint();
    // Update player count
    if (data.playerCount) {
        // If opponent left, allow the "second player joined" toast next time.
        if (data.playerCount < 2 && window.secondPlayerNotified) {
            window.secondPlayerNotified = false;
        }
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
    
    // Close results modal and stop countdown from previous rematch.
    try { closeMultiplayerResultsModal(); } catch (e) {}
    stopMultiplayerRematchCountdown();
    
    // Setup game
    app.currentText = gameText;
    app.currentPosition = 0;
    app.errors = 0;
    app.startTime = Date.now();
    app.isPaused = false;
    
    // Render text
    const display = document.getElementById('multiplayerTextDisplay');
    renderMultiplayerText();
    if (display) {
        // Prevent stale horizontal scroll offset from previous match.
        display.scrollLeft = 0;
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
        // Disable rematch auto-start: mark myself as not ready.
        try { window.multiplayerModule?.setReadyForNext?.(false); } catch (e) {}
        openMultiplayerResultsModal(false);
    }
};

window.onOpponentLeft = () => {
    // Even if game already ended (results modal is open), we still must update UI.
    try { closeMultiplayerResultsModal(); } catch (e) {}
    stopMultiplayerRematchCountdown();

    // Prevent ghost input
    try { document.removeEventListener('keydown', handleMultiplayerKeyPress); } catch (e) {}

    showToast(t('opponentLeft'), 'warning', t('roomClosed'));
    // Return player to a consistent "waiting" state.
    try {
        returnToMultiplayerLobby();
    } catch (e) {
        setTimeout(() => returnToMultiplayerLobby(), 300);
    }
};

// Handle multiplayer key press
function handleMultiplayerKeyPress(e) {
    if (app.currentMode !== 'multiplayer-game' || app.isPaused) return;
    
    const expectedCharForKey = app.currentText[app.currentPosition];
    if (e.key.length > 1 && e.key !== 'Backspace' && !(e.key === 'Enter' && expectedCharForKey === '\n')) return;
    
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
        window.multiplayerModule?.updateErrors?.(app.errors);
    }
}

// Update multiplayer progress
function updateMultiplayerProgress() {
    if (!app.currentText || app.currentText.length === 0) {
        const progress = 0;
        document.getElementById('multiplayerMyProgress').textContent = progress;
        document.getElementById('multiplayerMyProgressBar').style.width = progress + '%';
        return;
    }
    const raw = (app.currentPosition / app.currentText.length) * 100;
    const isFinished = app.currentPosition >= app.currentText.length;
    const progress = isFinished ? 100 : Math.floor(raw);
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
    try {
        await window.multiplayerModule.finishGame();
    } catch (e) {
        console.error('finishMultiplayerGame error:', e);
    } finally {
        openMultiplayerResultsModal(true);
    }
}

// Return to lobby after match
async function returnToMultiplayerLobby() {
    try { await window.multiplayerModule.resetGame(); } catch (e) {}
    hideAllScreens();
    document.getElementById('multiplayerWaitingScreen').classList.remove('hidden');
    app.currentMode = 'multiplayer-waiting';
    app.gameEnded = false;
    window.secondPlayerNotified = false;
}

function formatClock(totalSeconds) {
    totalSeconds = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m + ':' + String(s).padStart(2, '0');
}

function openMultiplayerResultsModal(isWin) {
    const modal = document.getElementById('multiplayerResultsModal');
    if (!modal) return;

    const myChars = app.currentPosition || 0;
    const myErrors = app.errors || 0;
    const totalLen = (app.currentText && app.currentText.length) ? app.currentText.length : 1;
    const opponentErrors = app.opponentErrors || 0;

    // Opponent chars from current opponent progress percent.
    const oppProgressEl = document.getElementById('multiplayerOpponentProgress');
    const oppProgress = oppProgressEl ? parseFloat(oppProgressEl.textContent) : 0;
    const oppChars = Math.round((oppProgress / 100) * totalLen);

    const timeSec = (Date.now() - (app.startTime || Date.now())) / 1000;
    const minutes = Math.max(1 / 60, timeSec / 60);

    const myCpm = Math.round(myChars / minutes);
    const myWpm = Math.round((myChars / 5) / minutes);
    const myAcc = Math.round(myChars + myErrors > 0 ? (myChars / (myChars + myErrors)) * 100 : 100);

    const oppCpm = Math.round(oppChars / minutes);
    const oppWpm = Math.round((oppChars / 5) / minutes);
    const oppAcc = Math.round(oppChars + opponentErrors > 0 ? (oppChars / (oppChars + opponentErrors)) * 100 : 100);

    const isEnglish = app.lang === 'en';
    const isUkrainian = app.lang === 'ua';
    const badgeWin = isEnglish ? 'WIN' : (isUkrainian ? 'ПОБЕДА' : 'ПОБЕДА');
    const badgeLose = isEnglish ? 'LOSE' : (isUkrainian ? 'ПОРАЖЕННЯ' : 'ПОРАЖЕНИЕ');

    const title = isWin ? (isEnglish ? 'Victory' : 'Победа') : (isEnglish ? 'Defeat' : 'Поражение');
    const subtitle = isWin
        ? (isEnglish ? 'Match finished. You typed faster.' : 'Матч завершён. Вы ввели текст быстрее.')
        : (isEnglish ? 'Match finished. Opponent was faster.' : 'Матч завершён. Соперник был быстрее.');

    document.getElementById('multiplayerResultsTitle').textContent = title;
    document.getElementById('multiplayerResultsSubtitle').textContent = subtitle;
    document.getElementById('mpResMyBadge').textContent = isWin ? badgeWin : badgeLose;
    document.getElementById('mpResOppBadge').textContent = isWin ? badgeLose : badgeWin;

    document.getElementById('mpResMyCpm').textContent = myCpm;
    document.getElementById('mpResMyWpm').textContent = myWpm;
    document.getElementById('mpResMyAcc').textContent = myAcc;
    document.getElementById('mpResMyChars').textContent = myChars;
    document.getElementById('mpResMyErrors').textContent = myErrors;
    document.getElementById('mpResMyTime').textContent = formatClock(timeSec);

    document.getElementById('mpResOppCpm').textContent = oppCpm;
    document.getElementById('mpResOppWpm').textContent = oppWpm;
    document.getElementById('mpResOppAcc').textContent = oppAcc;
    document.getElementById('mpResOppChars').textContent = oppChars;
    document.getElementById('mpResOppErrors').textContent = opponentErrors;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    updateMultiplayerResultsHint();
}

function updateMultiplayerResultsHint() {
    const modal = document.getElementById('multiplayerResultsModal');
    const hint = document.getElementById('mpResRematchHint');
    if (!modal || !hint) return;
    const isVisible = !modal.classList.contains('hidden');
    if (!isVisible) return;

    const isEnglish = app.lang === 'en';
    const isUkrainian = app.lang === 'ua';

    const opponentWants = app.opponentReady === true;
    const iWant = app.myReady === true;

    updateMultiplayerReadyPills();

    if (!opponentWants) {
        hint.style.animation = '';
        hint.textContent = isEnglish
            ? 'Next match starts only when both players press "Rematch".'
            : (isUkrainian ? 'Наступний матч почнеться лише коли обидва гравці натиснуть «Грати знову».' : 'Следующий матч начнётся только когда оба игрока нажмут «Играть снова».');
        hint.style.border = '1px solid rgba(255,255,255,0.10)';
        hint.style.background = 'transparent';
        hint.style.boxShadow = 'none';
        return;
    }

    if (opponentWants && !iWant) {
        hint.style.animation = '';
        hint.textContent = isEnglish
            ? 'Your opponent wants a rematch. Press "Rematch" to start.'
            : (isUkrainian ? 'Суперник хоче зіграти ще раз. Натисніть «Грати знову».' : 'Соперник хочет сыграть ещё раз. Нажмите «Играть снова».');
        hint.style.border = '1px solid rgba(168,85,247,0.25)';
        hint.style.background = 'rgba(168,85,247,0.08)';
        hint.style.boxShadow = '0 0 22px rgba(168,85,247,0.18)';
        return;
    }

    if (opponentWants && iWant) {
        startMultiplayerRematchCountdown();
        const remainingMs = mpRematchCountdownEndTs ? (mpRematchCountdownEndTs - Date.now()) : 0;
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

        hint.textContent = isEnglish
            ? `Both players are ready. Starting next match in ${remainingSec}s...`
            : (isUkrainian
                ? `Обидва гравці готові. Наступний матч через ${remainingSec}с...`
                : `Оба игрока готовы. Следующий матч через ${remainingSec}с...`);
        hint.style.border = '1px solid rgba(0,229,255,0.25)';
        hint.style.background = 'rgba(0,229,255,0.08)';
        hint.style.boxShadow = '0 0 22px rgba(0,229,255,0.18)';
        hint.style.animation = 'mpCountdownPulse 0.85s ease-in-out infinite';
        return;
    }
}

function updateMultiplayerReadyPills() {
    const myPill = document.getElementById('mpResMyReadyPill');
    const oppPill = document.getElementById('mpResOppReadyPill');
    if (!myPill || !oppPill) return;

    const isEnglish = app.lang === 'en';
    const isUkrainian = app.lang === 'ua';

    const myReady = app.myReady === true;
    const oppReady = app.opponentReady === true;

    const myText = myReady
        ? (isEnglish ? 'YOU READY' : (isUkrainian ? 'ВИ ГОТОВІ' : 'ВЫ ГОТОВЫ'))
        : (isEnglish ? 'YOU WAIT' : (isUkrainian ? 'ВИ ЧЕКАЄТЕ' : 'ВЫ ЖДЁТЕ'));

    const oppText = oppReady
        ? (isEnglish ? 'OPP READY' : (isUkrainian ? 'СУПЕРНИК ГОТОВИЙ' : 'СОПЕРНИК ГОТОВ'))
        : (isEnglish ? 'OPP WAIT' : (isUkrainian ? 'СУПЕРНИК ЧЕКАЄ' : 'СОПЕРНИК ЖДЁТ'));

    const applyPillStyle = (el, isReady, color) => {
        el.textContent = el === myPill ? myText : oppText;
        if (isReady) {
            el.style.borderColor = color.readyBorder;
            el.style.background = color.readyBg;
            el.style.color = color.readyColor;
            el.style.boxShadow = color.readyGlow;
        } else {
            el.style.borderColor = color.notBorder;
            el.style.background = color.notBg;
            el.style.color = color.notColor;
            el.style.boxShadow = 'none';
        }
    };

    applyPillStyle(myPill, myReady, {
        readyBorder: 'rgba(0,229,255,0.85)',
        readyBg: 'rgba(0,229,255,0.12)',
        readyColor: 'rgba(0,229,255,0.98)',
        readyGlow: '0 0 18px rgba(0,229,255,0.22)',
        notBorder: 'rgba(255,255,255,0.10)',
        notBg: 'rgba(255,255,255,0.04)',
        notColor: 'rgba(229,231,235,0.75)'
    });

    applyPillStyle(oppPill, oppReady, {
        readyBorder: 'rgba(168,85,247,0.85)',
        readyBg: 'rgba(168,85,247,0.12)',
        readyColor: 'rgba(196,181,253,0.98)',
        readyGlow: '0 0 18px rgba(168,85,247,0.20)',
        notBorder: 'rgba(255,255,255,0.10)',
        notBg: 'rgba(255,255,255,0.04)',
        notColor: 'rgba(229,231,235,0.75)'
    });
}

function closeMultiplayerResultsModal() {
    const modal = document.getElementById('multiplayerResultsModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    stopMultiplayerRematchCountdown();
}

let mpRematchCountdownIntervalId = null;
let mpRematchCountdownEndTs = null;

function stopMultiplayerRematchCountdown() {
    if (mpRematchCountdownIntervalId) {
        clearInterval(mpRematchCountdownIntervalId);
        mpRematchCountdownIntervalId = null;
    }
    mpRematchCountdownEndTs = null;
}

function startMultiplayerRematchCountdown() {
    if (mpRematchCountdownIntervalId) return;
    // Host auto-start delay is 3000ms.
    mpRematchCountdownEndTs = Date.now() + 3000;
    mpRematchCountdownIntervalId = setInterval(function () {
        updateMultiplayerResultsHint();
        const remainingMs = mpRematchCountdownEndTs ? (mpRematchCountdownEndTs - Date.now()) : 0;
        if (remainingMs <= 0) stopMultiplayerRematchCountdown();
    }, 150);
}

window.multiplayerResultsRematch = async function() {
    closeMultiplayerResultsModal();
    // Reset local player state and mark myself ready (server will start next match only after both are ready).
    await returnToMultiplayerLobby();
};

window.multiplayerResultsExit = async function() {
    closeMultiplayerResultsModal();
    await leaveMultiplayerRoom();
};

window.multiplayerResultsSettings = async function() {
    closeMultiplayerResultsModal();
    await leaveMultiplayerRoom('multiplayer-menu');
};

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
        
        const shopCharLabel = formatLessonCharCountLabel(lesson);
        const shopCharLine = shopCharLabel
            ? `<div class="text-xs text-slate-400 mt-1 font-medium" title="${escapeHtml(typeof t === 'function' ? t('lessonCharsHint') : '')}">${escapeHtml(shopCharLabel)}</div>`
            : '';
        const frontContent = `
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1 min-w-0 pr-2">
                    <h3 class="text-base font-bold mb-1 text-gray-100 line-clamp-1">${escapeHtml(lesson.name)}</h3>
                    <p class="text-xs text-gray-400 mb-1 line-clamp-2">${escapeHtml(lesson.description)}</p>
                    <span class="text-xs ${difficultyColors[lesson.difficulty]} font-semibold">${difficultyNames[lesson.difficulty]}</span>
                    ${shopCharLine}
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

