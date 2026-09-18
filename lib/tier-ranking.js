import { LOGO_STICKERS, getAiSticker } from './ai-stickers.js';
import { TIERS, MAX_STICKERS } from './tier-board.js';

export const TIER_SCORES = Object.freeze({ s: 2, a: 1, b: 0, c: -1, d: -2 });
export const isModelCard = id => !!getAiSticker(id) && id !== 'yungu404-v1';

export function boardVotes(board) {
  return board.stickers.filter(s => s.type === 'ai' && isModelCard(s.presetId) && TIERS.includes(s.zone))
    .map(s => ({ cardId: s.presetId, score: TIER_SCORES[s.zone] }));
}

export function normalizeVotes(value) {
  if (!value || !Array.isArray(value.votes) || value.votes.length > MAX_STICKERS) throw new Error('invalid_votes');
  const seen = new Set();
  return value.votes.map(vote => {
    if (!vote || !isModelCard(vote.cardId) || seen.has(vote.cardId) ||
        !Number.isInteger(vote.score) || vote.score < -2 || vote.score > 2) throw new Error('invalid_votes');
    seen.add(vote.cardId);
    return { cardId: vote.cardId, score: vote.score };
  });
}

export function rankModels(rows) {
  const cards = new Map(LOGO_STICKERS.filter(card => isModelCard(card.id)).map(card => [card.id, {
    cardId: card.id, name: card.text, votes: 0, total: 0, average: null,
    distribution: { '2': 0, '1': 0, '0': 0, '-1': 0, '-2': 0 }, rank: null,
  }]));
  for (const row of rows) {
    if (!isModelCard(row.card_id)) continue;
    if (!cards.has(row.card_id)) cards.set(row.card_id, {
      cardId: row.card_id, name: getAiSticker(row.card_id).text, votes: 0, total: 0, average: null,
      distribution: { '2': 0, '1': 0, '0': 0, '-1': 0, '-2': 0 }, rank: null,
    });
    const card = cards.get(row.card_id);
    card.votes += row.count;
    card.total += row.score * row.count;
    card.distribution[row.score] = row.count;
    card.average = card.total / card.votes;
  }
  const ranked = [...cards.values()].sort((a, b) =>
    (b.votes > 0) - (a.votes > 0) || (b.average ?? 0) - (a.average ?? 0) || a.cardId.localeCompare(b.cardId));
  ranked.forEach((card, index) => {
    if (card.votes) card.rank = index && card.total * ranked[index - 1].votes === ranked[index - 1].total * card.votes
      ? ranked[index - 1].rank : index + 1;
  });
  return ranked;
}
