// Checks the Descida's fish-story banks (`// @historia-start` … `// @historia-end` in descida/index.html):
// sizes, PT/EN alignment, pieces that join cleanly with any other, and the no-repeat draw.
// Run `node tools/historia-check.mjs` after editing any bank; it exits 1 and lists what is wrong.
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const page = read('../descida/index.html'), lib = read('../index.html');
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error(`${a} not found`); return s.slice(i, j); };
const fn = name => lib.split('\n').find(l => l.startsWith(`function ${name}(`));
const { STORY, fishStory } = new Function(`${fn('seedFrom')}\n${fn('mulberry')}\n${between(page, '// @historia-start', '// @historia-end')};return {STORY,fishStory}`)();

const bad = [], check = (ok, msg) => ok || bad.push(msg);
const SIZE = { open: 40, beast: 40, escape: 40, excuse: 40, boast: 20 };
for (const [k, n] of Object.entries(SIZE)) for (const lang of ['pt', 'en']) {
  const b = STORY[k]?.[lang] || [];
  check(b.length === n, `${k}.${lang}: ${b.length} items, want ${n}`);
  check(new Set(b).size === b.length, `${k}.${lang}: duplicate item`);
  b.forEach((s, i) => {
    const at = `${k}.${lang}[${i}] "${s}"`;
    check(s === s.trim() && !/\s{2}/.test(s), `${at}: stray space`);
    if (k === 'open') check(!/[.,:;!?]$/.test(s), `${at}: must not end in punctuation`);
    if (k === 'beast') check(/^(um|uma|a|an) /.test(s) && /\.$/.test(s), `${at}: must start with an article and end in "."`);
    if (k === 'escape') check(!/\b(ele|ela|he|she|him|her)\b/i.test(s), `${at}: gendered pronoun`);
    if (k === 'boast') check(s.includes('{cm}'), `${at}: missing {cm}`);
  });
}

const longest = ['open', 'beast', 'escape', 'excuse'].map(k => Math.max(...STORY[k].pt.concat(STORY[k].en).map(s => s.length)));
check(longest.reduce((a, b) => a + b + 1, 0) <= 280, `longest story ${longest.reduce((a, b) => a + b + 1, 0)} chars, want ≤ 280`);

for (const player of ['a', 'b', '']) {
  const stories = [];
  for (let n = 1; n <= 400; n++) {
    const s = fishStory({ n, player, en: false, caught: false });
    check(s === fishStory({ n, player, en: false, caught: false }), `player "${player}" day ${n}: not stable`);
    stories.push(s);
  }
  check(new Set(stories).size === stories.length, `player "${player}": a whole story repeats within 400 days`);
  for (const k of ['open', 'beast', 'escape', 'excuse']) {
    const idx = stories.map(s => s.split('\n').join(' ')).map(s => STORY[k].pt.findIndex(x => s.includes(x)));
    for (let c = 0; c * 40 + 40 <= 401; c++) {
      const cycle = idx.slice(Math.max(0, c * 40 - 1), c * 40 + 39);
      check(new Set(cycle).size === cycle.length, `player "${player}" ${k} cycle ${c}: a piece repeats inside the cycle`);
    }
  }
}
const day10 = new Set(['a', 'b', 'c', 'd', 'e'].map(player => fishStory({ n: 10, player, en: false, caught: false })));
check(day10.size > 1, 'five players got the same story on day 10');
const en = fishStory({ n: 3, player: 'a', en: true, caught: false }), pt = fishStory({ n: 3, player: 'a', en: false, caught: false });
const pos = (s, lang) => ['open', 'beast', 'escape', 'excuse'].map(k => STORY[k][lang].findIndex(x => s.includes(x))).join();
check(pos(en, 'en') === pos(pt, 'pt'), 'English story not at the same positions as the Portuguese one');
check(fishStory({ n: 3, player: 'a', en: false, caught: true, cm: 84 }).includes('84'), 'boast does not show the size');

if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log('ok');
