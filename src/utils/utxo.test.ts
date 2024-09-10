import { describe, expect, it } from "@jest/globals";
import { TokenSelectionStrategy, type TokenUtxo } from '../types'
import { selectTokenUtxos } from './utxo';

describe('selectTokenUtxos', () => {
  const mockUtxos: TokenUtxo[] = [
    { amt: '100', id: 'token1', satoshis: 1, txid: 'tx1', vout: 0, script: 'script1' },
    { amt: '200', id: 'token1', satoshis: 1, txid: 'tx2', vout: 1, script: 'script2' },
    { amt: '300', id: 'token1', satoshis: 1, txid: 'tx3', vout: 2, script: 'script3' },
    { amt: '400', id: 'token1', satoshis: 1, txid: 'tx4', vout: 3, script: 'script4' },
    { amt: '500', id: 'token1', satoshis: 1, txid: 'tx5', vout: 4, script: 'script5' },
  ];

  it('should select UTXOs with RetainOrder strategy for input and output (default)', () => {
    const result = selectTokenUtxos(mockUtxos, 5.5, 2);
    expect(result.selectedUtxos).toEqual(mockUtxos.slice(0, 3));
    expect(result.totalSelected).toBe(6);
    expect(result.isEnough).toBe(true);
  });

  it('should sort output UTXOs with SmallestFirst output strategy', () => {
    const result = selectTokenUtxos(mockUtxos, 10, 2, { outputStrategy: TokenSelectionStrategy.SmallestFirst });
    expect(result.selectedUtxos.map(u => u.amt)).toEqual(['100', '200', '300', '400']);
    expect(result.totalSelected).toBe(10);
    expect(result.isEnough).toBe(true);
  });

  it('should sort output UTXOs with LargestFirst output strategy', () => {
    const result = selectTokenUtxos(mockUtxos, 10, 2, { outputStrategy: TokenSelectionStrategy.LargestFirst });
    expect(result.selectedUtxos.map(u => u.amt)).toEqual(['400', '300', '200', '100']);
    expect(result.totalSelected).toBe(10);
    expect(result.isEnough).toBe(true);
  });
  
  it('should sort output UTXOs with SmallestFirst output strategy', () => {
    const result = selectTokenUtxos(mockUtxos, 10, 2, { outputStrategy: TokenSelectionStrategy.SmallestFirst });
    expect(result.selectedUtxos.map(u => u.amt)).toEqual(['100', '200', '300', '400']);
    expect(result.totalSelected).toBe(10);
    expect(result.isEnough).toBe(true);
  });

  it('should sort output UTXOs with LargestFirst input strategy', () => {
    const result = selectTokenUtxos(mockUtxos, 10, 2, { inputStrategy: TokenSelectionStrategy.LargestFirst });
    expect(result.selectedUtxos.map(u => u.amt)).toEqual(['500', '400', '300']);
    expect(result.totalSelected).toBe(12);
    expect(result.isEnough).toBe(true);
  });

  it('should handle case when not enough UTXOs are available', () => {
    const result = selectTokenUtxos(mockUtxos, 20, 2);
    expect(result.selectedUtxos).toEqual(mockUtxos);
    expect(result.totalSelected).toBe(15);
    expect(result.isEnough).toBe(false);
  });

  it('should handle empty UTXO array', () => {
    const result = selectTokenUtxos([], 5, 2);
    expect(result.selectedUtxos).toEqual([]);
    expect(result.totalSelected).toBe(0);
    expect(result.isEnough).toBe(false);
  });

  it('should handle zero required amount', () => {
    const result = selectTokenUtxos(mockUtxos, 0, 2);
    expect(result.selectedUtxos).toEqual(mockUtxos);
    expect(result.totalSelected).toBe(15);
    expect(result.isEnough).toBe(true);
  });

  it('should handle different decimal places', () => {
    const result = selectTokenUtxos(mockUtxos, 0.000003, 6);
    expect(result.selectedUtxos).toEqual([mockUtxos[0]]);
    expect(result.totalSelected).toBe(0.0001);
    expect(result.isEnough).toBe(true);
  });

  it('should handle Random input strategy', () => {
    const result = selectTokenUtxos(mockUtxos, 5.5, 2, { inputStrategy: TokenSelectionStrategy.Random });
    expect(result.selectedUtxos.length).toBeGreaterThan(0);
    expect(result.totalSelected).toBeGreaterThanOrEqual(5.5);
    expect(result.isEnough).toBe(true);
  });

  it('should handle Random output strategy', () => {
    const result = selectTokenUtxos(mockUtxos, 10, 2, { outputStrategy: TokenSelectionStrategy.Random });
    expect(result.selectedUtxos.length).toBe(4);
    expect(result.totalSelected).toBe(10);
    expect(result.isEnough).toBe(true);
  });

  it('should use SmallestFirst input strategy and LargestFirst output strategy', () => {
    const result = selectTokenUtxos(mockUtxos, 6, 2, {
      inputStrategy: TokenSelectionStrategy.SmallestFirst,
      outputStrategy: TokenSelectionStrategy.LargestFirst
    });
    expect(result.selectedUtxos.map(u => u.amt)).toEqual(['300', '200', '100']);
    expect(result.totalSelected).toBe(6);
    expect(result.isEnough).toBe(true);
  });
  
  it('should use LargestFirst input strategy and SmallestFirst output strategy', () => {
    const result = selectTokenUtxos(mockUtxos, 7, 2, {
      inputStrategy: TokenSelectionStrategy.LargestFirst,
      outputStrategy: TokenSelectionStrategy.SmallestFirst
    });
    expect(result.selectedUtxos.map(u => u.amt)).toEqual(['400', '500']);
    expect(result.totalSelected).toBe(9);
    expect(result.isEnough).toBe(true);
  });
  
  it('should use Random input strategy and LargestFirst output strategy', () => {
    const result = selectTokenUtxos(mockUtxos, 7, 2, {
      inputStrategy: TokenSelectionStrategy.Random,
      outputStrategy: TokenSelectionStrategy.LargestFirst
    });
    expect(result.selectedUtxos.length).toBeGreaterThan(0);
    expect(result.totalSelected).toBeGreaterThanOrEqual(7);
    expect(result.isEnough).toBe(true);
    expect(result.selectedUtxos).toEqual(result.selectedUtxos.sort((a, b) => Number(BigInt(b.amt) - BigInt(a.amt))));
  });
  
  it('should use SmallestFirst input strategy and Random output strategy', () => {
    const result = selectTokenUtxos(mockUtxos, 7, 2, {
      inputStrategy: TokenSelectionStrategy.SmallestFirst,
      outputStrategy: TokenSelectionStrategy.Random
    });
    const inputOrder = ['100', '200', '300', '400'];
    expect(result.selectedUtxos.map(u => u.amt)).toEqual(expect.arrayContaining(inputOrder));
    expect(result.totalSelected).toBe(10);
    expect(result.isEnough).toBe(true);
  });
  
  it('should handle edge case with SmallestFirst input and LargestFirst output when exact amount is reached', () => {
    const result = selectTokenUtxos(mockUtxos, 6, 2, {
      inputStrategy: TokenSelectionStrategy.SmallestFirst,
      outputStrategy: TokenSelectionStrategy.LargestFirst
    });
    expect(result.selectedUtxos.map(u => u.amt)).toEqual(['300', '200', '100']);
    expect(result.totalSelected).toBe(6);
    expect(result.isEnough).toBe(true);
  });
});