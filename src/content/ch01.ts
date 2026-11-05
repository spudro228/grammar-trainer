// Chapter 1 «Using Be». Azar & Hagen, Basic English Grammar 4e, стр. 1–27.
// Ответы сверены с Answer Key, стр. 505–507.
import type { Chapter, Item, ExerciseBlock, Part } from '../types'

const R = (s: string) => `<span class="red">${s}</span>`

/** fill-пункт: text с ___, ответы по пропускам. Строка = один вариант, массив = варианты. */
const f = (n: number, text: string, ...answers: (string | string[])[]): Item => ({
  n,
  text,
  answers: answers.map((a) => (Array.isArray(a) ? a : [a])),
})
const ex = (n: number, text: string, ...answers: (string | string[])[]): Item => ({
  ...f(n, text, ...answers),
  example: true,
})
/** choice-пункт */
const c = (n: number, text: string, options: string[], answer: string | string[], example = false): Item => ({
  n,
  text,
  options,
  answers: [Array.isArray(answer) ? answer : [answer]],
  example,
})

const yesno = ['yes', 'no']

function exercise(
  number: number,
  title: string,
  charts: string,
  page: number,
  parts: Part[],
): ExerciseBlock {
  return { kind: 'exercise', id: `1.${String(number).padStart(2, '0')}`, number, title, charts, page, parts }
}
const one = (type: Part['type'], instruction: string, items: Item[], extra: Partial<Part> = {}): Part[] => [
  { type, instruction, items, ...extra },
]
const info = (instruction: string, extra: Partial<Part> = {}): Part[] => [
  { type: 'info', instruction, items: [], ...extra },
]

