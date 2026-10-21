import { describe, expect, it } from 'vitest';
import { calculateFinalPrice, calculateTaxAmount } from './price-calculator';

const taxes = [
  { rate: 20, is_percentage: true, applies_to: 'all', is_active: true, name: 'TVA' },
  { rate: 2, is_percentage: false, applies_to: 'Auto', is_active: true, name: 'Eco' },
  { rate: 99, is_percentage: true, applies_to: 'Moto', is_active: false, name: 'off' },
];

describe('calculateFinalPrice', () => {
  it('applies active matching taxes only', () => {
    expect(calculateFinalPrice(100, 'Auto', taxes)).toBe(122);
    expect(calculateFinalPrice(100, 'Moto', taxes)).toBe(120);
  });

  it('ignores inactive taxes and unknown categories still get "all"', () => {
    expect(calculateFinalPrice(50, 'Camion', taxes)).toBe(60);
  });
});

describe('calculateTaxAmount', () => {
  it('returns a breakdown', () => {
    const { total, breakdown } = calculateTaxAmount(100, 'Auto', taxes);
    expect(total).toBe(22);
    expect(breakdown.map((b) => b.name)).toEqual(['TVA', 'Eco']);
  });
});
