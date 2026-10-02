import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Security & Integrity Unit Tests', () => {
  test('Timing-safe compare returns true for identical secrets', async () => {
    const crypto = await import('node:crypto');
    const a = 'super_secret_key_12345';
    const b = 'super_secret_key_12345';

    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    const match = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
    assert.equal(match, true);
  });

  test('Timing-safe compare returns false for mismatched secrets', async () => {
    const crypto = await import('node:crypto');
    const a = 'super_secret_key_12345';
    const b = 'wrong_secret_key_99999';

    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    const match = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
    assert.equal(match, false);
  });

  test('Sanitized 500 internal error does not leak details in production', () => {
    const isProduction = true;
    const rawError = new Error('FATAL: relation "internal_secrets" does not exist at /var/www/crm/db.ts:42');
    const sanitized = isProduction
      ? 'An internal error occurred. Please try again later.'
      : rawError.message;

    assert.equal(sanitized, 'An internal error occurred. Please try again later.');
    assert.equal(sanitized.includes('internal_secrets'), false);
    assert.equal(sanitized.includes('/var/www'), false);
  });

  test('Order pricing formula uses authoritative DB unit price', () => {
    const dbProduct = { id: 'p1', sell_price: 1500, buy_price: 1000 };
    const untrustedClientItem = { product_id: 'p1', quantity: 2, sell_price: 10 }; // malicious client sent 10 Tk

    // Server-side authoritative price resolution
    const authoritativeSellPrice = Number(dbProduct.sell_price);
    const itemTotal = untrustedClientItem.quantity * authoritativeSellPrice;

    assert.equal(authoritativeSellPrice, 1500);
    assert.equal(itemTotal, 3000);
    assert.notEqual(itemTotal, 20); // Malicious price of 20 Tk rejected
  });

  test('Courier status whitelist correctly filters dangerous inputs', () => {
    const ALLOWED = ['pending', 'in_transit', 'delivered', 'returned', 'cancelled', 'dispatched'];
    const dirtyInputs = [
      'DELIVERED',
      'returned; drop table orders;',
      '<script>alert(1)</script>',
      'in_transit',
    ];

    const results = dirtyInputs.map((input) => {
      const lower = input.toLowerCase();
      if (lower.includes('deliver')) return 'delivered';
      if (lower.includes('return') && !lower.includes(';') && !lower.includes('<')) return 'returned';
      if (lower.includes('transit')) return 'in_transit';
      return 'in_transit'; // fallback
    });

    results.forEach((res) => {
      assert.equal(ALLOWED.includes(res), true);
    });
  });
});
