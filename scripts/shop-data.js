/**
 * Shop Data - платные уроки для магазина
 */

const SHOP_LESSONS = {
    movies: {
        category: "movies",
        name_ru: "Фильмы",
        name_en: "Movies",
        name_ua: "Фільми",
        lessons: [
            {
                id: "movie_1",
                name: "Гарри Поттер - цитаты",
                description: "Знаменитые цитаты из фильмов о мальчике-волшебнике",
                layout: "ru",
                text: "Счастье можно найти даже в самые тёмные времена, если не забывать обращаться к свету. Не стоит зацикливаться на мечтах и забывать жить. Важно не то, что мы имеем, а то, кем мы становимся. Любовь оставляет след. Не такой, как шрам, который остаётся навсегда. Видимый след. Любовь оставляет свой след.",
                difficulty: "medium",
                price: 50,
                preview: "Счастье можно найти даже в самые тёмные времена..."
            },
            {
                id: "movie_2",
                name: "Властелин колец - мудрость",
                description: "Мудрые слова из эпической саги",
                layout: "ru",
                text: "Не всё золото, что блестит, не все странствующие потеряны. Старое умирает, новое рождается. Даже самая маленькая тварь может изменить ход будущего. Нельзя просто так взять и войти в Мордор. Дружба и верность важнее любых сокровищ.",
                difficulty: "medium",
                price: 50,
                preview: "Не всё золото, что блестит..."
            },
            {
                id: "movie_3",
                name: "Звёздные войны - легенды",
                description: "Цитаты из далёкой галактики",
                layout: "ru",
                text: "Сила будет с тобой, всегда. Страх путь к тёмной стороне. Страх ведёт к гневу, гнев ведёт к ненависти, ненависть ведёт к страданиям. Не пытайся, делай или не делай. Нет никаких попыток. Ты должен почувствовать Силу вокруг себя.",
                difficulty: "medium",
                price: 50,
                preview: "Сила будет с тобой, всегда..."
            },
            {
                id: "movie_4",
                name: "Матрица - философия",
                description: "Глубокие мысли из киберпанк мира",
                layout: "ru",
                text: "Не существует ложки. Ты должен понять, что ложки нет. Тогда ты увидишь, что гнётся не ложка, а ты сам. Знаешь, в чём разница между знанием и верой? Знание это морковный пирог, а вера это торт. Выбор уже сделан, осталось только понять его.",
                difficulty: "hard",
                price: 75,
                preview: "Не существует ложки..."
            },
            {
                id: "movie_5",
                name: "Форрест Гамп - жизнь",
                description: "Простая мудрость простого человека",
                layout: "ru",
                text: "Жизнь как коробка шоколадных конфет, никогда не знаешь, что тебе попадётся. Глупость это делать одно и то же снова и снова, ожидая другого результата. Мама всегда говорила, что жизнь как коробка шоколадных конфет. Ты никогда не знаешь, что получишь.",
                difficulty: "medium",
                price: 50,
                preview: "Жизнь как коробка шоколадных конфет..."
            }
        ]
    },
    anime: {
        category: "anime",
        name_ru: "Аниме",
        name_en: "Anime",
        name_ua: "Аніме",
        lessons: [
            {
                id: "anime_1",
                name: "Наруто - путь ниндзя",
                description: "Цитаты о силе воли и дружбе",
                layout: "ru",
                text: "Я не сбегу и не буду прятаться. Я никогда не откажусь от своих слов, это мой путь ниндзя. Тот, кто нарушает правила и предписания, мусор. Но тот, кто бросает своих друзей, хуже мусора. Сила приходит не от физических способностей, а от неукротимой воли.",
                difficulty: "medium",
                price: 50,
                preview: "Я не сбегу и не буду прятаться..."
            },
            {
                id: "anime_2",
                name: "Атака титанов - свобода",
                description: "Философия свободы и борьбы",
                layout: "ru",
                text: "Мы рождены свободными. Все люди рождаются свободными. Свобода это право каждого человека. Если кто-то пытается отнять твою свободу, борись. Борись до конца. Потому что в этом мире нет ничего важнее свободы.",
                difficulty: "hard",
                price: 75,
                preview: "Мы рождены свободными..."
            },
            {
                id: "anime_3",
                name: "Ван Пис - мечты",
                description: "О мечтах и приключениях",
                layout: "ru",
                text: "Мечты никогда не умирают. Пока есть мечта, есть надежда. Я стану королём пиратов. Это моя мечта, и я никогда не откажусь от неё. Друзья это те, кто поддерживает твои мечты. Настоящий друг никогда не скажет, что твоя мечта невозможна.",
                difficulty: "medium",
                price: 50,
                preview: "Мечты никогда не умирают..."
            },
            {
                id: "anime_4",
                name: "Драгон Болл - сила",
                description: "О тренировках и силе",
                layout: "ru",
                text: "Сила приходит через тренировки. Чем больше ты тренируешься, тем сильнее становишься. Нет предела человеческим возможностям. Если есть воля, есть и способ. Никогда не сдавайся, продолжай тренироваться, и однажды ты достигнешь своей цели.",
                difficulty: "medium",
                price: 50,
                preview: "Сила приходит через тренировки..."
            },
            {
                id: "anime_5",
                name: "Токийский гуль - выбор",
                description: "О выборе и морали",
                layout: "ru",
                text: "Иногда правильный выбор это самый трудный. Но это не значит, что его не нужно делать. Каждый человек делает свой выбор. И каждый несёт ответственность за свой выбор. Нет правильных или неправильных решений, есть только последствия.",
                difficulty: "hard",
                price: 75,
                preview: "Иногда правильный выбор..."
            }
        ]
    },
    books: {
        category: "books",
        name_ru: "Книги",
        name_en: "Books",
        name_ua: "Книги",
        lessons: [
            {
                id: "book_1",
                name: "Мастер и Маргарита",
                description: "Цитаты из классического романа",
                layout: "ru",
                text: "Человек смертен, но это было бы ещё полбеды. Плохо то, что он иногда внезапно смертен, вот в чём фокус. Никогда и ничего не просите. Никогда и ничего, и в особенности у тех, кто сильнее вас. Сами предложат и сами всё дадут.",
                difficulty: "hard",
                price: 75,
                preview: "Человек смертен, но это было бы ещё полбеды..."
            },
            {
                id: "book_2",
                name: "1984 - Оруэлл",
                description: "Антиутопия о будущем",
                layout: "ru",
                text: "Свобода это возможность сказать, что два плюс два равно четырём. Если это допущено, всё остальное последует. Война это мир, свобода это рабство, незнание это сила. Кто управляет прошлым, управляет будущим. Кто управляет настоящим, управляет прошлым.",
                difficulty: "hard",
                price: 75,
                preview: "Свобода это возможность сказать..."
            },
            {
                id: "book_3",
                name: "Алиса в стране чудес",
                description: "Философские цитаты из сказки",
                layout: "ru",
                text: "Всё чудесатее и чудесатее. Иногда я верю в целых шесть невозможных вещей до завтрака. Мы все здесь сумасшедшие. Я сумасшедший, ты сумасшедший. Нужно быть сумасшедшим, чтобы понять этот мир. Но если ты не сумасшедший, значит ты не понимаешь.",
                difficulty: "medium",
                price: 50,
                preview: "Всё чудесатее и чудесатее..."
            }
        ]
    },
    romance: {
        category: "romance",
        name_ru: "Романтика",
        name_en: "Romance",
        name_ua: "Романтика",
        lessons: [
            {
                id: "romance_1",
                name: "Любовные цитаты",
                description: "Романтические высказывания",
                layout: "ru",
                text: "Любовь это не то, что ты чувствуешь, это то, что ты делаешь. Любить значит заботиться, поддерживать, понимать. Настоящая любовь не требует доказательств, она просто есть. Когда ты любишь кого-то, ты принимаешь его таким, какой он есть, со всеми недостатками и достоинствами.",
                difficulty: "medium",
                price: 50,
                preview: "Любовь это не то, что ты чувствуешь..."
            },
            {
                id: "romance_2",
                name: "О чувствах",
                description: "Размышления о любви",
                layout: "ru",
                text: "Сердце имеет свои причины, которых разум не знает. Любовь это самое сильное чувство, которое может испытать человек. Оно делает нас сильнее и слабее одновременно. Когда ты влюблён, мир становится ярче, цвета становятся насыщеннее, звуки становятся мелодичнее.",
                difficulty: "medium",
                price: 50,
                preview: "Сердце имеет свои причины..."
            },
            {
                id: "romance_3",
                name: "О отношениях",
                description: "Мудрость о партнёрстве",
                layout: "ru",
                text: "Настоящие отношения строятся на доверии, уважении и взаимопонимании. Важно не только любить, но и уметь прощать, поддерживать, быть рядом в трудную минуту. Любовь это не только романтика и страсть, это ежедневная работа над отношениями, забота друг о друге.",
                difficulty: "hard",
                price: 75,
                preview: "Настоящие отношения строятся..."
            }
        ]
    },
    games: {
        category: "games",
        name_ru: "Игры",
        name_en: "Games",
        name_ua: "Ігри",
        lessons: [
            {
                id: "game_1",
                name: "The Witcher - цитаты",
                description: "Мудрость ведьмака",
                layout: "ru",
                text: "Зло есть зло. Меньшее, большее, среднее, всё равно. Если я должен выбирать между одним злом и другим, я предпочту не выбирать вообще. Ведьмак не выбирает между злом и злом, он выбирает между злом и большим злом. Но иногда выбор делает сам.",
                difficulty: "hard",
                price: 75,
                preview: "Зло есть зло..."
            },
            {
                id: "game_2",
                name: "Skyrim - драконы",
                description: "Легенды о драконах",
                layout: "ru",
                text: "Довакин, драконорождённый. Ты тот, кто может поглощать душу дракона. Твоя судьба предопределена. Ты должен остановить Алдуина, пожирателя мира. Драконы возвращаются, и только ты можешь их остановить. Используй свой голос, используй свою силу.",
                difficulty: "hard",
                price: 75,
                preview: "Довакин, драконорождённый..."
            },
            {
                id: "game_3",
                name: "Minecraft - творчество",
                description: "О строительстве и творчестве",
                layout: "ru",
                text: "В этом мире ты можешь построить всё что захочешь. Единственный предел это твоё воображение. Строй замки, создавай механизмы, исследуй пещеры, сражайся с монстрами. Каждый блок это возможность, каждый день это новое приключение.",
                difficulty: "medium",
                price: 50,
                preview: "В этом мире ты можешь построить всё..."
            }
        ]
    },
    quotes: {
        category: "quotes",
        name_ru: "Цитаты",
        name_en: "Quotes",
        name_ua: "Цитати",
        lessons: [
            {
                id: "quote_1",
                name: "Мотивационные цитаты",
                description: "Вдохновляющие слова",
                layout: "ru",
                text: "Успех это способность идти от неудачи к неудаче, не теряя энтузиазма. Единственный способ делать великую работу это любить то, что ты делаешь. Не бойся совершенства, тебе его всё равно не достичь. Но стремись к нему, и ты станешь лучше.",
                difficulty: "medium",
                price: 50,
                preview: "Успех это способность идти..."
            },
            {
                id: "quote_2",
                name: "Философские мысли",
                description: "Глубокие размышления",
                layout: "ru",
                text: "Жизнь это то, что происходит с тобой, пока ты строишь планы. Важно не то, что с тобой происходит, а то, как ты на это реагируешь. Счастье не в том, чтобы иметь всё, а в том, чтобы ценить то, что имеешь. Мудрость приходит с опытом, а опыт приходит с ошибками.",
                difficulty: "hard",
                price: 75,
                preview: "Жизнь это то, что происходит..."
            }
        ]
    },
    movies_en: {
        category: "movies",
        name_ru: "Фильмы",
        name_en: "Movies",
        name_ua: "Фільми",
        lessons: [
            {
                id: "movie_en_1",
                name: "Harry Potter - Quotes",
                description: "Famous quotes from the wizard boy movies",
                layout: "en",
                text: "Happiness can be found even in the darkest of times if one only remembers to turn on the light. It does not do to dwell on dreams and forget to live. It is our choices that show what we truly are far more than our abilities. Love leaves a mark. Not such as a scar that remains forever. A visible mark. Love leaves its mark.",
                difficulty: "medium",
                price: 50,
                preview: "Happiness can be found even in the darkest of times..."
            },
            {
                id: "movie_en_2",
                name: "The Lord of the Rings - Wisdom",
                description: "Wise words from the epic saga",
                layout: "en",
                text: "All that is gold does not glitter not all those who wander are lost. The old that is strong does not wither. Even the smallest person can change the course of the future. You cannot simply walk into Mordor. Friendship and loyalty are more important than any treasure.",
                difficulty: "medium",
                price: 50,
                preview: "All that is gold does not glitter..."
            },
            {
                id: "movie_en_3",
                name: "Star Wars - Legends",
                description: "Quotes from a galaxy far far away",
                layout: "en",
                text: "May the Force be with you always. Fear is the path to the dark side. Fear leads to anger anger leads to hate hate leads to suffering. Do or do not there is no try. You must feel the Force around you.",
                difficulty: "medium",
                price: 50,
                preview: "May the Force be with you always..."
            },
            {
                id: "movie_en_4",
                name: "The Matrix - Philosophy",
                description: "Deep thoughts from cyberpunk world",
                layout: "en",
                text: "There is no spoon. You must understand there is no spoon. Then you will see that it is not the spoon that bends it is only yourself. Do you know the difference between knowledge and belief? Knowledge is a carrot pie and belief is a cake. The choice has already been made now you just need to understand it.",
                difficulty: "hard",
                price: 75,
                preview: "There is no spoon..."
            },
            {
                id: "movie_en_5",
                name: "Forrest Gump - Life",
                description: "Simple wisdom of a simple man",
                layout: "en",
                text: "Life is like a box of chocolates you never know what you are going to get. Stupidity is doing the same thing over and over again and expecting different results. Mama always said life is like a box of chocolates. You never know what you are going to get.",
                difficulty: "medium",
                price: 50,
                preview: "Life is like a box of chocolates..."
            }
        ]
    },
    anime_en: {
        category: "anime",
        name_ru: "Аниме",
        name_en: "Anime",
        name_ua: "Аніме",
        lessons: [
            {
                id: "anime_en_1",
                name: "Naruto - Ninja Way",
                description: "Quotes about willpower and friendship",
                layout: "en",
                text: "I will not run away and I will not go back on my word. That is my ninja way. Those who break the rules and regulations are scum. But those who abandon their friends are worse than scum. Power comes not from physical abilities but from an indomitable will.",
                difficulty: "medium",
                price: 50,
                preview: "I will not run away and I will not go back..."
            },
            {
                id: "anime_en_2",
                name: "Attack on Titan - Freedom",
                description: "Philosophy of freedom and struggle",
                layout: "en",
                text: "We are born free. All people are born free. Freedom is the right of every person. If someone tries to take your freedom fight. Fight to the end. Because in this world there is nothing more important than freedom.",
                difficulty: "hard",
                price: 75,
                preview: "We are born free..."
            },
            {
                id: "anime_en_3",
                name: "One Piece - Dreams",
                description: "About dreams and adventures",
                layout: "en",
                text: "Dreams never die. As long as there is a dream there is hope. I will become the king of pirates. This is my dream and I will never give up on it. Friends are those who support your dreams. A true friend will never say that your dream is impossible.",
                difficulty: "medium",
                price: 50,
                preview: "Dreams never die..."
            }
        ]
    },
    quotes_en: {
        category: "quotes",
        name_ru: "Цитаты",
        name_en: "Quotes",
        name_ua: "Цитати",
        lessons: [
            {
                id: "quote_en_1",
                name: "Motivational Quotes",
                description: "Inspiring words",
                layout: "en",
                text: "Success is the ability to go from one failure to another with no loss of enthusiasm. The only way to do great work is to love what you do. Do not be afraid of perfection you will never reach it. But strive for it and you will become better.",
                difficulty: "medium",
                price: 50,
                preview: "Success is the ability to go from one failure..."
            },
            {
                id: "quote_en_2",
                name: "Philosophical Thoughts",
                description: "Deep reflections",
                layout: "en",
                text: "Life is what happens to you while you are busy making other plans. It is not what happens to you but how you react to it that matters. Happiness is not about having everything but about appreciating what you have. Wisdom comes with experience and experience comes with mistakes.",
                difficulty: "hard",
                price: 75,
                preview: "Life is what happens to you while you are busy..."
            },
            {
                id: "quote_en_3",
                name: "Beginner Quotes",
                description: "Simple inspiring quotes",
                layout: "en",
                text: "the journey of a thousand miles begins with a single step every expert was once a beginner practice makes perfect believe you can and you are halfway there the only way to do great work is to love what you do",
                difficulty: "easy",
                price: 30,
                preview: "the journey of a thousand miles begins..."
            }
        ]
    },
    movies_ua: {
        category: "movies",
        name_ru: "Фильмы",
        name_en: "Movies",
        name_ua: "Фільми",
        lessons: [
            {
                id: "movie_ua_1",
                name: "Гаррі Поттер - цитати",
                description: "Відомі цитати з фільмів про хлопчика-чарівника",
                layout: "ua",
                text: "Щастя можна знайти навіть у найтемніші часи якщо не забувати звертатися до світла. Не варто зациклюватися на мріях і забувати жити. Важливо не те що ми маємо а те ким ми стаємо. Любов залишає слід. Не такий як шрам який залишається назавжди. Видимий слід. Любов залишає свій слід.",
                difficulty: "medium",
                price: 50,
                preview: "Щастя можна знайти навіть у найтемніші часи..."
            },
            {
                id: "movie_ua_2",
                name: "Володар перснів - мудрість",
                description: "Мудрі слова з епічної саги",
                layout: "ua",
                text: "Не все золото що блищить не всі мандрівники загублені. Старе вмирає нове народжується. Навіть найменша істота може змінити хід майбутнього. Не можна просто так взяти і увійти в Мордор. Дружба і вірність важливіші за будь-які скарби.",
                difficulty: "medium",
                price: 50,
                preview: "Не все золото що блищить..."
            },
            {
                id: "movie_ua_3",
                name: "Зоряні війни - легенди",
                description: "Цитати з далекої галактики",
                layout: "ua",
                text: "Сила буде з тобою завжди. Страх шлях до темної сторони. Страх веде до гніву гнів веде до ненависті ненависть веде до страждань. Не намагайся роби або не роби. Немає жодних спроб. Ти повинен відчути Силу навколо себе.",
                difficulty: "medium",
                price: 50,
                preview: "Сила буде з тобою завжди..."
            },
            {
                id: "movie_ua_4",
                name: "Матриця - філософія",
                description: "Глибокі думки з кіберпанк світу",
                layout: "ua",
                text: "Не існує ложки. Ти повинен зрозуміти що ложки немає. Тоді ти побачиш що гнеться не ложка а ти сам. Знаєш у чому різниця між знанням і вірою? Знання це морквяний пиріг а віра це торт. Вибір вже зроблено залишилося тільки зрозуміти його.",
                difficulty: "hard",
                price: 75,
                preview: "Не існує ложки..."
            }
        ]
    },
    anime_ua: {
        category: "anime",
        name_ru: "Аниме",
        name_en: "Anime",
        name_ua: "Аніме",
        lessons: [
            {
                id: "anime_ua_1",
                name: "Наруто - шлях ніндзя",
                description: "Цитати про силу волі та дружбу",
                layout: "ua",
                text: "Я не втечу і не буду ховатися. Я ніколи не відмовлюся від своїх слів це мій шлях ніндзя. Той хто порушує правила та передписання сміття. Але той хто кидає своїх друзів гірше за сміття. Сила приходить не від фізичних здібностей а від нездоланної волі.",
                difficulty: "medium",
                price: 50,
                preview: "Я не втечу і не буду ховатися..."
            },
            {
                id: "anime_ua_2",
                name: "Атака титанів - свобода",
                description: "Філософія свободи та боротьби",
                layout: "ua",
                text: "Ми народжені вільними. Всі люди народжені вільними. Свобода це право кожної людини. Якщо хтось намагається відібрати твою свободу борися. Борися до кінця. Тому що в цьому світі немає нічого важливішого за свободу.",
                difficulty: "hard",
                price: 75,
                preview: "Ми народжені вільними..."
            },
            {
                id: "anime_ua_3",
                name: "Ван Піс - мрії",
                description: "Про мрії та пригоди",
                layout: "ua",
                text: "Мрії ніколи не вмирають. Поки є мрія є надія. Я стану королем піратів. Це моя мрія і я ніколи не відмовлюся від неї. Друзі це ті хто підтримує твої мрії. Справжній друг ніколи не скаже що твоя мрія неможлива.",
                difficulty: "medium",
                price: 50,
                preview: "Мрії ніколи не вмирають..."
            }
        ]
    },
    quotes_ua: {
        category: "quotes",
        name_ru: "Цитаты",
        name_en: "Quotes",
        name_ua: "Цитати",
        lessons: [
            {
                id: "quote_ua_1",
                name: "Мотивуючі цитати",
                description: "Надихаючі слова",
                layout: "ua",
                text: "Успіх це здатність йти від невдачі до невдачі не втрачаючи ентузіазму. Єдиний спосіб робити велику роботу це любити те що ти робиш. Не бійся досконалості тобі її все одно не досягти. Але прагни до неї і ти станеш краще.",
                difficulty: "medium",
                price: 50,
                preview: "Успіх це здатність йти від невдачі..."
            },
            {
                id: "quote_ua_2",
                name: "Філософські думки",
                description: "Глибокі роздуми",
                layout: "ua",
                text: "Життя це те що відбувається з тобою поки ти будуєш плани. Важливо не те що з тобою відбувається а те як ти на це реагуєш. Щастя не в тому щоб мати все а в тому щоб цінувати те що маєш. Мудрість приходить з досвідом а досвід приходить з помилками.",
                difficulty: "hard",
                price: 75,
                preview: "Життя це те що відбувається з тобою..."
            },
            {
                id: "quote_ua_3",
                name: "Прості цитати",
                description: "Легкі надихаючі цитати",
                layout: "ua",
                text: "подорож у тисячу миль починається з одного кроку кожен експерт колись був початківцем практика робить досконалим віри що можеш і ти вже на півдорозі єдиний спосіб робити велику роботу це любити те що робиш",
                difficulty: "easy",
                price: 30,
                preview: "подорож у тисячу миль починається..."
            }
        ]
    }
};

// Get all lessons from shop
function getAllShopLessons() {
    const allLessons = [];
    Object.values(SHOP_LESSONS).forEach(category => {
        category.lessons.forEach(lesson => {
            allLessons.push({
                ...lesson,
                category: category.category,
                categoryName: category.name_ru
            });
        });
    });
    return allLessons;
}

// Get lesson by ID
function getLessonById(lessonId) {
    const allLessons = getAllShopLessons();
    return allLessons.find(lesson => lesson.id === lessonId);
}

// Get lessons by category
function getLessonsByCategory(category) {
    return SHOP_LESSONS[category]?.lessons || [];
}

// Export for global access
window.shopModule = {
    SHOP_LESSONS,
    getAllShopLessons,
    getLessonById,
    getLessonsByCategory
};

