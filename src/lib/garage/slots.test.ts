import { describe, expect, it } from 'vitest';
import { DEFAULT_OPENING_HOURS, isSlotTaken, slotsForDay } from './slots';

describe('slotsForDay', () => {
  it('generates weekday slots and none on Sunday', () => {
    const monday = slotsForDay('2026-10-19', DEFAULT_OPENING_HOURS, 60);
    expect(monday[0]).toBe('08:00');
    expect(monday).toContain('13:30');
    expect(monday).not.toContain('18:00');
    expect(slotsForDay('2026-10-18', DEFAULT_OPENING_HOURS, 60)).toEqual([]);
  });
});

describe('isSlotTaken', () => {
  it('respects daily capacity and exact time', () => {
    expect(isSlotTaken('09:00', ['09:00'], 8, 1)).toBe(true);
    expect(isSlotTaken('10:00', ['09:00'], 8, 1)).toBe(false);
    expect(isSlotTaken('10:00', [], 2, 2)).toBe(true);
  });
});
