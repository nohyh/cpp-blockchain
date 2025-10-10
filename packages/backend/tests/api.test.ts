import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/server.js';
import { resetStateForTests, treasuryInfo } from '../src/blockchain/state.js';

describe('Blockchain API', () => {
  beforeEach(() => {
    resetStateForTests();
  });

  it('manages users, transactions, and mining flow', async () => {
    const app = createApp();

    const usersResponse = await request(app).get('/api/users');
    expect(usersResponse.status).toBe(200);
    expect(usersResponse.body.users).toHaveLength(1);
    expect(usersResponse.body.users[0].name).toBe('Treasury');

    const createUserResponse = await request(app).post('/api/users').send({ name: 'Alice' });
    expect(createUserResponse.status).toBe(201);
    const alice = createUserResponse.body.user;
    expect(alice.name).toBe('Alice');

    const pendingAfterCreate = await request(app).get('/api/transactions/pending');
    expect(pendingAfterCreate.status).toBe(200);
    expect(pendingAfterCreate.body.transactions.length).toBeGreaterThan(0);

    const treasury = treasuryInfo();
    const mineResponse = await request(app).post('/api/mine').send({ minerId: treasury.id });
    expect(mineResponse.status).toBe(200);
    expect(mineResponse.body.transactions.length).toBeGreaterThan(0);

    const blockchainResponse = await request(app).get('/api/blockchain');
    expect(blockchainResponse.status).toBe(200);
    expect(blockchainResponse.body.height).toBeGreaterThan(0);

    const createBobResponse = await request(app).post('/api/users').send({ name: 'Bob', initialCredit: '0' });
    expect(createBobResponse.status).toBe(201);
    const bob = createBobResponse.body.user;

    const paymentResponse = await request(app)
      .post('/api/transactions')
      .send({ senderId: alice.id, recipientId: bob.id, amount: '3' });
    expect(paymentResponse.status).toBe(201);
    expect(paymentResponse.body.transaction.outputs.some((output: { address: string }) => output.address === bob.address)).toBe(true);

    const pendingAfterPayment = await request(app).get('/api/transactions/pending');
    expect(pendingAfterPayment.status).toBe(200);
    expect(pendingAfterPayment.body.transactions.length).toBeGreaterThan(0);
  });
});