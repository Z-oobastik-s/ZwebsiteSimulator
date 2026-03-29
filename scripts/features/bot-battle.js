/**
 * Offline typing duel vs simulated opponent (RU/EN/UA text + localized chatter).
 * Optional Web Speech API for short spoken lines.
 */
(function (global) {
    'use strict';

    var STORAGE_TTS = 'zoob_mp_bot_tts';

    var NAMES = {
        ru: ['NeoType', 'БыстрыйЛис', 'Клавишник', 'ТурбоПалец', 'НочнойОхотник', 'СтримерOK', 'КиберПечать', 'ГонщикWPM', 'Спринтер', 'ТихийШторм'],
        en: ['SwiftKeys', 'GhostFinger', 'NightOwl', 'TurboTypist', 'PixelPilot', 'StormTap', 'ZeroLag', 'KeyRunner', 'BlurHands', 'CoffeeCPM'],
        ua: ['ШвидкийЛис', 'Клавішник', 'ТурбоПалець', 'НічнийСокіл', 'КіберДрук', 'СпуртWPM', 'ТихаБуря', 'ГонщикЗн', 'Мерехтіння', 'РанковаЧашка']
    };

    var BUNDLES = {
        ru: {
            start: ['Погнали!', 'Не отставай, старт!', 'Сейчас будет жарко.', 'Покажи, на что способен.', 'Я уже размялся.', 'Давай без лишних слов — в бой.', 'Кто первый — тот молодец.', 'Текст длинный, нервы короткие — классика.'],
            botAhead: ['Чуть впереди, догоняй)', 'Пока я лидирую.', 'О, я убежал на пару слов.', 'Не расслабляйся.', 'Темп хороший, но я быстрее.', 'Вижу тебя в зеркале заднего вида.'],
            playerAhead: ['Ого, ты шустрый.', 'Ладно, включаю вторую передачу.', 'Сейчас догоню.', 'Ты меня удивил.', 'Пару секунд на перехват.', 'Не празднуй раньше времени.'],
            botTypo: ['Ой, промах.', 'Чёрт, кривая буква.', 'Сбился, продолжаю.', 'Мимо — бывает.', 'Пальцы споткнулись.'],
            mid: ['Середина — самое вкусное.', 'Дышим ровно, печатаем дальше.', 'Ещё чуть-чуть до финиша.', 'Руки помнят движения.', 'Не смотри на меня — смотри в текст.'],
            sprint: ['Финиш близко, жми!', 'Последний рывок!', 'Сейчас решится всё.', 'Давай, без тормозов!', 'Финишная прямая.'],
            idle: ['*стук по клавишам*', 'Хм…', 'Норм темп.', 'Интересный набор букв.', 'Сосредоточенно печатаю.', 'Кофе ещё не остыл.', 'Слушаю только клики.', 'Пальцы на месте.'],
            botWin: ['Победа за мной, увидимся в реванше!', 'Финиш! Было круто.', 'Я первый — но ты тоже молодец.', 'ГГ, до следующего раунда.'],
            playerWin: ['Красота, ты быстрее!', 'Честная победа, респект.', 'Ты сегодня в ударе.', 'Я отстал — в следующий раз отыграюсь.']
        },
        en: {
            start: ['Let\'s go!', 'No mercy — start!', 'This will be fun.', 'Show me your pace.', 'Fingers warmed up.', 'Less talk, more keys.', 'First to finish wins the vibe.', 'Long text, short breath — classic.'],
            botAhead: ['Slightly ahead — catch up.', 'Leading for now.', 'A few words in front.', 'Stay sharp.', 'Good tempo, but I edge you.', 'I can see you in the rear mirror.'],
            playerAhead: ['Whoa, you are fast.', 'Okay, shifting up.', 'Closing the gap.', 'You surprised me.', 'Give me a second to answer.', 'Do not celebrate too early.'],
            botTypo: ['Oops, typo.', 'Slipped a key.', 'My bad, continuing.', 'Wide miss.', 'Fingers tripped.'],
            mid: ['Middle is the tasty part.', 'Breathe steady, keep typing.', 'A bit more to the finish.', 'Muscle memory engaged.', 'Eyes on the text, not on me.'],
            sprint: ['Finish line close — push!', 'Final burst!', 'This decides it.', 'No brakes now!', 'Home stretch.'],
            idle: ['*click clack*', 'Hmm…', 'Solid pace.', 'Interesting letters today.', 'Focused typing.', 'Coffee still hot.', 'Just hearing keys.', 'Hands in the zone.'],
            botWin: ['Win is mine — rematch anytime!', 'Done! Good fight.', 'I crossed first — you still rocked.', 'GG, see you next round.'],
            playerWin: ['Nice, you were faster!', 'Fair win, respect.', 'You are on fire today.', 'I lagged — next time I strike back.']
        },
        ua: {
            start: ['Погнали!', 'Без жалю — старт!', 'Буде цікаво.', 'Покажи свій темп.', 'Пальці вже розігріті.', 'Менше слів — більше клавіш.', 'Хто перший — той молодець.', 'Довгий текст, короткий подих.'],
            botAhead: ['Трохи попереду — наздоганяй)', 'Поки що я лідирую.', 'На кілька слів уперед.', 'Не розслабляйся.', 'Гарний темп, але я швидший.', 'Бачу тебе в «дзеркалі»).'],
            playerAhead: ['Ого, ти швидкий.', 'Гаразд, додаю газу.', 'Зараз наздожену.', 'Ти мене здивував.', 'Дай секунду відповісти.', 'Не святкуй занадто рано.'],
            botTypo: ['Йой, помилка.', 'Промах по клавіші.', 'Мій косяк, їду далі.', 'Мимо — буває.', 'Пальці спіткнулись.'],
            mid: ['Середина — найсмачніше.', 'Дихаємо рівно, друкуємо далі.', 'Ще трохи до фінішу.', 'М\'язова пам\'ять увімкнулась.', 'Дивись у текст, не на мене.'],
            sprint: ['Фініш близько — жми!', 'Останній ривок!', 'Зараз вирішиться.', 'Без гальм!', 'Фінішна пряма.'],
            idle: ['*клац-клац*', 'Хм…', 'Нормальний темп.', 'Цікавий набір літер.', 'Зосереджено друкую.', 'Кава ще гаряча.', 'Чую лише клавіші.', 'Руки в темі.'],
            botWin: ['Перемога за мною — реванш коли завгодно!', 'Готово! Було круто.', 'Я перший — ти теж молодець.', 'ГГ, до наступного раунду.'],
            playerWin: ['Красиво, ти швидший!', 'Чесна перемога, респект.', 'Ти сьогодні у формі.', 'Я відстав — наступного разу відіграюсь.']
        }
    };

    var state = null;

    function langKey(lang) {
        if (lang === 'en') return 'en';
        if (lang === 'ua') return 'ua';
        return 'ru';
    }

    function bundleFor(lang) {
        return BUNDLES[langKey(lang)] || BUNDLES.ru;
    }

    function pickBotName(lang) {
        var arr = NAMES[langKey(lang)] || NAMES.ru;
        return arr[Math.floor(Math.random() * arr.length)] || 'Bot';
    }

    function pickLine(bundle, key, lastLine) {
        var arr = bundle[key] || bundle.start;
        var line = arr[Math.floor(Math.random() * arr.length)];
        var guard = 0;
        while (line === lastLine && guard++ < 6 && arr.length > 1) {
            line = arr[Math.floor(Math.random() * arr.length)];
        }
        return line;
    }

    function clamp(n, a, b) {
        return Math.max(a, Math.min(b, n));
    }

    function synthSpeak(text, lang) {
        if (!global.speechSynthesis || !text) return;
        try {
            global.speechSynthesis.cancel();
            var u = new global.SpeechSynthesisUtterance(text);
            u.rate = 1.02 + Math.random() * 0.1;
            u.pitch = 0.9 + Math.random() * 0.18;
            u.volume = 0.82;
            if (langKey(lang) === 'ua') u.lang = 'uk-UA';
            else if (langKey(lang) === 'en') u.lang = 'en-US';
            else u.lang = 'ru-RU';
            global.speechSynthesis.speak(u);
        } catch (e) {}
    }

    function stop() {
        if (state && state.rafId) {
            try { global.cancelAnimationFrame(state.rafId); } catch (e) {}
        }
        state = null;
        try {
            if (global.speechSynthesis) global.speechSynthesis.cancel();
        } catch (e2) {}
    }

    function pushMessage(text, doTts) {
        if (!state || !text) return;
        state.lastLine = text;
        if (state.onMessage) state.onMessage(text);
        if (doTts && state.ttsEnabled) {
            var now = performance.now();
            if (now - state.lastTtsAt > 3500) {
                state.lastTtsAt = now;
                synthSpeak(text, state.textLang);
            }
        }
    }

    function maybeReactive(playerChars, textLen) {
        if (!state || textLen <= 0) return;
        var now = performance.now();
        if (now - state.lastReactiveAt < 2800) return;
        var pr = playerChars / textLen;
        var br = state.botChars / textLen;
        var bundle = state.bundle;
        if (pr > br + 0.11) {
            state.lastReactiveAt = now;
            pushMessage(pickLine(bundle, 'playerAhead', state.lastLine), true);
        } else if (br > pr + 0.11) {
            state.lastReactiveAt = now;
            pushMessage(pickLine(bundle, 'botAhead', state.lastLine), true);
        }
    }

    function tick(ts) {
        if (!state) return;
        if (!state.lastTs) state.lastTs = ts;
        var dt = Math.min(0.22, (ts - state.lastTs) / 1000);
        state.lastTs = ts;
        var now = performance.now();

        if (now < state.pauseUntil) {
            state.rafId = global.requestAnimationFrame(tick);
            return;
        }

        state.burstPhase += dt * (0.7 + Math.random() * 0.5);
        state.burstMul = 0.72 + 0.38 * (Math.sin(state.burstPhase) * 0.5 + 0.5);

        if (now > state.nextCpmShiftAt) {
            state.nextCpmShiftAt = now + 2000 + Math.random() * 2800;
            state.targetCpm += (Math.random() - 0.5) * 28;
            var capHi = state.personality.fast ? 198 : 168;
            var capLo = state.personality.fast ? 48 : 38;
            state.targetCpm = clamp(state.targetCpm, capLo, capHi);
        }

        if (Math.random() < dt * 0.22) {
            state.pauseUntil = now + 160 + Math.random() * 700;
        }

        var noise = 0.86 + Math.random() * 0.28;
        var cps = (state.targetCpm / 60) * state.burstMul * noise * state.personality.jitterMul;
        state.acc += cps * dt;

        while (state.acc >= 1 && state.botChars < state.textLen) {
            state.acc -= 1;
            if (Math.random() < state.typoRate) {
                state.botErrors += 1;
                if (state.onErrors) state.onErrors(state.botErrors);
                pushMessage(pickLine(state.bundle, 'botTypo', state.lastLine), Math.random() < 0.45);
            } else {
                state.botChars += 1;
            }
        }

        var pct = state.botChars >= state.textLen ? 100 : Math.floor((state.botChars / state.textLen) * 100);
        if (pct !== state.lastPct) {
            state.lastPct = pct;
            if (state.onProgress) state.onProgress(pct, state.botErrors);
        }

        var ratio = state.botChars / state.textLen;
        if (!state.m25 && ratio >= 0.25) {
            state.m25 = true;
            pushMessage(pickLine(state.bundle, 'mid', state.lastLine), false);
        }
        if (!state.m55 && ratio >= 0.55) {
            state.m55 = true;
            pushMessage(pickLine(state.bundle, 'mid', state.lastLine), Math.random() < 0.35);
        }
        if (!state.m88 && ratio >= 0.88) {
            state.m88 = true;
            pushMessage(pickLine(state.bundle, 'sprint', state.lastLine), true);
        }

        if (now > state.nextIdleAt) {
            state.nextIdleAt = now + 14000 + Math.random() * 22000;
            if (Math.random() < 0.55) pushMessage(pickLine(state.bundle, 'idle', state.lastLine), false);
        }

        if (state.botChars >= state.textLen) {
            stop();
            if (state.onBotWin) state.onBotWin();
            return;
        }

        state.rafId = global.requestAnimationFrame(tick);
    }

    function start(config) {
        stop();
        var text = config.text || '';
        var textLang = config.textLang || 'ru';
        var textLen = text.length;
        if (textLen < 1) return;

        var personality = {
            fast: Math.random() < 0.42,
            jitterMul: 0.92 + Math.random() * 0.2
        };
        var base = personality.fast ? (78 + Math.random() * 62) : (52 + Math.random() * 48);
        if (textLen < 350) base += 8 + Math.random() * 14;
        if (textLen > 1200) base -= 6 + Math.random() * 10;

        state = {
            textLen: textLen,
            textLang: textLang,
            bundle: bundleFor(textLang),
            botChars: 0,
            botErrors: 0,
            acc: Math.random() * 0.4,
            targetCpm: base,
            burstPhase: Math.random() * 6,
            burstMul: 1,
            pauseUntil: 0,
            nextCpmShiftAt: performance.now() + 1500,
            typoRate: 0.006 + Math.random() * 0.012,
            personality: personality,
            ttsEnabled: !!config.ttsEnabled,
            onMessage: config.onMessage,
            onProgress: config.onProgress,
            onErrors: config.onErrors,
            onBotWin: config.onBotWin,
            lastTs: 0,
            rafId: null,
            lastPct: -1,
            lastLine: '',
            lastReactiveAt: 0,
            lastTtsAt: 0,
            nextIdleAt: performance.now() + 8000 + Math.random() * 10000,
            m25: false,
            m55: false,
            m88: false
        };

        pushMessage(pickLine(state.bundle, 'start', ''), true);
        state.rafId = global.requestAnimationFrame(tick);
    }

    function notifyPlayer(charsTyped) {
        if (!state) return;
        maybeReactive(charsTyped || 0, state.textLen);
    }

    function getTtsStored() {
        try {
            return global.localStorage.getItem(STORAGE_TTS) === '1';
        } catch (e) {
            return false;
        }
    }

    function setTtsStored(on) {
        try {
            global.localStorage.setItem(STORAGE_TTS, on ? '1' : '0');
        } catch (e2) {}
    }

    function lineForMatchEnd(botWon, lang) {
        var b = bundleFor(lang);
        return pickLine(b, botWon ? 'botWin' : 'playerWin', '');
    }

    global.botBattleModule = {
        start: start,
        stop: stop,
        notifyPlayer: notifyPlayer,
        pickBotName: pickBotName,
        getTtsStored: getTtsStored,
        setTtsStored: setTtsStored,
        lineForMatchEnd: lineForMatchEnd,
        speakLine: function (text, lang) {
            synthSpeak(text, lang);
        }
    };
})(typeof window !== 'undefined' ? window : globalThis);
