import { describe, it, expect } from 'vitest';
import { ARABIC_LETTERS, getLetter, getLetterWithForms } from '../data/letters.js';
import {
  CONNECTED_FORMS,
  getConnectedForms,
  doesLetterJoin,
  getBreakerIds,
} from '../data/connectedForms.js';

// ─── CONNECTED_FORMS completeness ────────────────────────────────────────────

describe('CONNECTED_FORMS — completeness', () => {
  it('has an entry for every letter in ARABIC_LETTERS', () => {
    for (const letter of ARABIC_LETTERS) {
      expect(CONNECTED_FORMS[letter.id], `Missing entry for id:${letter.id} (${letter.name})`).toBeDefined();
    }
  });

  it('every entry has all 4 positional form fields (isolated, initial, medial, final)', () => {
    for (const [id, entry] of Object.entries(CONNECTED_FORMS)) {
      const { forms } = entry;
      expect(forms, `No forms object for id:${id}`).toBeDefined();
      expect(typeof forms.isolated, `id:${id} isolated`).toBe('string');
      expect(typeof forms.initial,  `id:${id} initial`).toBe('string');
      expect(typeof forms.medial,   `id:${id} medial`).toBe('string');
      expect(typeof forms.final,    `id:${id} final`).toBe('string');
      expect(forms.isolated.length).toBeGreaterThan(0);
      expect(forms.initial.length).toBeGreaterThan(0);
      expect(forms.medial.length).toBeGreaterThan(0);
      expect(forms.final.length).toBeGreaterThan(0);
    }
  });

  it('every entry has a boolean joins field', () => {
    for (const [id, entry] of Object.entries(CONNECTED_FORMS)) {
      expect(typeof entry.joins, `id:${id} joins is not boolean`).toBe('boolean');
    }
  });
});

// ─── Non-connectors ──────────────────────────────────────────────────────────

describe('CONNECTED_FORMS — non-connectors', () => {
  const NON_CONNECTOR_IDS = [1, 8, 9, 10, 11, 27];

  it('exactly 6 letters are non-connectors', () => {
    const breakers = getBreakerIds();
    expect(breakers).toHaveLength(6);
  });

  it('non-connector IDs are [1, 8, 9, 10, 11, 27]', () => {
    expect(getBreakerIds()).toEqual(NON_CONNECTOR_IDS);
  });

  it('exactly 22 letters are connectors', () => {
    const connectors = Object.values(CONNECTED_FORMS).filter(e => e.joins);
    expect(connectors).toHaveLength(22);
  });

  it.each(NON_CONNECTOR_IDS)('id:%i has joins=false', (id) => {
    expect(CONNECTED_FORMS[id].joins).toBe(false);
  });

  it('all other letters (connectors) have joins=true', () => {
    for (const [id, entry] of Object.entries(CONNECTED_FORMS)) {
      if (!NON_CONNECTOR_IDS.includes(Number(id))) {
        expect(entry.joins, `id:${id} should be a connector`).toBe(true);
      }
    }
  });
});

// ─── Isolated form matches ARABIC_LETTERS ────────────────────────────────────

describe('CONNECTED_FORMS — isolated form matches ARABIC_LETTERS', () => {
  it('isolated form matches the letter field for every entry', () => {
    for (const letter of ARABIC_LETTERS) {
      const cf = CONNECTED_FORMS[letter.id];
      expect(cf, `No connected form for id:${letter.id}`).toBeDefined();
      expect(cf.forms.isolated).toBe(letter.letter);
    }
  });
});

// ─── getLetter integration ────────────────────────────────────────────────────

describe('getLetter — connected form integration', () => {
  it('returns forms and joins for Ba (id:2)', () => {
    const ba = getLetter(2);
    expect(ba).toBeDefined();
    expect(ba.joins).toBe(true);
    expect(ba.forms).toBeDefined();
    expect(ba.forms.isolated).toBe('\u0628');
    expect(ba.forms.initial).toBe('\uFE91');
    expect(ba.forms.medial).toBe('\uFE92');
    expect(ba.forms.final).toBe('\uFE90');
  });

  it('returns joins=false for Alif (id:1)', () => {
    const alif = getLetter(1);
    expect(alif).toBeDefined();
    expect(alif.joins).toBe(false);
    expect(alif.forms.isolated).toBe('\u0627');
    expect(alif.forms.final).toBe('\uFE8E');
  });

  it('returns undefined for an invalid id', () => {
    expect(getLetter(0)).toBeUndefined();
    expect(getLetter(99)).toBeUndefined();
    expect(getLetter(-1)).toBeUndefined();
  });

  it('preserves all original letter fields', () => {
    const ba = getLetter(2);
    expect(ba.name).toBe('Ba');
    expect(ba.transliteration).toBe('b');
    expect(ba.dots).toBe(1);
    expect(ba.family).toBe('ba');
  });
});

// ─── getLetterWithForms alias ─────────────────────────────────────────────────

describe('getLetterWithForms', () => {
  it('returns the same result as getLetter for a valid id', () => {
    expect(getLetterWithForms(2)).toEqual(getLetter(2));
    expect(getLetterWithForms(1)).toEqual(getLetter(1));
    expect(getLetterWithForms(28)).toEqual(getLetter(28));
  });

  it('returns undefined for an invalid id', () => {
    expect(getLetterWithForms(99)).toBeUndefined();
  });
});

// ─── getConnectedForms helper ─────────────────────────────────────────────────

describe('getConnectedForms', () => {
  it('returns form data for a valid id', () => {
    const data = getConnectedForms(2);
    expect(data).not.toBeNull();
    expect(data.joins).toBe(true);
    expect(data.forms.isolated).toBe('\u0628');
  });

  it('returns null for an invalid id', () => {
    expect(getConnectedForms(0)).toBeNull();
    expect(getConnectedForms(99)).toBeNull();
    expect(getConnectedForms(-5)).toBeNull();
  });
});

// ─── doesLetterJoin helper ────────────────────────────────────────────────────

describe('doesLetterJoin', () => {
  it('returns true for Ba (id:2)', () => {
    expect(doesLetterJoin(2)).toBe(true);
  });

  it('returns false for Alif (id:1)', () => {
    expect(doesLetterJoin(1)).toBe(false);
  });

  it('returns false for Daal (id:8)', () => {
    expect(doesLetterJoin(8)).toBe(false);
  });

  it('returns false for Waw (id:27)', () => {
    expect(doesLetterJoin(27)).toBe(false);
  });

  it('returns true for Ya (id:28)', () => {
    expect(doesLetterJoin(28)).toBe(true);
  });

  it('returns false for unknown id', () => {
    expect(doesLetterJoin(0)).toBe(false);
    expect(doesLetterJoin(99)).toBe(false);
  });
});

// ─── getBreakerIds helper ─────────────────────────────────────────────────────

describe('getBreakerIds', () => {
  it('returns a sorted array', () => {
    const ids = getBreakerIds();
    const sorted = [...ids].sort((a, b) => a - b);
    expect(ids).toEqual(sorted);
  });

  it('returns exactly [1, 8, 9, 10, 11, 27]', () => {
    expect(getBreakerIds()).toEqual([1, 8, 9, 10, 11, 27]);
  });
});
