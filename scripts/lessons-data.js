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
            },
            {
                id: 101,
                name: "Домашній ряд - ФІВА ОЛДЖ",
                description: "Базові позиції пальців",
                layout: "ua",
                text: "фіва олдж фіва олдж фіва олдж фіва олдж фіва олдж фіва олдж фіва олдж фіва олдж",
                difficulty: "easy"
            },
            {
                id: 102,
                name: "Прості слова",
                description: "Набираємо перші слова",
                layout: "ua",
                text: "дім кіт мама тато вода рука нога день ніч стіл стілець вікно двері лампа книга",
                difficulty: "easy"
            },
            {
                id: 103,
                name: "Добрі слова",
                description: "Позитивні емоції",
                layout: "ua",
                text: "Посмішка дарує радість. Доброта робить світ кращим. Дружба зігріває серце. Любов перемагає все. Надія веде вперед. Мрії збуваються.",
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
            },
            {
                id: 104,
                name: "Карпатські гори",
                description: "Природа України",
                layout: "ua",
                text: "Карпати вкриті густими лісами та альпійськими луками. Тут живуть рідкісні тварини: бурі ведмеді, рисі та благородні олені. Гірські потоки несуть кришталево чисту воду. Полонини вкриті барвистими квітами влітку. Взимку гори перетворюються на казкову країну снігу.",
                difficulty: "medium"
            },
            {
                id: 105,
                name: "Дніпро - водна артерія",
                description: "Річка що об'єднує",
                layout: "ua",
                text: "Дніпро третя за довжиною річка Європи після Волги та Дунаю. Вона протікає через центр України, з'єднуючи північ і південь країни. На берегах Дніпра розташовані найбільші міста: Київ, Дніпро, Запоріжжя, Херсон. Річка живила українські землі століттями, даруючи воду для землеробства та рибу для харчування.",
                difficulty: "medium"
            },
            {
                id: 106,
                name: "Українська вишиванка",
                description: "Традиції в орнаментах",
                layout: "ua",
                text: "Вишиванка це не просто одяг а справжня енциклопедія українського народу. Кожен орнамент має своє значення та розповідає історію. Геометричні візерунки символізують родючість землі та врожай. Рослинні мотиви втілюють зв'язок з природою. Червоний колір означає любов до життя, чорний символізує землю та мудрість предків.",
                difficulty: "medium"
            },
            {
                id: 107,
                name: "Українська кухня",
                description: "Смаки що з'єднують покоління",
                layout: "ua",
                text: "Український борщ це не просто страва а символ домашнього затишку та родинного тепла. Кожна господиня має свій секретний рецепт що передається з покоління в покоління. Вареники з вишнями, картоплею або сиром вміють готувати в кожній українській родині. Сало українці вважають делікатесом який цінується не менше за найвитонченіші закуски.",
                difficulty: "medium"
            },
            {
                id: 108,
                name: "Українські писанки",
                description: "Мистецтво на яйці",
                layout: "ua",
                text: "Писанка це унікальне українське мистецтво розпису яєць воском та барвниками що налічує тисячі років історії. Кожен символ на писанці має глибоке значення закладене предками. Сонце означає життя та енергію, зірки символізують долю, хрест захист від зла. Безкінечник вічність життя, дерево зв'язок поколінь.",
                difficulty: "medium"
            },
            {
                id: 109,
                name: "Хортиця острів свободи",
                description: "Колиска козацтва",
                layout: "ua",
                text: "Острів Хортиця на Дніпрі найбільший річковий острів Європи став колискою запорізького козацтва. Тут розташовувалися перші козацькі січі фортеці свободи серед дніпровських порогів. Природні умови острова ідеально підходили для оборони пороги захищали з півдня а густі ліси та болота ховали козацькі табори.",
                difficulty: "medium"
            },
            {
                id: 110,
                name: "Львів місто лева",
                description: "Культурна столиця",
                layout: "ua",
                text: "Львів заснований в тисяча двісті п'ятдесят шостому році князем Данилом Галицьким та названий на честь його сина Лева став перехрестям культур де зустрічалися Схід і Захід. Старе місто Львова внесене до списку Всесвітньої спадщини ЮНЕСКО зберігає атмосферу середньовічної Європи. Бруковані вулиці ведуть до площі Ринок серця міста оточеного кам'яницями різних епох.",
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
            },
            {
                id: 111,
                name: "Київська Русь",
                description: "Витоки державності",
                layout: "ua",
                text: "Київська Русь була могутньою середньовічною державою що існувала з дев'ятого по тринадцяте століття. Столиця Київ був одним з найбільших та найбагатших міст Європи того часу. Тут налічувалося понад чотириста церков та вісім ринків. Володимир Великий хрестив Русь у дев'ятсот вісімдесят вісьмому році, що відкрило шлях до європейської цивілізації. Ярослав Мудрий створив перший писемний звід законів Руську Правду.",
                difficulty: "hard"
            },
            {
                id: 112,
                name: "Козацька слава",
                description: "Захисники свободи",
                layout: "ua",
                text: "Запорізька Січ була унікальним явищем в історії Європи демократичною військовою республікою. Козаки обирали свого гетьмана на загальній раді де кожен мав право голосу. Вони захищали українські землі від набігів татар та турків, ризикуючи життям заради свободи народу. Козацька доблесть стала легендою. Богдан Хмельницький підняв повстання проти польського гніту та створив козацьку державу.",
                difficulty: "hard"
            },
            {
                id: 113,
                name: "Тарас Шевченко",
                description: "Великий Кобзар України",
                layout: "ua",
                text: "Тарас Григорович Шевченко народився в родині кріпаків тисяча вісімсот чотирнадцятого року. Дитинство в неволі загартувало його дух та наповнило серце жагою до свободи. Талант до малювання врятував його коли друзі викупили Тараса з кріпацтва. Він здобув освіту в Академії мистецтв у Санкт-Петербурзі де розквітнув його художній талант. Але справжню славу принесла йому поезія. Збірка Кобзар стала маніфестом українського національного відродження.",
                difficulty: "hard"
            },
            {
                id: 114,
                name: "Софія Київська",
                description: "Перлина архітектури",
                layout: "ua",
                text: "Софійський собор в Києві побудований в одинадцятому столітті за часів Ярослава Мудрого став символом могутності Київської Русі. Собор названий на честь храму Святої Софії в Константинополі підкреслюючи зв'язок з Візантією. Тринадцять куполів собору символізують Христа та дванадцять апостолів. Всередині зберігся унікальний комплекс мозаїк та фресок одинадцятого століття площею понад двісті шістдесят квадратних метрів.",
                difficulty: "hard"
            },
            {
                id: 115,
                name: "Бандура душа України",
                description: "Інструмент що співає",
                layout: "ua",
                text: "Бандура унікальний український струнний інструмент що поєднує риси лютні та гуслів налічує від тридцяти до шістдесяти струн. Кобзарі мандрівні співці грали на бандурі та передавали історичні думи про козацьку славу героїчні битви та народні страждання. Вони були живою пам'яттю народу зберігаючи в піснях те що не змогли записати літописи. Радянська влада боялася кобзарів як носіїв національної свідомості та піддавала їх репресіям.",
                difficulty: "hard"
            },
            {
                id: 116,
                name: "Голодомор народна трагедія",
                description: "Пам'ять що не згасне",
                layout: "ua",
                text: "Голодомор тисяча дев'ятсот тридцять другого тридцять третього років штучно організований радянською владою голод забрав життя мільйонів українців. Село позбавили зерна худоби насіння навіть городини. Люди помирали посеред родючих чорноземів на яких могла б годуватися вся Європа. Селянам забороняли виїжджати з голодуючих сіл щоб приховати масштаби трагедії від світу. НКВС конфісковувало останні крихти їжі засуджуючи цілі родини на смерть.",
                difficulty: "hard"
            },
            {
                id: 117,
                name: "Мова що оживає",
                description: "Відродження української",
                layout: "ua",
                text: "Українська мова витримала століття утисків заборон та русифікації але не зламалася. Емський указ тисяча вісімсот сімдесят шостого року заборонив друкувати книги українською мовою окрім художньої літератури. Радянська влада спочатку підтримувала українізацію а потім жорстоко придушила її репресуючи інтелігенцію. Українську витісняли зі шкіл університетів офіційного вжитку. Але мова жила в селах у піснях у серцях патріотів. З здобуттям незалежності почалося відродження української в усіх сферах життя.",
                difficulty: "hard"
            },
            {
                id: 118,
                name: "Майдан воля народу",
                description: "Революція гідності",
                layout: "ua",
                text: "Листопад дві тисячі тринадцятого року Київ вийшов на Майдан Незалежності протестуючи проти відмови влади підписати угоду про асоціацію з Європейським Союзом. Студенти та молодь першими стали в центрі міста вимагаючи європейського шляху для України. Жорстокий розгін мирного протесту силовиками розпалив полум'я революції. Сотні тисяч людей прийшли підтримати Майдан принісши з собою намети їжу дрова. Зимою люди стояли на морозі співали гімн та вірили в перемогу справедливості.",
                difficulty: "hard"
            },
            {
                id: 119,
                name: "Чорнобильська катастрофа",
                description: "Урок для людства",
                layout: "ua",
                text: "Двадцять шостого квітня тисяча дев'ятсот вісімдесят шостого року сталася найбільша техногенна катастрофа в історії. Вибух на четвертому енергоблоці Чорнобильської АЕС викинув у атмосферу величезну кількість радіоактивних речовин. Пожежники та ліквідатори героїчно боролися з вогнем, не знаючи про смертельну небезпеку радіації. Багато з них загинули від променевої хвороби ставши справжніми героями. Тридцять кілометрову зону довкола станції евакуювали, люди залишили свої домівки назавжди.",
                difficulty: "hard"
            },
            {
                id: 120,
                name: "Україна сьогодні",
                description: "Шлях до майбутнього",
                layout: "ua",
                text: "Україна молода незалежна держава що здобула свободу в тисяча дев'ятсот дев'яносто першому році після розпаду Радянського Союзу. Шлях до справжньої незалежності виявився складним і болісним. Дві революції Помаранчева та Революція Гідності показали прагнення народу до демократії та європейських цінностей. Російська агресія анексія Криму та війна на Донбасі стали випробуванням на міцність молодої нації. Українці довели свою готовність захищати свободу та незалежність ціною власного життя. Країна реформується змінює економіку бореться з корупцією будує громадянське суспільство.",
                difficulty: "hard"
            }
        ]
    }
};

