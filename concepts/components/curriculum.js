// Teaching order from the user-supplied 2019 copybook; GOST forms are separate.
const LetterCurriculum=(()=>{
 const planVersion=3;
 const order=Object.freeze([..."АОИУЫНТКСЛПРВЕМЗДБГЬЯЧШЖЁЙХЮФЦЭЩЪ"]);
 const stages=Object.freeze(['lower-elements','lower-letter','lower-practice','upper-elements','upper-letter','upper-practice','consolidation','review']);
 const source=Object.freeze({
  "title": "Пропись. 1 класс · Тохтаходжаева, Белова, Вейцман · Ташкент, 2019",
  "localPath": "/Users/dcor/Downloads/66142_2cc440b0376755cd1072b6a64bfce323.pdf",
  "verifiedPages": {
    "А": 8,
    "О": 9,
    "И": 10,
    "У": 11,
    "Ы": 12,
    "Н": 13,
    "Т": 14,
    "К": 17,
    "С": 19,
    "Л": 21,
    "П": 22,
    "Р": 23,
    "В": 25,
    "Е": 27,
    "М": 30,
    "З": 32,
    "Д": 34,
    "Б": 36,
    "Г": 38,
    "Ь": 39,
    "Я": 41,
    "Ч": 43,
    "Ш": 45,
    "Ж": 48,
    "Ё": 51,
    "Й": 54,
    "Х": 56,
    "Ю": 58,
    "Ф": 60,
    "Ц": 62,
    "Э": 64,
    "Щ": 66,
    "Ъ": 69
  },
  "scope": "Порядок всех 33 букв подтверждён по заголовкам. Задания авторские, адаптированы к ГОСТ типа Б без наклона; школьные рукописные формы не копируются."
});
 const examples={
  "А": {
    "combinations": [
      "аа"
    ],
    "words": [],
    "capitals": [
      "ААА"
    ],
    "sentences": [
      "А-а-а!"
    ],
    "review": []
  },
  "О": {
    "combinations": [
      "ао",
      "оа"
    ],
    "words": [],
    "capitals": [
      "Ооо"
    ],
    "sentences": [
      "О-о-о!"
    ],
    "review": []
  },
  "И": {
    "combinations": [
      "аи",
      "иа"
    ],
    "words": [],
    "capitals": [
      "Иии"
    ],
    "sentences": [
      "И-а!"
    ],
    "review": []
  },
  "У": {
    "combinations": [
      "ау",
      "уа"
    ],
    "words": [],
    "capitals": [
      "Ууу"
    ],
    "sentences": [
      "Ау!"
    ],
    "review": []
  },
  "Ы": {
    "combinations": [
      "ыы",
      "аы"
    ],
    "words": [],
    "capitals": [
      "ЫЫЫ"
    ],
    "sentences": [],
    "review": []
  },
  "Н": {
    "combinations": [
      "ни",
      "ин",
      "на"
    ],
    "words": [
      "он",
      "она",
      "они"
    ],
    "capitals": [
      "Нина",
      "Инна"
    ],
    "sentences": [
      "Она и он."
    ],
    "review": []
  },
  "Т": {
    "combinations": [
      "та",
      "ат",
      "ту"
    ],
    "words": [
      "тут",
      "нота"
    ],
    "capitals": [
      "Тина",
      "Антон"
    ],
    "sentences": [
      "Антон тут. Тут и Нина."
    ],
    "review": []
  },
  "К": {
    "combinations": [
      "ка",
      "ак",
      "ки"
    ],
    "words": [
      "кот",
      "кит",
      "утка"
    ],
    "capitals": [
      "Никита",
      "Ника"
    ],
    "sentences": [
      "У Ники кот. Кот тут. Ника и кот."
    ],
    "review": []
  },
  "С": {
    "combinations": [
      "са",
      "ас",
      "со"
    ],
    "words": [
      "нос",
      "сок",
      "сани"
    ],
    "capitals": [
      "Стас"
    ],
    "sentences": [
      "У Стаса сок. Стас и Ника тут. У Ники сок."
    ],
    "review": []
  },
  "Л": {
    "combinations": [
      "ла",
      "ал",
      "ли"
    ],
    "words": [
      "лиса",
      "луна",
      "стол"
    ],
    "capitals": [
      "Лина",
      "Алла"
    ],
    "sentences": [
      "Лиса у сосны. Слон у осин."
    ],
    "review": []
  },
  "П": {
    "combinations": [
      "па",
      "ап",
      "пи"
    ],
    "words": [
      "папа",
      "пила",
      "суп"
    ],
    "capitals": [
      "Полина",
      "Платон"
    ],
    "sentences": [
      "У папы пила. Папа пилит липу."
    ],
    "review": []
  },
  "Р": {
    "combinations": [
      "ра",
      "ар",
      "ри"
    ],
    "words": [
      "рак",
      "рис",
      "рука"
    ],
    "capitals": [
      "Рита",
      "Руслан"
    ],
    "sentences": [
      "Рита красит пол. У Риты краски."
    ],
    "review": [
      "А К С"
    ]
  },
  "В": {
    "combinations": [
      "ва",
      "ав",
      "во"
    ],
    "words": [
      "ива",
      "сова",
      "ворона"
    ],
    "capitals": [
      "Иван",
      "Вика"
    ],
    "sentences": [
      "У Ивана сова. Сова у ивы. Иван у ивы."
    ],
    "review": []
  },
  "Е": {
    "combinations": [
      "ле",
      "ре"
    ],
    "words": [
      "лес",
      "река",
      "лента"
    ],
    "capitals": [
      "Елена",
      "Вера"
    ],
    "sentences": [
      "Вера несла пакет. В пакете лента."
    ],
    "review": []
  },
  "М": {
    "combinations": [
      "ма",
      "ам",
      "мы"
    ],
    "words": [
      "мама",
      "мыло",
      "мир"
    ],
    "capitals": [
      "Мила",
      "Марат"
    ],
    "sentences": [
      "Мама мыла раму. Мила мыла пол."
    ],
    "review": [
      "Н Т Л"
    ]
  },
  "З": {
    "combinations": [
      "за",
      "аз",
      "зу"
    ],
    "words": [
      "зима",
      "роза",
      "коза"
    ],
    "capitals": [
      "Зина",
      "Злата"
    ],
    "sentences": [
      "У Зины коза. Зина пасла козу. Коза ела траву."
    ],
    "review": []
  },
  "Д": {
    "combinations": [
      "да",
      "ад",
      "ди"
    ],
    "words": [
      "дом",
      "дым",
      "вода"
    ],
    "capitals": [
      "Дина",
      "Дима"
    ],
    "sentences": [
      "Дима поливал розы. У дома розы. Мама рада."
    ],
    "review": []
  },
  "Б": {
    "combinations": [
      "ба",
      "аб",
      "бы"
    ],
    "words": [
      "боб",
      "бусы",
      "баран"
    ],
    "capitals": [
      "Борис",
      "Белла"
    ],
    "sentences": [
      "У Бориса барабан. Борис бил в барабан. Мы пели."
    ],
    "review": []
  },
  "Г": {
    "combinations": [
      "га",
      "аг",
      "го"
    ],
    "words": [
      "гора",
      "игла",
      "гриб"
    ],
    "capitals": [
      "Галина",
      "Глеб"
    ],
    "sentences": [
      "У Глеба грибы. Глеб набрал грибы."
    ],
    "review": []
  },
  "Ь": {
    "combinations": [
      "ль",
      "нь",
      "ть"
    ],
    "words": [
      "моль",
      "конь",
      "соль"
    ],
    "capitals": [
      "СОЛЬ",
      "КОНЬ"
    ],
    "sentences": [
      "У дома конь. Конь ел траву и был сыт."
    ],
    "review": []
  },
  "Я": {
    "combinations": [
      "ня",
      "ля",
      "ря"
    ],
    "words": [
      "яма",
      "моя",
      "земля"
    ],
    "capitals": [
      "Яна",
      "Таня"
    ],
    "sentences": [
      "Яна мыла пол. Таня поливала розы."
    ],
    "review": [
      "Р В Ь"
    ]
  },
  "Ч": {
    "combinations": [
      "ча",
      "ач",
      "чи"
    ],
    "words": [
      "час",
      "мяч",
      "ночь"
    ],
    "capitals": [
      "Часы",
      "Мяч"
    ],
    "sentences": [
      "На столе часы. Часы идут. У Тани мяч."
    ],
    "review": [
      "Г Д Б"
    ]
  },
  "Ш": {
    "combinations": [
      "ша",
      "аш",
      "ши"
    ],
    "words": [
      "шар",
      "шина",
      "чашка"
    ],
    "capitals": [
      "Шура",
      "Маша"
    ],
    "sentences": [
      "У Маши шары. Маша дала шар Яне. Яна рада."
    ],
    "review": []
  },
  "Ж": {
    "combinations": [
      "жа",
      "аж",
      "жи"
    ],
    "words": [
      "жук",
      "нож",
      "жара"
    ],
    "capitals": [
      "Жора",
      "Жанна"
    ],
    "sentences": [
      "Жук жил на лугу. Он жужжал. Жора увидел жука."
    ],
    "review": []
  },
  "Ё": {
    "combinations": [
      "лё",
      "рё",
      "нё"
    ],
    "words": [
      "ёлка",
      "мёд",
      "орёл"
    ],
    "capitals": [
      "Ёлка",
      "Алёна"
    ],
    "sentences": [
      "Ёлка у дома. На ёлке шары. Алёна рада."
    ],
    "review": [
      "Ч Ш Ж"
    ]
  },
  "Й": {
    "combinations": [
      "ай",
      "ой",
      "ий"
    ],
    "words": [
      "май",
      "мой",
      "чай"
    ],
    "capitals": [
      "Май",
      "Андрей"
    ],
    "sentences": [
      "Андрей пил чай. Чай тёплый. У Андрея новый чай."
    ],
    "review": []
  },
  "Х": {
    "combinations": [
      "ха",
      "ах",
      "хи"
    ],
    "words": [
      "хор",
      "хлеб",
      "мох"
    ],
    "capitals": [
      "Хлеб",
      "Михаил"
    ],
    "sentences": [
      "Михаил ел хлеб. Хлеб мягкий. Мама дала Михаилу хлеб."
    ],
    "review": []
  },
  "Ю": {
    "combinations": [
      "лю",
      "ню"
    ],
    "words": [
      "юла",
      "мою",
      "люк"
    ],
    "capitals": [
      "Юля",
      "Юра"
    ],
    "sentences": [
      "Юля моет чашку. Юра налил воду. Чашка чистая."
    ],
    "review": []
  },
  "Ф": {
    "combinations": [
      "фа",
      "аф",
      "фи"
    ],
    "words": [
      "фара",
      "форма",
      "кофе"
    ],
    "capitals": [
      "Фома",
      "Федя"
    ],
    "sentences": [
      "У Феди фонарь. Федя идёт домой. Фонарь горит."
    ],
    "review": []
  },
  "Ц": {
    "combinations": [
      "ца",
      "ац",
      "ци"
    ],
    "words": [
      "цирк",
      "цапля",
      "улица"
    ],
    "capitals": [
      "Цирк",
      "Цапля"
    ],
    "sentences": [
      "На улице цветы. У крыльца розы. Отец полил цветы."
    ],
    "review": [
      "Ф Ю Х"
    ]
  },
  "Э": {
    "combinations": [
      "эа",
      "аэ"
    ],
    "words": [
      "эхо",
      "экран",
      "этаж"
    ],
    "capitals": [
      "Эмма",
      "Эдик"
    ],
    "sentences": [
      "У Эммы экран. Эмма рисует дом. Это дом Эммы."
    ],
    "review": []
  },
  "Щ": {
    "combinations": [
      "ща",
      "щу",
      "щи"
    ],
    "words": [
      "щи",
      "щука",
      "роща"
    ],
    "capitals": [
      "Щука",
      "Роща"
    ],
    "sentences": [
      "В реке щука. Щука плыла у камыша. У берега роща."
    ],
    "review": []
  },
  "Ъ": {
    "combinations": [
      "объ",
      "подъ"
    ],
    "words": [
      "объём",
      "подъезд",
      "съезд"
    ],
    "capitals": [
      "ОБЪЁМ",
      "ПОДЪЕЗД"
    ],
    "sentences": [
      "Это подъезд. У подъезда клён. Мы вошли в подъезд."
    ],
    "review": [
      "Ь Ы И"
    ]
  }
};
 function knownLetters(letter){const index=order.indexOf(letter.toUpperCase());return index<0?[]:order.slice(0,index+1)}
 function canUseText(letter,text){
  if(typeof text!=='string'||!text.trim()||!(/^[А-ЯЁа-яё\s,.!?—-]+$/u.test(text)))return false;
  const letters=[...text.toUpperCase()].filter(c=>/[А-ЯЁ]/u.test(c)),known=knownLetters(letter);
  return letters.length>0&&letters.every(c=>known.includes(c));
 }
 function lesson(letter){letter=letter.toUpperCase();const index=order.indexOf(letter);if(index<0)throw new Error('Unknown lesson letter');return {letter,index,knownLetters:knownLetters(letter),previous:order[index-1]||null,next:order[index+1]||null,stages:[...stages],examples:structuredClone(examples[letter])}}
 const firstPractice=letter=>lesson(letter).examples.combinations[0]||letter.toLowerCase().repeat(3);
 function textStage(row){if(row.stage==='review')return 'review';if(/[.!?]/.test(row.text))return 'consolidation';return /[А-ЯЁ]/.test(row.text)?'upper-practice':'lower-practice'}
 return {order,stages,source,planVersion,knownLetters,canUseText,lesson,firstPractice,textStage};
})();
