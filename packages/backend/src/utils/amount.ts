import { NOCOIN } from '../blockchain/crypto.js';

export function parseAmount(amount: string): bigint {
    if (!/^\d+(\.\d{0,9})?$/.test(amount.trim())) {
        throw new Error('Amount must be a non-negative number with up to 9 decimal places.');
    }
    const [wholePart, fractionalPart = ''] = amount.split('.');
    const paddedFraction = (fractionalPart + '0'.repeat(9)).slice(0, 9);
    return BigInt(wholePart) * NOCOIN + BigInt(paddedFraction);
}

export function amountToNumber(amount: bigint): number {
    return Number(amount) / Number(NOCOIN);
}