export const ch01: Chapter = {
  book: 'Azar & Hagen, Basic English Grammar, 4e',
  number: 1,
  title: 'Using Be',
  blocks: [
    exercise(1, "Let's talk: class activity", 'Chart 1-1', 1, info(
      'Introduce yourself to six classmates. Use this model.',
      {
        text: `<p>Hi, I am ______ <i>(name)</i>.<br>I am from ______ <i>(country or city)</i>.<br>I speak ______ <i>(language)</i>.</p>
<p>Write down information about six classmates you talk to.</p>`,
      },
    )),

    exercise(2, 'Warm-up', 'Chart 1-1', 1, one('choice', 'Read the sentences and circle <i>yes</i> or <i>no</i>.', [
      c(1, 'He is happy. ___', yesno, 'yes'),
      c(2, 'She is sad. ___', yesno, 'yes'),
      { n: 3, text: 'I am happy. ___', options: yesno, answers: [[]] },
    ], { image: 'img/ch01/ex02.png' })),

    {
      kind: 'chart', id: '1-1', title: 'Singular Pronouns + <i>Be</i>',
      html: `
<tr><td>
<table class="inner"><tr><th></th><th>PRONOUN</th><th>+ BE</th><th></th></tr>
<tr><td>(a)</td><td>${R('<b><i>I</i></b>')}</td><td>${R('<b><i>am</i></b>')}</td><td>late.</td></tr>
<tr><td>(b)</td><td>${R('<b><i>You</i></b>')}</td><td>${R('<b><i>are</i></b>')}</td><td>late.</td></tr>
<tr><td>(c)</td><td>${R('<b><i>She</i></b>')}</td><td>${R('<b><i>is</i></b>')}</td><td>late.</td></tr>
<tr><td>(d)</td><td>${R('<b><i>He</i></b>')}</td><td>${R('<b><i>is</i></b>')}</td><td>late.</td></tr>
<tr><td>(e)</td><td>${R('<b><i>It</i></b>')}</td><td>${R('<b><i>is</i></b>')}</td><td>late.</td></tr></table>
</td><td>
<p><i>Singular</i> means “one.”</p>
<p><b><i>I, you, she, he,</i></b> and <b><i>it</i></b> in (a)–(e) refer to one person.</p>
<p><i>am, are, is</i> = forms of <b><i>be</i></b></p>
</td></tr>
<tr><td>
<p>(f) ${R('<b><i>Maria</i></b>')} is late. ↓ ${R('<b><i>She</i></b>')} is late.</p>
<p>(g) ${R('<b><i>Tom</i></b>')} is late. ↓ ${R('<b><i>He</i></b>')} is late.</p>
<p>(h) ${R('<b><i>Bus 10</i></b>')} is late. ↓ ${R('<b><i>It</i></b>')} is late.</p>
</td><td>
<p>Pronouns refer to nouns.</p>
<p>In (f): <b><i>She</i></b> (feminine) = Maria</p>
<p>In (g): <b><i>He</i></b> (masculine) = Tom</p>
<p>In (h): <b><i>It</i></b> = Bus 10</p>
</td></tr>`,
    },

    exercise(3, 'Looking at grammar', 'Chart 1-1', 2, one('fill',
      'Write the correct pronoun: <b><i>he, she,</i></b> or <b><i>it</i></b>. Some items have two answers.', [
        ex(1, 'Mary ___', 'she'),
        f(2, 'David ___', 'he'),
        f(3, 'Mr. Smith ___', 'he'),
        f(4, 'Canada ___', 'it'),
        f(5, 'Dr. Jones ___', ['he', 'she']),
        f(6, 'Ms. Wilson ___', 'she'),
        f(7, 'Professor Lee ___', ['he', 'she']),
        f(8, 'English ___', 'it'),
        f(9, 'Robert ___', 'he'),
        f(10, 'Miss Allen ___', 'she'),
      ])),

    exercise(4, 'Looking at grammar', 'Chart 1-1', 2, one('fill',
      'Complete the sentences with <b><i>am, is,</i></b> or <b><i>are</i></b>.', [
        ex(1, 'He ___ here.', 'is'),
        f(2, 'You ___ late.', 'are'),
        f(3, 'It ___ ready.', 'is'),
        f(4, 'She ___ early.', 'is'),
        f(5, 'I ___ hot.', 'am'),
        f(6, 'He ___ cold.', 'is'),
      ])),

    exercise(5, "Let's talk", 'Chart 1-1', 3, info(
      '<b>Part I.</b> Check (✓) all the words that are true for you right now.',
      {
        text: `<p><i>I am …</i> happy, hot, nice, hungry, tired, sad, cold, nervous, sick, funny.</p>
<p><b>Part II.</b> Share some sentences with a partner: “I am ____.”</p>
<p><b>Part III.</b> Tell the class a few things about your partner: “He is ____.” OR “She is ____.”</p>`,
      },
    )),

    exercise(6, 'Warm-up', 'Chart 1-2', 3, one('choice',
      'Circle the correct answer. One sentence has two answers.<br><i>How many people?</i>', [
        c(1, `${R('We')} are ready. ___`, ['one', 'two, three, or more'], 'two, three, or more'),
        c(2, `${R('You')} are ready. ___`, ['one', 'two, three, or more'], ['one', 'two, three, or more']),
        c(3, `${R('They')} are ready. ___`, ['one', 'two, three, or more'], 'two, three, or more'),
      ])),

    {
      kind: 'chart', id: '1-2', title: 'Plural Pronouns + <i>Be</i>',
      html: `
<tr><td>
<table class="inner"><tr><th></th><th>PRONOUN</th><th>+ BE</th><th></th></tr>
<tr><td>(a)</td><td>${R('<b><i>We</i></b>')}</td><td>${R('<b><i>are</i></b>')}</td><td>here.</td></tr>
<tr><td>(b)</td><td>${R('<b><i>You</i></b>')}</td><td>${R('<b><i>are</i></b>')}</td><td>here.</td></tr>
<tr><td>(c)</td><td>${R('<b><i>They</i></b>')}</td><td>${R('<b><i>are</i></b>')}</td><td>here.</td></tr></table>
</td><td>
<p><i>Plural</i> means “two, three, or more.”</p>
<p><b><i>We, you,</i></b> and <b><i>they</i></b> in (a)–(c) refer to two, three, or more persons.</p>
</td></tr>
<tr><td>
<p>(d) <u>Sam and I</u> are here. ↓ ${R('<b><i>We</i></b>')} are here.</p>
<p>(e) <u>Sam and you</u> are here. ↓ ${R('<b><i>You</i></b>')} are here.</p>
<p>(f) <u>Sam and Lisa</u> are here. ↓ ${R('<b><i>They</i></b>')} are here.</p>
</td><td>
<p>In (d): <b><i>We</i></b> = Sam and I</p>
<p>In (e): <b><i>You</i></b> = Sam and you<br><small>NOTE: <b><i>You</i></b> can be singular or plural.</small></p>
<p>In (f): <b><i>They</i></b> = Sam and Lisa</p>
</td></tr>`,
    },

    exercise(7, 'Looking at grammar', 'Chart 1-2', 4, one('choice', 'Choose the correct pronoun.', [
      c(1, 'Lee and Bill ___', ['they', 'we'], 'they', true),
      c(2, 'Alice and I ___', ['they', 'we'], 'we'),
      c(3, 'Mr. and Mrs. Martin and I ___', ['they', 'we'], 'we'),
      c(4, 'you and Dr. Taher ___', ['they', 'you'], 'you'),
      c(5, 'Tony and she ___', ['they', 'we'], 'they'),
      c(6, 'Tony and you ___', ['they', 'you'], 'you'),
    ])),

    exercise(8, 'Looking at grammar', 'Charts 1-1 and 1-2', 4, one('fill',
      'Complete the sentences with <b><i>am, is,</i></b> or <b><i>are</i></b>.', [
        ex(1, 'We ___ ready.', 'are'),
        f(2, 'I ___ late.', 'am'),
        f(3, 'He ___ happy.', 'is'),
        f(4, 'They ___ sick.', 'are'),
        f(5, 'She ___ homesick.', 'is'),
        f(6, 'Abdul and Taka ___ homesick.', 'are'),
        f(7, 'You (one person) ___ funny.', 'are'),
        f(8, 'You (two persons) ___ early.', 'are'),
        f(9, 'You and I ___ ready.', 'are'),
        f(10, 'It ___ hot.', 'is'),
        f(11, 'Sara and I ___ late.', 'are'),
        f(12, 'You and Emily ___ tired.', 'are'),
      ])),

    exercise(9, 'Looking at grammar', 'Charts 1-1 and 1-2', 5, one('rewrite', 'Make complete sentences.', [
      ex(1, 'He \\ here → ___', 'He is here.'),
      f(2, 'They \\ absent → ___', 'They are absent.'),
      f(3, 'She \\ sick → ___', 'She is sick.'),
      f(4, 'I \\ homesick → ___', 'I am homesick.'),
      f(5, 'You and I \\ homesick → ___', 'You and I are homesick.'),
      f(6, 'We \\ late → ___', 'We are late.'),
      f(7, 'Jack \\ hungry → ___', 'Jack is hungry.'),
      f(8, 'You (one person) \\ early → ___', 'You are early.'),
      f(9, 'You (two persons) \\ early → ___', 'You are early.'),
      f(10, 'Mr. and Mrs. Nelson \\ late → ___', 'Mr. and Mrs. Nelson are late.'),
      f(11, 'Amy and I \\ late → ___', 'Amy and I are late.'),
    ], { contractionsFree: true })),

    exercise(10, 'Warm-up', 'Chart 1-3', 5, one('choice', 'Read the sentences and circle <i>yes</i> or <i>no</i>.', [
      c(1, 'Canada is a country. ___', yesno, 'yes'),
      c(2, 'Toronto is a city. ___', yesno, 'yes'),
      c(3, 'Vancouver is an island. ___', yesno, 'yes'),
    ], { image: 'img/ch01/ex10.png' })),

    {
      kind: 'chart', id: '1-3', title: 'Singular Nouns + <i>Be</i>',
      html: `
<tr><td>
<p><small>NOUN + IS + NOUN</small><br>(a) ${R('<b><i>Canada</i></b>')} ${R('<b><i>is</i></b>')} ${R('<b><i>a country.</i></b>')}</p>
<p><small>INCORRECT:</small> <i>Canada is country.</i></p>
</td><td>
<p>In (a): <b><i>Canada</i></b> = a singular noun<br><b><i>is</i></b> = a singular verb<br><b><i>country</i></b> = a singular noun</p>
<p><b><i>A</i></b> frequently comes in front of singular nouns. In (a): <b><i>a</i></b> comes in front of the singular noun <b><i>country</i></b>. <b><i>A</i></b> is called an “article.”</p>
</td></tr>
<tr><td>
<p>(b) Bali is ${R('<b><i>an</i></b>')} island.</p>
<p><small>INCORRECT:</small> <i>Bali is island.</i></p>
</td><td>
<p><b><i>A</i></b> and <b><i>an</i></b> have the same meaning. They are both articles.</p>
<p><b><i>A</i></b> is used in front of words that begin with consonants: <i>b, c, d, f, g,</i> etc.<br>Examples: <i>a bed, a cat, a dog, a friend, a girl</i></p>
<p><b><i>An</i></b> is used in front of words that begin with the vowels <i>a, e, i,</i> and <i>o</i>.*<br>Examples: <i>an animal, an ear, an island, an office</i></p>
</td></tr>`,
      note: '*<b><i>An</i></b> is sometimes used in front of words that begin with <i>u</i>. See Chart 7-2, p. 196.<br>Vowels = a, e, i, o, u<br>Consonants = b, c, d, f, g, h, j, k, l, m, n, p, q, r, s, t, v, w, x, y, z',
    },

    exercise(11, 'Looking at grammar', 'Chart 1-3', 6, one('fill', 'Write <b><i>a</i></b> or <b><i>an</i></b>.', [
      ex(1, '___ town', 'a'),
      f(2, '___ city', 'a'),
      f(3, '___ island', 'an'),
      f(4, '___ place', 'a'),
      f(5, '___ street', 'a'),
      f(6, '___ avenue', 'an'),
      f(7, '___ ocean', 'an'),
      f(8, '___ continent', 'a'),
    ], { image: 'img/ch01/ex11.png' })),

    exercise(12, 'Vocabulary and grammar', 'Chart 1-3', 7, [
      {
        type: 'set',
        label: 'Part I.',
        instruction: 'Put the words from the box in the correct column. Some words go in two places.',
        box: ['Arabic', 'Beijing', 'Chinese', 'Cuba', 'France', 'French', 'Hawaii', 'Japanese', 'Lima', 'Mexico', 'Moscow', 'Paris', 'Russia', 'Russian', 'Saudi Arabia', 'Spanish', 'Taiwan', 'Tokyo'],
        items: [
          { n: 1, label: 'COUNTRY', text: '', blanks: 6, prefilled: [], answers: [['Cuba', 'France', 'Mexico', 'Russia', 'Saudi Arabia', 'Taiwan']] },
          { n: 2, label: 'LANGUAGE', text: '', blanks: 6, prefilled: ['Arabic'], answers: [['Chinese', 'French', 'Japanese', 'Russian', 'Spanish']] },
          { n: 3, label: 'CITY', text: '', blanks: 6, prefilled: ['Beijing'], answers: [['Lima', 'Moscow', 'Paris', 'Tokyo']] },
          { n: 4, label: 'ISLAND', text: '', blanks: 6, prefilled: [], answers: [['Cuba', 'Hawaii', 'Taiwan']] },
        ],
      },
      {
        type: 'info',
        label: 'Part II.',
        instruction: 'Work in small groups. Check your answers. Finish the chart with your own choices. Take turns making sentences. Share some of your sentences with the class.',
        text: '<p><i>Example:</i> France, Japanese<br>STUDENT A: France is a country.<br>STUDENT B: Japanese is a language.</p>',
        items: [],
      },
    ]),

    exercise(13, 'Warm-up', 'Chart 1-4', 7, one('fill',
      'Complete the sentences with <b><i>a book</i></b> or <b><i>books</i></b>. What do you notice about the verbs in red?', [
        f(1, `A dictionary ${R('is')} ___.`, 'a book'),
        f(2, `Textbooks ${R('are')} ___.`, 'books'),
        f(3, `Dictionaries and textbooks ${R('are')} ___.`, 'books'),
      ])),

    {
      kind: 'chart', id: '1-4', title: 'Plural Nouns + <i>Be</i>',
      html: `
<tr><td><p><small>NOUN + ARE + NOUN</small><br>(a) ${R('<b><i>Cats</i></b>')} ${R('<b><i>are</i></b>')} ${R('<b><i>animals</i></b>')}.</p></td>
<td><p><b><i>Cats</i></b> = a plural noun<br><b><i>are</i></b> = a plural verb<br><b><i>animals</i></b> = a plural noun</p></td></tr>
<tr><td><p>(b) <small>SINGULAR:</small> a cat, an animal<br><small>PLURAL:</small> cat${R('s')}, animal${R('s')}</p></td>
<td><p>Plural nouns end in <b>-s</b>.<br><b><i>A</i></b> and <b><i>an</i></b> are used only with singular nouns.</p></td></tr>
<tr><td><p>(c) <small>SINGULAR:</small> a cit${R('y')}, a countr${R('y')}<br><small>PLURAL:</small> cit${R('ies')}, countr${R('ies')}</p></td>
<td><p>Some singular nouns that end in <b>-y</b> have a special plural form: They omit the <b>-y</b> and add <b>-ies</b>.*</p></td></tr>
<tr><td><p><small>NOUN and NOUN + ARE + NOUN</small><br>(d) ${R('<b><i>Canada and China</i></b>')} ${R('<b><i>are</i></b>')} ${R('<b><i>countries</i></b>')}.<br>(e) ${R('<b><i>Dogs and cats</i></b>')} ${R('<b><i>are</i></b>')} ${R('<b><i>animals</i></b>')}.</p></td>
<td><p>Two nouns connected by <b><i>and</i></b> are followed by <b><i>are</i></b>.<br>In (d): <b><i>Canada</i></b> is a singular noun. <b><i>China</i></b> is a singular noun. They are connected by <b><i>and</i></b>. Together they are plural, i.e., “more than one.”</p></td></tr>`,
      note: '*See Chart 3-5, p. 69, for more information about adding <b>-s/-es</b> to words that end in <b>-y</b>.',
    },

    exercise(14, 'Looking at grammar', 'Charts 1-3 and 1-4', 8, one('choice',
      'Look at each noun. Is it singular or plural? Choose the correct answer.', [
        c(1, 'animals ___', ['one', 'two or more'], 'two or more'),
        c(2, 'a dog ___', ['one', 'two or more'], 'one'),
        c(3, 'a city ___', ['one', 'two or more'], 'one'),
        c(4, 'cities ___', ['one', 'two or more'], 'two or more'),
        c(5, 'an island ___', ['one', 'two or more'], 'one'),
        c(6, 'languages ___', ['one', 'two or more'], 'two or more'),
        c(7, 'a country ___', ['one', 'two or more'], 'one'),
      ])),

    exercise(15, 'Looking at grammar', 'Charts 1-3 and 1-4', 8, one('fill', 'Write the plural form.', [
      ex(1, 'a book → ___', 'books'),
      f(2, 'a textbook → ___', 'textbooks'),
      f(3, 'a pencil → ___', 'pencils'),
      f(4, 'an eraser → ___', 'erasers'),
      f(5, 'a pen → ___', 'pens'),
      f(6, 'a dictionary → ___', 'dictionaries'),
    ])),

    exercise(16, 'Looking at grammar', 'Charts 1-3 and 1-4', 9, one('fill',
      'Complete the sentences. Use <b><i>a</i></b> or <b><i>an</i></b> and the words from the box.', [
        ex(1, 'A bird is ___. Birds and cats are ___.', 'an animal', 'animals'),
        f(2, 'Tennis is ___. Tennis and soccer are ___.', 'a sport', 'sports'),
        f(3, 'Chicago is ___. Chicago and Berlin are ___.', 'a city', 'cities'),
        f(4, 'Spanish is ___. Spanish and Italian are ___.', 'a language', 'languages'),
        f(5, 'Mexico is ___. Mexico and Brazil are ___.', 'a country', 'countries'),
        f(6, 'A cow is ___. Cows and horses are ___.', 'an animal', 'animals'),
        f(7, 'Hawaii is ___. Hawaii and Taiwan are ___.', 'an island', 'islands'),
      ], { box: ['animal', 'city', 'country', 'island', 'language', 'sport'] })),

    exercise(17, 'Looking at grammar', 'Charts 1-3 and 1-4', 9, one('rewrite',
      'Change the singular sentences to plural sentences.', [
        ex(1, 'A chicken is an animal. → ___', 'Chickens are animals.'),
        f(2, 'A pea is a vegetable. → ___', 'Peas are vegetables.'),
        f(3, 'A dictionary is a book. → ___', 'Dictionaries are books.'),
        f(4, 'An airplane is a machine. → ___', 'Airplanes are machines.'),
        f(5, 'June is a month. July is a month. → ___', 'June and July are months.'),
        f(6, 'Winter is a season. Summer is a season. → ___', 'Winter and summer are seasons.'),
        f(7, 'Egypt is a country. Indonesia is a country. → ___', 'Egypt and Indonesia are countries.'),
      ])),

    exercise(18, 'Game', 'Charts 1-3 and 1-4', 10, info(
      'Work in teams. Your teacher will say the beginning of a sentence. As a team, finish the sentence and write it down. The team with the most correct sentences wins the game. Close your book for this activity.',
      { text: '<p><i>Example:</i> TEACHER: Spanish … — TEAM A: Spanish is a language.</p><p>1. A dog … 2. Arabic … 3. London … 4. Summer … 5. September and October … 6. Mexico and Canada … 7. An airplane … 8. Winter and summer … 9. Peas … 10. A car …</p>' },
    )),

    exercise(19, "Let's talk: pairwork", 'Charts 1-3 and 1-4', 10, info(
      'Your partner will ask you to name something. Answer in a complete sentence. You can look at your book before you speak. When you speak, look at your partner.',
      { text: '<p>PARTNER A: a language, two languages, a machine, an animal, two seasons.<br>PARTNER B: two cities, an island, two countries in Asia, a vegetable, a street in this city.</p>' },
    )),

    exercise(20, 'Warm-up: listening', 'Chart 1-5', 11, info(
      'Listen to the conversation. Notice the words in red. Do you know the long form for them?',
      { text: `<p>A: Hi. My name is Mrs. Smith. ${R("I'm")} the substitute teacher.<br>B: Hi. ${R("I'm")} Franco.<br>C: Hi. ${R("I'm")} Lisa. ${R("We're")} in your class.<br>A: ${R("It's")} nice to meet you.<br>B: ${R("We're")} glad to meet you too.</p><p class="muted">Аудио не входит в MVP.</p>` },
    )),

    {
      kind: 'chart', id: '1-5', title: 'Contractions with <i>Be</i>',
      html: `
<tr><td>
<table class="inner"><tr><th></th><th>PRONOUN + BE → CONTRACTION</th><th></th></tr>
<tr><td>AM</td><td>${R('I')} + ${R('am')} → ${R("<b><i>I'm</i></b>")}</td><td>(a) ${R("<b><i>I'm</i></b>")} a student.</td></tr>
<tr><td rowspan="3">IS</td><td>${R('she')} + ${R('is')} → ${R("<b><i>she's</i></b>")}</td><td>(b) ${R("<b><i>She's</i></b>")} a student.</td></tr>
<tr><td>${R('he')} + ${R('is')} → ${R("<b><i>he's</i></b>")}</td><td>(c) ${R("<b><i>He's</i></b>")} a student.</td></tr>
<tr><td>${R('it')} + ${R('is')} → ${R("<b><i>it's</i></b>")}</td><td>(d) ${R("<b><i>It's</i></b>")} a city.</td></tr>
<tr><td rowspan="3">ARE</td><td>${R('you')} + ${R('are')} → ${R("<b><i>you're</i></b>")}</td><td>(e) ${R("<b><i>You're</i></b>")} a student.</td></tr>
<tr><td>${R('we')} + ${R('are')} → ${R("<b><i>we're</i></b>")}</td><td>(f) ${R("<b><i>We're</i></b>")} students.</td></tr>
<tr><td>${R('they')} + ${R('are')} → ${R("<b><i>they're</i></b>")}</td><td>(g) ${R("<b><i>They're</i></b>")} students.</td></tr></table>
</td><td>
<p>When people speak, they often push two words together. A <i>contraction</i> = two words that are pushed together.</p>
<p>Contractions of a <i>subject pronoun + <b>be</b></i> are used in both speaking and writing.</p>
<p>PUNCTUATION: The mark in the middle of a contraction is called an “apostrophe” (’).*</p>
</td></tr>`,
      note: '*NOTE: Write an apostrophe above the line. Do not write an apostrophe on the line.<br>CORRECT: <i>I’m a student.</i> INCORRECT: <i>I,m a student.</i>',
    },

    exercise(21, 'Looking at grammar', 'Chart 1-5', 11, one('fill', 'Write the contractions.', [
      ex(1, 'I am → ___', "I'm"),
      f(2, 'she is → ___', "she's"),
      f(3, 'you are → ___', "you're"),
      f(4, 'we are → ___', "we're"),
      f(5, 'it is → ___', "it's"),
      f(6, 'they are → ___', "they're"),
      f(7, 'he is → ___', "he's"),
    ])),

    exercise(22, 'Looking at grammar', 'Chart 1-5', 11, one('fill', 'Write the long form for each contraction.', [
      ex(1, "They're sick. → ___ sick.", 'They are'),
      f(2, "He's absent. → ___ absent.", 'He is'),
      f(3, "It's hot. → ___ hot.", 'It is'),
      f(4, "I'm late. → ___ late.", 'I am'),
      f(5, "She's hungry. → ___ hungry.", 'She is'),
      f(6, "We're students. → ___ students.", 'We are'),
      f(7, "You're here. → ___ here.", 'You are'),
    ])),

    exercise(23, 'Looking at grammar', 'Chart 1-5', 12, one('fill',
      'Complete the sentences with pronouns. Use contractions.', [
        ex(1, '<i>Sara</i> is a student. ___ in my class.', "She's"),
        f(2, '<i>James</i> is a student. ___ in my class.', "He's"),
        f(3, '<i>I</i> am at school. ___ in the cafeteria.', "I'm"),
        f(4, '<i>Yuri and Anna</i> are absent. ___ at home.', "They're"),
        f(5, '<i>Anna</i> is from Russia. ___ nice.', "She's"),
        f(6, '<i>Ali and I</i> are in the same class. ___ friends.', "We're"),
        f(7, '<i>Yuri, Ali, and Anna</i> are friends. ___ funny.', "They're"),
      ])),

    exercise(24, 'Listening', 'Chart 1-5', 12, info(
      '<b>Part I.</b> Listen to the conversation. Write the contractions. <b>Part II.</b> Listen to the conversation again and check your answers.',
      { text: `<p>A: Hello. <u>I'm</u> Mrs. Brown. ___ the substitute teacher.<br>B: Hi. ___ Paulo, and this is Marie. ___ in your class.<br>A: ___ nice to meet you.<br>B: ___ happy to meet you too.<br>A: ___ time for class. Please take a seat.</p><p class="muted">Аудио не входит в MVP.</p>` },
    )),

    exercise(25, 'Warm-up: pairwork', 'Chart 1-6', 12, info(
      'Work with a partner. Complete the sentences with <u>all</u> the words from the box that are true. Share a few of your answers with the class.',
      { box: ['a baby', 'a bird', 'a husband', 'a student', 'a teacher', 'a wife'], text: "<p>1. I'm not ______.<br>2. You're not ______.</p>" },
    )),

    {
      kind: 'chart', id: '1-6', title: 'Negative with <i>Be</i>',
      html: `
<tr><td>
<table class="inner"><tr><th></th><th></th><th>CONTRACTIONS</th></tr>
<tr><td>(a)</td><td>I ${R('<b><i>am not</i></b>')} a teacher.</td><td>I${R("<b><i>'m not</i></b>")}</td></tr>
<tr><td>(b)</td><td>You ${R('<b><i>are not</i></b>')} a teacher.</td><td>you${R("<b><i>'re not</i></b>")} / you ${R("<b><i>aren't</i></b>")}</td></tr>
<tr><td>(c)</td><td>She ${R('<b><i>is not</i></b>')} a teacher.</td><td>she${R("<b><i>'s not</i></b>")} / she ${R("<b><i>isn't</i></b>")}</td></tr>
<tr><td>(d)</td><td>He ${R('<b><i>is not</i></b>')} a teacher.</td><td>he${R("<b><i>'s not</i></b>")} / he ${R("<b><i>isn't</i></b>")}</td></tr>
<tr><td>(e)</td><td>It ${R('<b><i>is not</i></b>')} a city.</td><td>it${R("<b><i>'s not</i></b>")} / it ${R("<b><i>isn't</i></b>")}</td></tr>
<tr><td>(f)</td><td>We ${R('<b><i>are not</i></b>')} teachers.</td><td>we${R("<b><i>'re not</i></b>")} / we ${R("<b><i>aren't</i></b>")}</td></tr>
<tr><td>(g)</td><td>You ${R('<b><i>are not</i></b>')} teachers.</td><td>you${R("<b><i>'re not</i></b>")} / you ${R("<b><i>aren't</i></b>")}</td></tr>
<tr><td>(h)</td><td>They ${R('<b><i>are not</i></b>')} teachers.</td><td>they${R("<b><i>'re not</i></b>")} / they ${R("<b><i>aren't</i></b>")}</td></tr></table>
</td><td>
<p><b><i>Not</i></b> makes a sentence negative.</p>
<p>CONTRACTIONS<br><b><i>Be</i></b> and <b><i>not</i></b> can be contracted.<br>Note that “I am” has only one contraction with <b><i>be</i></b>, as in (a), but there are two contractions with <b><i>be</i></b> for (b)–(h).</p>
</td></tr>`,
    },

    exercise(26, 'Looking at grammar', 'Chart 1-6', 13, one('fill',
      'Complete the sentences with the negative form of <b><i>be</i></b>. Left: FULL FORM. Right: CONTRACTION.', [
        ex(1, 'I ___ an astronaut. | I ___ an astronaut.', 'am not', "'m not"),
        f(2, 'He ___ an astronaut. | He ___ an astronaut. OR He ___ an astronaut.', 'is not', ["isn't", "'s not"], ["'s not", "isn't"]),
        f(3, 'They ___ astronauts. | They ___ astronauts. OR They ___ astronauts.', 'are not', ["aren't", "'re not"], ["'re not", "aren't"]),
        f(4, 'You ___ an astronaut. | You ___ an astronaut. OR You ___ an astronaut.', 'are not', ["aren't", "'re not"], ["'re not", "aren't"]),
        f(5, 'She ___ an astronaut. | She ___ an astronaut. OR She ___ an astronaut.', 'is not', ["isn't", "'s not"], ["'s not", "isn't"]),
        f(6, 'We ___ astronauts. | We ___ astronauts. OR We ___ astronauts.', 'are not', ["aren't", "'re not"], ["'re not", "aren't"]),
      ])),

    exercise(27, 'Looking at grammar', 'Charts 1-5 and 1-6', 14, one('rewrite',
      "Make sentences with <b><i>is, isn't, are,</i></b> and <b><i>aren't</i></b>.<br><i>Examples:</i> Africa \\ city … It \\ continent → <u>Africa isn't a city. It's a continent.</u><br>Baghdad and Chicago \\ city … They \\ continent → <u>Baghdad and Chicago are cities. They aren't continents.</u>", [
        f(1, 'Canada \\ country … It \\ city → ___', "Canada is a country. It isn't a city."),
        f(2, 'Argentina \\ city … It \\ country → ___', "Argentina isn't a city. It is a country."),
        f(3, 'Beijing and London \\ city … They \\ country → ___', "Beijing and London are cities. They aren't countries."),
        f(4, 'Asia \\ country … It \\ continent → ___', "Asia isn't a country. It's a continent."),
        f(5, 'Asia and South America \\ continent … They \\ country → ___', "Asia and South America are continents. They aren't countries."),
      ], { contractionsFree: true })),

    exercise(28, 'Vocabulary and listening', 'Charts 1-3 and 1-6', 14, [
      {
        type: 'fill', label: 'Part I.', instruction: 'Write <b><i>a</i></b> or <b><i>an</i></b>.',
        image: 'img/ch01/ex28.png',
        items: [
          ex(1, '___ mother', 'a'), f(2, '___ mom', 'a'), f(3, '___ father', 'a'), f(4, '___ dad', 'a'),
          f(5, '___ sister', 'a'), f(6, '___ brother', 'a'), f(7, '___ daughter', 'a'), f(8, '___ son', 'a'),
          f(9, '___ aunt', 'an'), f(10, '___ uncle', 'an'), f(11, '___ parent', 'a'), f(12, '___ adult', 'an'),
          f(13, '___ child', 'a'),
        ],
      },
      {
        type: 'info', label: 'Part II.',
        instruction: 'Listen to the sentences. Choose the correct answer. <i>Note:</i> in spoken English, the “t” in negative contractions may be hard to hear.',
        text: '<p class="muted">Аудио не входит в MVP.</p>', items: [],
      },
    ]),

    exercise(29, 'Looking at grammar', 'Charts 1-5 and 1-6', 15, [
      {
        type: 'fill', label: 'Part I.', instruction: 'Write the name of the person next to the job.',
        image: 'img/ch01/ex29.png',
        items: [
          ex(1, 'plumber ___', 'Paul'),
          f(2, 'bus driver ___', ['Gloria', 'Gloria Perez']),
          f(3, 'nurse ___', ['Lars', 'Lars Jensen']),
          f(4, 'gardener ___', ['Rick', 'Rick Hayes']),
          f(5, 'police officer ___', ['Jennifer', 'Jennifer Evans']),
          f(6, 'doctor ___', ['Sana', 'Sana Gupta', 'Dr. Sana Gupta']),
          f(7, 'auto mechanic ___', ['Omar', 'Omar Khan']),
          f(8, 'construction worker ___', ['Joe', 'Joe Davis']),
        ],
      },
      {
        type: 'fill', label: 'Part II.', instruction: 'Complete the sentences. Items may vary in items 3–7.',
        items: [
          ex(1, 'Jennifer ___ a gardener. She ___.', "isn't", "'s a police officer"),
          { n: 2, text: 'Lars <u>is</u> a nurse. He ___ a doctor.', answers: [["isn't", "'s not"]] },
          { n: 3, text: "Omar ___ an auto mechanic. He isn't ___.", answers: [['is'], []] },
          { n: 4, text: 'Paul ___ a construction worker. He ___.', answers: [["isn't", "'s not"], ["is a plumber", "'s a plumber"]] },
          { n: 5, text: 'Sana ___. ___.', answers: [[], []] },
          { n: 6, text: 'Gloria ___. ___.', answers: [[], []] },
          { n: 7, text: "I'm not a ___. I'm ___.", answers: [[], []] },
        ],
      },
    ]),

    exercise(30, 'Warm-up', 'Chart 1-7', 16, one('fill', 'Complete each sentence with a word from the box.', [
      f(1, 'Bill is ___.', 'tall'),
      f(2, 'He is also ___.', 'old'),
      f(3, 'Sam is ___ and ___.', ['short', 'young'], ['young', 'short']),
    ], { box: ['short', 'tall', 'young', 'old'], image: 'img/ch01/ex30.png' })),

    {
      kind: 'chart', id: '1-7', title: '<i>Be</i> + Adjective',
      html: `
<tr><td>
<table class="inner"><tr><th></th><th>NOUN</th><th>+ BE</th><th>+ ADJECTIVE</th></tr>
<tr><td>(a)</td><td>A ball</td><td>is</td><td>${R('<b><i>round</i></b>')}.</td></tr>
<tr><td>(b)</td><td>Balls</td><td>are</td><td>${R('<b><i>round</i></b>')}.</td></tr>
<tr><td>(c)</td><td>Mary</td><td>is</td><td>${R('<b><i>intelligent</i></b>')}.</td></tr>
<tr><td>(d)</td><td>Mary and Tom</td><td>are</td><td>${R('<b><i>intelligent</i></b>')}.</td></tr>
<tr><th></th><th>PRONOUN</th><th>+ BE</th><th>+ ADJECTIVE</th></tr>
<tr><td>(e)</td><td>I</td><td>am</td><td>${R('<b><i>hungry</i></b>')}.</td></tr>
<tr><td>(f)</td><td>She</td><td>is</td><td>${R('<b><i>young</i></b>')}.</td></tr>
<tr><td>(g)</td><td>They</td><td>are</td><td>${R('<b><i>happy</i></b>')}.</td></tr></table>
</td><td>
<p><i>round, intelligent, hungry, young, happy</i> = adjectives</p>
<p>Adjectives often follow a form of <b><i>be</i></b> (<i>am, is, are</i>).<br>In (a)–(g), the adjectives give information about a noun or pronoun that comes at the beginning of a sentence.*</p>
</td></tr>`,
      note: '*The noun or pronoun that comes at the beginning of a sentence is called a “subject.” See Chart 6-1, p. 159.',
    },

    exercise(31, 'Grammar and vocabulary', 'Charts 1-5 and 1-7', 16, one('fill',
      'Find the adjective in the first sentence. Then complete the second sentence with <b><i>be</i></b> + <i>an adjective</i> with an opposite meaning. Use an adjective from the box. Write the contracted form of <b><i>be</i></b>.', [
        ex(1, "I'm not sad. I ___.", "'m happy"),
        f(2, "Mr. Thomas isn't rich. He ___.", "'s poor"),
        f(3, "My hair isn't long. It ___.", "'s short"),
        f(4, "My clothes aren't dirty. They ___.", "'re clean"),
        f(5, "Flowers aren't ugly. They ___.", "'re beautiful"),
        f(6, "Cars aren't cheap. They ___.", "'re expensive"),
        f(7, "Airplanes aren't slow. They ___.", "'re fast"),
        f(8, "Grammar isn't difficult. It ___.", "'s easy"),
        f(9, "My sister isn't short. She ___.", "'s tall"),
        f(10, "My grandparents aren't young. They ___.", "'re old"),
        f(11, "The classroom isn't quiet. It ___.", "'s noisy"),
      ], { box: ['beautiful', 'clean', 'easy', 'expensive', 'fast', 'happy', 'noisy', 'old', 'poor', 'short', 'tall'] })),

    exercise(32, 'Grammar and vocabulary', 'Charts 1-3, 1-4, and 1-7', 17, one('fill',
      'Complete each sentence with <b><i>is</i></b> or <b><i>are</i></b> and an adjective from the box.', [
        ex(1, 'Fire ___.', 'is hot'),
        f(2, 'Ice and snow ___.', 'are cold'),
        f(3, 'A box ___.', 'is square'),
        f(4, 'Balls and oranges ___.', 'are round'),
        f(5, 'Sugar ___.', 'is sweet'),
        f(6, 'An elephant ___, but a mouse ___.', ['is large', 'is big'], ['is small', 'is little']),
        f(7, 'A rain forest ___, but a desert ___.', 'is wet', 'is dry'),
        f(8, 'A joke ___.', 'is funny'),
        f(9, 'Good health ___.', 'is important'),
        f(10, "Guns aren't safe. They ___.", 'are dangerous'),
        f(11, 'A coin ___ small, round, and ___.', 'is', 'flat'),
        f(12, 'A lemon ___.', 'is sour'),
      ], { box: ['cold', 'dangerous', 'dry', 'flat', 'funny', 'hot', 'important', 'large/big', 'round', 'small/little', 'sour', 'square', 'sweet', 'wet'], image: 'img/ch01/ex32.png' })),

    exercise(33, "Let's talk: game", 'Chart 1-7', 18, info(
      'Work in teams. Your teacher will ask you to name things. Your team will make a list. Share your list with the class. The group with the longest list gets a point. Close your book for this activity.',
      { text: '<p>1. hot 2. difficult 3. sweet 4. free 5. little 6. important 7. beautiful 8. expensive 9. cheap</p>' },
    )),

    exercise(34, "Let's talk: pairwork", 'Charts 1-5 → 1-7', 18, info(
      'Work with a partner. Take turns making two sentences for each picture. Use the given adjectives.',
      { text: "<p><i>Example:</i> The girl … happy/sad → The girl isn't happy. She's sad.</p><p>PARTNER A: 1. The table … clean/dirty. 2. The boy … sick/well. 3. The algebra problem … easy/difficult. 4. The cars … old/new.<br>PARTNER B: 1. The man … friendly/unfriendly. 2. The coffee … cold/hot. 3. The woman … tall/short. 4. Katie … old/young.</p>" },
    )),

    exercise(35, 'Grammar and vocabulary', 'Charts 1-5 → 1-7', 19, one('fill',
      'Complete the sentences with <b><i>is</i></b> or <b><i>are</i></b> and the correct pronoun. Use contractions. Some sentences are negative.', [
        ex(1, 'A pea ___ green. ___ red.', 'is', "It isn't"),
        ex(2, 'Carrots ___ blue. ___ orange.', "aren't", "They're"),
        f(3, 'An onion ___ orange. ___ brown, white, or green.', "isn't", "It's"),
        f(4, 'A strawberry ___ black. ___ red.', "isn't", "It's"),
        f(5, 'Bananas ___ yellow. ___ white.', 'are', "They aren't"),
        f(6, 'A banana ___ yellow. ___ white.', 'is', "It isn't"),
        f(7, 'An orange ___ orange. ___ brown.', 'is', "It isn't"),
        f(8, 'Apples ___ red or green. ___ purple.', 'are', "They aren't"),
        f(9, 'A tomato ___ blue. ___ red or green.', "isn't", "It's"),
      ], { image: 'img/ch01/ex35.png' })),

    exercise(36, "Let's talk: game", 'Charts 1-5 → 1-7', 20, info(
      '<b>Part I.</b> Check (✓) all the words you know. <b>Part II.</b> Sit in a circle. Student A makes a sentence using “I” and the first word. Student B repeats the information about Student A and makes a new sentence using the second word. Continue around the circle.',
      { text: '<p>hungry, thirsty, sleepy, tired, old, young, happy, homesick, married, single, angry, nervous, friendly, lazy, hardworking, famous, sick, healthy, friendly, shy</p>' },
    )),

    exercise(37, "Let's talk: pairwork", 'Charts 1-5 → 1-7', 20, info(
      'Work with a partner. Check (✓) each adjective that describes this city/town. When you finish, compare your work with a partner.',
      { text: '<p>big, small, clean, dirty, friendly, unfriendly, safe, dangerous, beautiful, ugly, noisy, quiet, crowded, not crowded, hot, cold, warm, cool, expensive, inexpensive/cheap</p>' },
    )),

    exercise(38, 'Warm-up', 'Chart 1-8', 21, one('choice', 'Read the sentences and choose <i>yes</i> or <i>no</i>.', [
      c(1, 'The cat is next to the mousetrap. ___', yesno, 'yes'),
      c(2, 'The mouse is under the chair. ___', yesno, 'yes'),
      c(3, 'The mouse is behind the cat. ___', yesno, 'yes'),
    ], { image: 'img/ch01/ex38.png' })),

    {
      kind: 'chart', id: '1-8', title: '<i>Be</i> + a Place',
      image: 'img/ch01/chart18.png',
      html: `
<tr><td><p>(a) Maria is ${R('<b><i>here</i></b>')}.<br>(b) Bob is ${R('<b><i>at the library</i></b>')}.</p></td>
<td><p>In (a): <i>here</i> = a place.<br>In (b): <i>at the library</i> = a place.<br><b><i>Be</i></b> is often followed by <i>a place</i>.</p></td></tr>
<tr><td><p>(c) Maria is ${R('<b><i>here. there. downstairs. upstairs. inside. outside. downtown.</i></b>')}</p></td>
<td><p>A place may be one word, as in the examples in (c).</p></td></tr>
<tr><td><p><small>PREPOSITION + NOUN</small><br>(d) Bob is ${R('<b><i>at</i></b>')} the library. / ${R('<b><i>on</i></b>')} the bus. / ${R('<b><i>in</i></b>')} his room. / ${R('<b><i>at</i></b>')} work. / ${R('<b><i>next to</i></b>')} Maria.</p></td>
<td><p>A place may be a prepositional phrase (<i>preposition + noun</i>), as in (d).</p></td></tr>
<tr><td colspan="2"><p><small>SOME COMMON PREPOSITIONS</small><br>above, at, behind, between, from, in, next to, on, under</p></td></tr>`,
    },

    exercise(39, 'Looking at grammar', 'Chart 1-8', 22, one('fill',
      'Complete each sentence with a preposition from the box.', [
        ex(1, 'The cat is ___ the desk.', 'in'),
        f(2, 'The cat is ___ the desk.', 'under'),
        f(3, 'The cat is ___ the desk.', 'on'),
        f(4, 'The cat is ___ the desk.', 'next to'),
        f(5, 'The cat is ___ the desk.', 'above'),
        f(6, 'The cat is ___ the desk.', 'behind'),
        f(7, 'The cat is ___ the desks.', 'between'),
      ], { box: ['above', 'behind', 'between', 'in', 'next to', 'on', 'under'], image: 'img/ch01/ex39.png' })),

    exercise(40, "Let's talk: pairwork", 'Chart 1-8', 23, info(
      "Work with a partner. Follow your partner's instructions.",
      { text: '<p>PARTNER A: Put your pen … 1. on your book. 2. in your hand. 3. next to your thumb. 4. under your desk.<br>PARTNER B: Put a piece of paper … 1. behind your back. 2. between two fingers. 3. next to your thumb. 4. in the air.</p>' },
    )),

    exercise(41, 'Listening', 'Charts 1-1 → 1-8', 23, info(
      'Listen to the sentences. Write the words you hear. Some answers have contractions.',
      { text: '<p><b>The First Day of Class</b></p><p>Paulo <u>is a student</u> from Brazil. Marie ___ student from France. ___ the classroom. Today ___ exciting day. ___ the first day of school, but they ___ nervous. ___ to be here. Mrs. Brown ___ the teacher. She ___ in the classroom right now. ___ late today.</p><p class="muted">Аудио не входит в MVP.</p>' },
    )),

    exercise(42, 'Reading and writing', 'Charts 1-1 → 1-8', 23, one('fill',
      'Read the paragraph. Then complete the sentences with true answers. Several answers are possible for each item.', [
        ex(1, 'Mr. Anderson is ___.', 'an English teacher, sick, etc.'),
        { n: 2, text: 'Mrs. Anderson is not ___.', answers: [[]] },
        { n: 3, text: 'Mr. and Mrs. Anderson are ___.', answers: [[]] },
        { n: 4, text: 'The students are ___.', answers: [[]] },
        { n: 5, text: 'The English class is ___.', answers: [[]] },
      ], {
        text: `<p><b>A Substitute Teacher</b></p><p>Today is Monday. It is the first day of English class. Mr. Anderson is an English teacher, but he isn't in class today. He is at home in bed. Mrs. Anderson is in the classroom today. Mrs. and Mr. Anderson are husband and wife. Mrs. Anderson is a good teacher. The students are a little nervous, but they're happy. Mrs. Anderson is very funny, and her explanations are clear. It's a good class.</p><p class="muted">Ответы по ключу: 2. sick 3. husband and wife 4. a little nervous/happy 5. good. Свободные ответы не проверяются.</p>`,
      })),

    {
      kind: 'chart', id: '1-9', title: 'Summary: Basic Sentence Patterns with <i>Be</i>',
      html: `
<tr><td><p><small>SUBJECT + BE + NOUN</small><br>(a) I am ${R('<i>a student</i>')}.</p></td>
<td><p>The noun or pronoun that comes at the beginning of a sentence is called the “subject.”</p></td></tr>
<tr><td><p><small>SUBJECT + BE + ADJECTIVE</small><br>(b) He is ${R('<i>intelligent</i>')}.</p></td>
<td><p><b><i>Be</i></b> is a “verb.” Almost all English sentences have a subject and a verb.</p></td></tr>
<tr><td><p><small>SUBJECT + BE + A PLACE</small><br>(c) We are ${R('<i>in class</i>')}.<br>(d) She is ${R('<i>upstairs</i>')}.</p></td>
<td><p>Notice in the examples: There are three basic completions for sentences that begin with a <i>subject + the verb <b>be</b></i>:</p><ul><li><i>a noun</i>, as in (a)</li><li><i>an adjective</i>, as in (b)</li><li><i>an expression of place</i>,* as in (c) and (d)</li></ul></td></tr>`,
      note: '*An expression of place can be a <i>preposition + noun</i>, or it can be one word: <i>upstairs</i>.',
    },

    exercise(43, 'Looking at grammar', 'Chart 1-9', 24, one('fill',
      'Write the form of <b><i>be</i></b> (<b><i>am, is,</i></b> or <b><i>are</i></b>) that is used in each sentence. Then write the grammar structure that follows <b><i>be</i></b> (noun, adjective, place).', [
        ex(1, "We're students. → ___ + ___", 'are', 'noun'),
        ex(2, 'Anna is in Rome. → ___ + ___', 'is', 'place'),
        ex(3, "I'm hungry. → ___ + ___", 'am', 'adjective'),
        f(4, 'Dogs are animals. → ___ + ___', 'are', 'noun'),
        f(5, 'Jack is at home. → ___ + ___', 'is', 'place'),
        f(6, "He's sick. → ___ + ___", 'is', 'adjective'),
        f(7, "They're in class. → ___ + ___", 'are', 'place'),
        f(8, "I'm a mechanic. → ___ + ___", 'am', 'noun'),
        f(9, 'Gina is upstairs. → ___ + ___', 'is', 'place'),
        f(10, 'The peas are good. → ___ + ___', 'are', 'adjective'),
        f(11, 'Dan and I are nurses. → ___ + ___', 'are', 'noun'),
        f(12, 'Nora is downstairs. → ___ + ___', 'is', 'place'),
        f(13, "We aren't homesick. → ___ + ___", ['are', "aren't", "are(n't)"], 'adjective'),
        f(14, 'They are astronauts. → ___ + ___', 'are', 'noun'),
      ])),

    exercise(44, 'Listening', 'Chapter 1', 25, info(
      "<b><i>Is</i></b> and <b><i>are</i></b> are often contracted with nouns in spoken English. Listen to the sentences. Practice saying them yourself. <i>Note:</i> <b>'s</b> and <b>'re</b> can be hard to hear.",
      { text: "<p>1. Grammar is easy. → Grammar's easy. 2. My name is Josh. 3. My books are on the table. 4. My brother is 21 years old. 5. The weather is cold today. 6. The windows are open. 7. My money is in my wallet. 8. Mr. Smith is a teacher. 9. My parents are at work now. 10. The food is good. 11. Tom is sick today. 12. My roommates are from Chicago. 13. My sister is a student in high school.</p><p class=\"muted\">Аудио не входит в MVP.</p>" },
    )),

    exercise(45, 'Looking at grammar', 'Chapter 1', 25, one('choice',
      "Choose the correct completion. (Ø = nothing)<br><i>Example:</i> My friend ___ from South Korea. a. he <b>b. 's</b> c. Ø", [
        c(1, 'The test ___ easy.', ['a. are', 'b. is', 'c. Ø'], 'b. is'),
        c(2, 'My notebook ___ on the table.', ['a. is', 'b. are', 'c. Ø'], 'a. is'),
        c(3, 'My notebooks ___ on the table.', ['a. is', 'b. are', 'c. Ø'], 'b. are'),
        c(4, 'Sue ___ a student.', ['a. is', 'b. she', 'c. Ø'], 'a. is'),
        c(5, 'The weather ___ warm today.', ['a. is', 'b. it', 'c. Ø'], 'a. is'),
        c(6, 'My friends ___ from Cuba.', ['a. are', 'b. is', 'c. Ø'], 'a. are'),
        c(7, 'My book ___ on my desk.', ['a. it', 'b. is', 'c. Ø'], 'b. is'),
        c(8, 'The teachers ___ in class.', ['a. is', 'b. are', 'c. Ø'], 'b. are'),
        c(9, 'The teacher ___ nice.', ["a. 's", 'b. are', 'c. Ø'], "a. 's"),
        c(10, 'Dinner ___ ready.', ['a. it', 'b. is', 'c. Ø'], 'b. is'),
      ])),

    exercise(46, 'Reading and writing', 'Chapter 1', 26, info(
      '<b>Part I.</b> Read the paragraph. <b>Part II.</b> Write a paragraph about Mars. <b>Part III.</b> Editing check.',
      { text: `<p><b>Venus</b></p><p>Venus is the second planet from the sun. It isn't big and it isn't small. It is between Earth and Mercury. It is an interesting planet. It is very bright at night. It is rocky and dusty. It is also hot. The temperature on Venus is 464 degrees Celsius or 867 degrees Fahrenheit.</p>
<p><i>Facts about Mars:</i> 4th (fourth) planet from the sun; small; between Earth and Jupiter; red; very rocky; very dusty; very cold (−55° C / −67° F); interesting?</p>
<p><i>Editing check:</i> capital letter at the beginning of each sentence; period at the end of each sentence; paragraph indent; a verb (<i>is</i> or <i>are</i>) in every sentence; correct spelling.</p>` },
    )),
  ],
}
