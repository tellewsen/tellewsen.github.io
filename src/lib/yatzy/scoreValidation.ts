// scoreValidation.ts — pure functions validating a manually-entered category
// score against real Yatzy scoring rules (not just "is a non-negative
// number"). Each achievable-value set is computed directly from dice-face
// combinatorics, not hardcoded, so it can't drift out of sync with the
// actual rules.
import { UPPER_CATEGORY_COUNT } from "./state";

export const CatOnePair = 6;
export const CatTwoPairs = 7;
export const CatThreeKind = 8;
export const CatFourKind = 9;
export const CatSmallStraight = 10;
export const CatLargeStraight = 11;
export const CatFullHouse = 12;
export const CatChance = 13;
export const CatYatzy = 14;

function achievableNOfAKind(count: number): Set<number> {
  const values = new Set<number>([0]);
  for (let face = 1; face <= 6; face++) values.add(count * face);
  return values;
}

function achievableTwoPairs(): Set<number> {
  const values = new Set<number>([0]);
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      if (a !== b) values.add(2 * (a + b));
    }
  }
  return values;
}

function achievableFullHouse(): Set<number> {
  const values = new Set<number>([0]);
  for (let triple = 1; triple <= 6; triple++) {
    for (let pair = 1; pair <= 6; pair++) {
      if (triple !== pair) values.add(3 * triple + 2 * pair);
    }
  }
  return values;
}

export function isValidScore(category: number, score: number): boolean {
  if (!Number.isInteger(score) || score < 0) return false;
  if (category < UPPER_CATEGORY_COUNT) {
    const face = category + 1;
    return score % face === 0 && score >= 0 && score <= 5 * face;
  }
  switch (category) {
    case CatOnePair: return achievableNOfAKind(2).has(score);
    case CatTwoPairs: return achievableTwoPairs().has(score);
    case CatThreeKind: return achievableNOfAKind(3).has(score);
    case CatFourKind: return achievableNOfAKind(4).has(score);
    case CatSmallStraight: return score === 0 || score === 15;
    case CatLargeStraight: return score === 0 || score === 20;
    case CatFullHouse: return achievableFullHouse().has(score);
    case CatChance: return score >= 5 && score <= 30;
    case CatYatzy: return score === 0 || score === 50;
    default: return false;
  }
}
