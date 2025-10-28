/**
 * Lessons Data - встроенные данные уроков
 * Чтобы работало без сервера (file://)
 */

const LESSONS_DATA = {
    beginner: {
        level: "beginner",
        name_ru: "Начинающий",
        name_en: "Beginner",
        description_ru: "Основные позиции и базовые упражнения",
        description_en: "Basic positions and exercises",
        lessons: [
            {
                id: 1,
                name: "Домашний ряд - ФЫВА ОЛДЖ",
                description: "Изучение базовых позиций пальцев",
                layout: "ru",
                text: "фыва олдж фыва олдж фыва олдж фыва олдж фыва олдж фыва олдж фыва олдж фыва олдж",
                difficulty: "easy"
            },
            {
                id: 2,
                name: "Домашний ряд - расширенный",
                description: "Добавляем больше букв",
                layout: "ru",
                text: "фыва олдж фывап олдж фыва олдж асдф фыва олдж фывапролдж фыва олдж асдфг",
                difficulty: "easy"
            },
            {
                id: 3,
                name: "Верхний ряд - основы",
                description: "Учимся набирать верхний ряд",
                layout: "ru",
                text: "йцукен гшщз йцукен гшщз йцукен гшщз фыва олдж йцукен гшщз фыва олдж йцукен",
                difficulty: "easy"
            },
            {
                id: 4,
                name: "Нижний ряд - основы",
                description: "Изучаем нижний ряд клавиатуры",
                layout: "ru",
                text: "ячсмить бюячсм ячсмить бю фыва олдж ячсм фыва олдж ячсмить бюфыва",
                difficulty: "easy"
            },
            {
                id: 5,
                name: "Слова о природе",
                description: "Красота окружающего мира",
                layout: "ru",
                text: "солнце луна звёзды небо облака дождь снег ветер море река озеро гора лес цветы трава дерево",
                difficulty: "easy"
            },
            {
                id: 6,
                name: "Добрые слова",
                description: "Позитивные эмоции",
                layout: "ru",
                text: "Улыбка дарит радость. Доброта делает мир лучше. Дружба согревает сердце. Любовь побеждает всё. Надежда ведёт вперёд.",
                difficulty: "easy"
            },
            {
                id: 7,
                name: "Home Row - ASDF JKL;",
                description: "Basic finger positions in English",
                layout: "en",
                text: "asdf jkl asdf jkl asdf jkl asdf jkl asdf jkl asdf jkl asdf jkl asdf jkl asdf",
                difficulty: "easy"
            },
            {
                id: 8,
                name: "Home Row Extended",
                description: "More letters from home row",
                layout: "en",
                text: "asdf jkl asdfg jkl asdf jkl asdfg hjkl asdf jkl asdfgh jkl asdf jkl asdfg",
                difficulty: "easy"
            },
            {
                id: 9,
                name: "Nature Words",
                description: "Beauty around us",
                layout: "en",
                text: "sun moon stars sky cloud rain snow wind sea lake river mountain forest flower grass tree bird",
                difficulty: "easy"
            },
            {
                id: 10,
                name: "Kind Words",
                description: "Positive emotions",
                layout: "en",
                text: "A smile brings joy. Kindness makes life better. Friends warm the heart. Love wins all. Hope leads forward. Dreams come true.",
                difficulty: "easy"
            }
        ]
    },
    medium: {
        level: "medium",
        name_ru: "Средний",
        name_en: "Medium",
        description_ru: "Усложнённые упражнения и более длинные тексты",
        description_en: "Advanced exercises and longer texts",
        lessons: [
            {
                id: 1,
                name: "Все буквы русского алфавита",
                description: "Практика всех букв",
                layout: "ru",
                text: "Съешь же ещё этих мягких французских булок, да выпей чаю. Широкая электрификация южных губерний даст мощный толчок подъёму сельского хозяйства.",
                difficulty: "medium"
            },
            {
                id: 2,
                name: "Цифры и знаки препинания",
                description: "Добавляем цифры и символы",
                layout: "ru",
                text: "1234567890 точка, запятая; двоеточие: кавычки \"текст\" скобки (пример) восклицательный! вопросительный?",
                difficulty: "medium"
            },
            {
                id: 3,
                name: "Удивительный мир дельфинов",
                description: "Захватывающая история об умнейших существах океана",
                layout: "ru",
                text: "Дельфины спят с открытым одним глазом! Это не шутка природы, а гениальное эволюционное решение. Половина их мозга бодрствует, контролируя дыхание, пока другая половина отдыхает. Через несколько часов полушария меняются местами. Представьте, что вы могли бы делать домашнее задание одной половиной мозга, а другой при этом спать! Дельфины общаются с помощью уникальных свистов, которые служат как имена. Каждый дельфин имеет свой собственный свист-подпись, который он получает в детстве и сохраняет всю жизнь. Они узнают друг друга по этим звукам даже после многих лет разлуки, словно мы узнаём голоса старых друзей по телефону. Но это ещё не всё! Дельфины помогают раненым товарищам, поддерживая их у поверхности воды, чтобы те могли дышать. Известны случаи, когда дельфины спасали людей от акул, образуя защитный круг вокруг пловцов. Они обладают самосознанием и узнают себя в зеркале, что говорит о высоком уровне интеллекта. Дельфины используют инструменты, например, надевают на нос морские губки для защиты при поиске пищи на дне. Они обучают этому навыку своих детёнышей, передавая культуру из поколения в поколение. Дельфины играют не только для развлечения, но и для обучения охоте, социального взаимодействия и развития навыков. Молодые дельфины часами гоняются за водорослями, отрабатывая приёмы, которые пригодятся им во взрослой жизни. Их эхолокация настолько точна, что они могут определить размер, форму и даже материал объекта в мутной воде. Военные изучают эту способность для создания совершенных сонаров. Дельфины живут в сложных социальных группах, где действуют свои правила и традиции. Они заботятся друг о друге, образуют дружеские союзы и даже скорбят о потере близких. Учёные наблюдали, как дельфины носили тела умерших детёнышей несколько дней, не в силах отпустить их. Это поведение показывает глубину их эмоций. Дельфины могут развивать скорость до пятидесяти километров в час, выпрыгивая из воды на высоту до шести метров. Они делают это не только для красоты, но и для экономии энергии при быстром плавании. В воздухе сопротивление меньше, чем в воде. Удивительно, но дельфины также помогают рыбакам, загоняя косяки рыбы к берегу и получая свою долю улова. Это сотрудничество между человеком и диким животным длится уже сотни лет в некоторых регионах мира.",
                difficulty: "medium"
            },
            {
                id: 4,
                name: "Секрет долголетия",
                description: "Жизненно важная информация",
                layout: "ru",
                text: "Учёные выяснили, что люди из голубых зон живут дольше всех. Их секрет прост: натуральная еда, движение каждый день, крепкие семейные связи и позитивное отношение к жизни. Важно не количество лет, а качество каждого прожитого дня.",
                difficulty: "medium"
            },
            {
                id: 5,
                name: "All English Letters",
                description: "Practice all letters",
                layout: "en",
                text: "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!",
                difficulty: "medium"
            },
            {
                id: 6,
                name: "Numbers and Punctuation",
                description: "Adding numbers and symbols",
                layout: "en",
                text: "1234567890 period. comma, semicolon; colon: quotes \"text\" brackets (example) exclamation! question?",
                difficulty: "medium"
            },
            {
                id: 7,
                name: "The Amazing Octopus",
                description: "Journey into the world of the smartest invertebrate",
                layout: "en",
                text: "Octopuses have three hearts and blue blood! This is not science fiction but incredible reality. Two hearts pump blood to the gills, while the third pumps it to the rest of the body. When an octopus swims, the heart that delivers blood to the body stops beating, which is why these creatures prefer to crawl rather than swim as it tires them less. Their blood is blue because it contains copper-based hemocyanin instead of iron-based hemoglobin like ours. This makes their blood more efficient at transporting oxygen in cold, low-oxygen environments. Octopuses can change color in milliseconds to hide from predators, communicate with other octopuses, or express emotions. They have special cells called chromatophores that contain different colored pigments. By contracting or expanding these cells, they create patterns and colors. Underneath the chromatophores are iridophores and leucophores that reflect light to create shimmering effects. This ability is so advanced that octopuses can match their surroundings perfectly, becoming virtually invisible. Each arm has its own brain and can taste what it touches. Two-thirds of an octopus neurons are in its arms, not its central brain. This means an arm can solve problems independently, like opening a shellfish, while the central brain is busy with something else. The arms can even continue to react and move for a short time after being severed. Octopuses are master escape artists. They can squeeze through any opening larger than their beak, the only hard part of their body. There are countless stories of octopuses escaping from aquariums, traveling across floors, and even breaking into other tanks to hunt. Some have been known to unscrew jar lids from the inside to escape or to get food. They learn by observation and can solve complex puzzles. Scientists have watched octopuses learn to navigate mazes and remember the solutions. They can also learn by watching other octopuses, a rare ability in the animal kingdom. Octopuses use tools, which was once thought to be unique to mammals and birds. They collect coconut shells and carry them around for protection, assembling them into armor when threatened. This behavior shows planning for future needs. Despite all this intelligence, octopuses live very short lives, usually only one to two years. They die shortly after reproducing, with females often starving to death while protecting their eggs. Imagine what they could accomplish with longer lifespans!",
                difficulty: "medium"
            },
            {
                id: 8,
                name: "The Power of Habits",
                description: "Life-changing advice",
                layout: "en",
                text: "Small habits create remarkable results over time. Reading ten pages daily equals thirty books per year. Exercising for twenty minutes builds strength gradually. Saving five dollars a day becomes nearly two thousand annually. Your daily choices shape your future self.",
                difficulty: "medium"
            }
        ]
    },
    advanced: {
        level: "advanced",
        name_ru: "Продвинутый",
        name_en: "Advanced",
        description_ru: "Сложные тексты и высокая скорость",
        description_en: "Complex texts and high speed",
        lessons: [
            {
                id: 1,
                name: "Код: JavaScript",
                description: "Набор кода на JavaScript",
                layout: "en",
                text: "function calculateSum(arr) { return arr.reduce((acc, curr) => acc + curr, 0); } const result = calculateSum([1, 2, 3, 4, 5]); console.log(result);",
                difficulty: "hard"
            },
            {
                id: 2,
                name: "Код: Python",
                description: "Набор кода на Python",
                layout: "en",
                text: "def calculate_sum(arr): return sum(arr) result = calculate_sum([1, 2, 3, 4, 5]) print(result) for i in range(10): print(i)",
                difficulty: "hard"
            },
            {
                id: 3,
                name: "JSON структура",
                description: "Набор JSON данных",
                layout: "en",
                text: "{name: John, age: 30, city: New York, hobbies: [reading, swimming], active: true}",
                difficulty: "hard"
            },
            {
                id: 4,
                name: "Специальные символы",
                description: "Практика спецсимволов",
                layout: "en",
                text: "@#$%^&*()_+-=[]{}|\\:;<>,.?/~` email@example.com https://website.com/path?param=value&other=123",
                difficulty: "hard"
            },
            {
                id: 5,
                name: "Тайны человеческого мозга",
                description: "Путешествие в самый загадочный орган",
                layout: "ru",
                text: "Ваш мозг потребляет двадцать процентов всей энергии тела, хотя весит всего два процента от общей массы. Это похоже на маленький суперкомпьютер, который требует огромного количества электричества для работы. Каждую секунду в нём происходит сто тысяч химических реакций, создавая миллиарды электрических импульсов. Нейроны передают сигналы со скоростью до четырёхсот километров в час, быстрее многих гоночных автомобилей. Но самое удивительное то, что мозг продолжает развиваться всю жизнь, создавая новые связи между клетками. Раньше учёные считали, что мозг перестаёт расти после детства, но современные исследования доказали обратное. Каждый раз, когда вы учите что-то новое, в вашем мозгу образуются новые нейронные связи. Это называется нейропластичностью, и это означает, что вы никогда не слишком стары для обучения. Ваш мозг состоит из восьмидесяти шести миллиардов нейронов, каждый из которых связан с тысячами других нейронов. Если бы мы попытались подсчитать все возможные комбинации связей, число было бы больше, чем атомов в известной вселенной. Мозг потребляет кислород и глюкозу в огромных количествах, поэтому когда вы думаете интенсивно, вы буквально сжигаете калории. Решение сложной математической задачи может сжечь столько же калорий, сколько короткая прогулка. Ваш мозг на семьдесят три процента состоит из воды, поэтому даже небольшое обезвоживание может повлиять на концентрацию, память и настроение. Выпейте стакан воды, и ваш мозг скажет спасибо. Интересно, что мозг не чувствует боли. Во время операций на мозге пациенты могут быть в сознании, помогая хирургам определить важные зоны. Головная боль возникает не из-за самого мозга, а из-за сосудов и оболочек вокруг него. Сон критически важен для мозга. Во время сна происходит очистка от токсинов, накопленных за день, и консолидация памяти. Именно поэтому после хорошего сна вы лучше запоминаете выученный вчера материал. Мозг работает эффективнее после семи-восьми часов сна, и это не прихоть, а биологическая необходимость. Эмоции тоже влияют на работу мозга. Стресс может буквально уменьшить размер гиппокампа, зоны отвечающей за память. А позитивные эмоции стимулируют выработку нейротрофических факторов, которые помогают нейронам расти и развиваться.",
                difficulty: "hard"
            },
            {
                id: 6,
                name: "Загадка Бермудского треугольника",
                description: "Мистические истории",
                layout: "ru",
                text: "В районе Бермудских островов бесследно исчезли сотни кораблей и самолётов. Учёные предлагают разные объяснения: магнитные аномалии, метановые пузыри из океанского дна, внезапные штормы. Но некоторые случаи до сих пор остаются загадкой, порождая множество теорий и легенд.",
                difficulty: "hard"
            },
            {
                id: 7,
                name: "Ancient Egypt Mysteries",
                description: "Historical discoveries",
                layout: "en",
                text: "The Great Pyramid was built with such precision that modern engineers struggle to replicate it. Ancient Egyptians performed complex brain surgery and created early forms of antibiotics. Cleopatra lived closer to our time than to the pyramid construction. Their knowledge of astronomy helped predict Nile floods with remarkable accuracy.",
                difficulty: "hard"
            },
            {
                id: 8,
                name: "The Psychology of Success",
                description: "Mind science insights",
                layout: "en",
                text: "Successful people share common traits beyond talent. They embrace failure as learning opportunities. Morning routines set productive momentum for entire days. Visualization techniques activate the same brain regions as actual practice. Surrounding yourself with ambitious people naturally elevates your own standards and achievements.",
                difficulty: "hard"
            }
        ]
    }
};

