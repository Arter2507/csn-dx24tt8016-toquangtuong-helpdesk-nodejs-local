import { readFileSync } from 'node:fs';

const rules = JSON.parse(readFileSync(new URL('./priority-rules.json', import.meta.url), 'utf8'));

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replaceAll('đ', 'd')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const compiled = rules.map(({ priority, phrases }) => ({
  priority,
  phrases: phrases.map(phrase => ' ' + normalize(phrase) + ' '),
}));

export function estimatePriority({ title, description }) {
  const fields = [title, description].map(text => ' ' + normalize(text) + ' ');
  return compiled.find(rule =>
    rule.phrases.some(phrase => fields.some(field => field.includes(phrase))),
  )?.priority ?? 'MEDIUM';
}
