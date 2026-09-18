import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanEmail, isValidEmail, isValidCode } from '../lib/auth-validation.js';

test('email validation accepts normalized addresses without changing mailbox identity', () => {
  assert.equal(cleanEmail(' Alice+Demo@Example.COM '), 'alice+demo@example.com');
  for (const email of [' Alice+Demo@Example.COM ', 'a.b@sub.example.com', 'a@x.io', "o'brien@example.com", `${'a'.repeat(64)}@example.com`]) {
    assert.equal(isValidEmail(email), true, email);
  }
});

test('email validation rejects malformed local parts, domains and oversized addresses', () => {
  for (const email of [null, 123, '', '  ', 'alice', 'a@localhost', 'a@@example.com', '.a@example.com', 'a.@example.com', 'a..b@example.com',
    'a b@example.com', 'a@-example.com', 'a@example-.com', 'a@bad..com', 'a@bad_domain.com', 'a@例子.com', 'a\r\nbcc:b@example.com',
    `${'a'.repeat(65)}@example.com`, `a@${'b'.repeat(64)}.com`, `a@${('b'.repeat(63) + '.').repeat(4)}com`]) {
    assert.equal(isValidEmail(email), false, String(email));
  }
});

test('codes require exactly six ASCII digits and preserve leading zeroes', () => {
  for (const code of ['000001', '000000', '123456', '999999']) assert.equal(isValidCode(code), true);
  for (const code of [null, 123456, '', '12345', '1234567', '12345a', '１２３４５６', '123 456', '123456\n']) assert.equal(isValidCode(code), false);
});
