import express from 'express';
import { z } from 'zod';
import {
  createUser,
  getBlockchainView,
  getPendingTransactions,
  getUserAddress,
  listUsers,
  mineNextBlock,
  submitPayment,
  treasuryInfo,
  getUser
} from '../blockchain/state.js';
import {
  serializeBlock,
  serializePendingTransaction,
  serializeTransaction,
  serializeUser
} from './serializers.js';
import { parseAmount } from '../utils/amount.js';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  initialCredit: z.string().optional()
});

const createTransactionSchema = z
  .object({
    senderId: z.string().min(1, 'Sender is required.'),
    recipientId: z.string().optional(),
    recipientAddress: z.string().optional(),
    amount: z.string().min(1, 'Amount is required.')
  })
  .refine((value) => !!value.recipientId || !!value.recipientAddress, {
    message: 'Recipient ID or address must be provided.',
    path: ['recipient']
  });

const mineSchema = z.object({
  minerId: z.string().min(1, 'Miner ID is required.')
});

export function createApiRouter(): express.Router {
  const router = express.Router();

  router.get('/users', (_req, res) => {
    const users = listUsers().map(serializeUser);
    res.json({ users });
  });

  router.post('/users', (req, res, next) => {
    try {
      const body = createUserSchema.parse(req.body);
      const initialCredit = body.initialCredit ? parseAmount(body.initialCredit) : undefined;
      const user = initialCredit !== undefined ? createUser(body.name, initialCredit) : createUser(body.name);
      res.status(201).json({ user: serializeUser(user) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/users/:id', (req, res, next) => {
    try {
      const user = getUser(req.params.id);
      if (!user) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }
      res.json({ user: serializeUser(user) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/treasury', (_req, res) => {
    res.json({ treasury: serializeUser(treasuryInfo()) });
  });

  router.post('/transactions', (req, res, next) => {
    try {
      const body = createTransactionSchema.parse(req.body);
      let recipientAddress = body.recipientAddress ?? null;
      if (!recipientAddress && body.recipientId) {
        recipientAddress = getUserAddress(body.recipientId) ?? null;
        if (!recipientAddress) {
          res.status(404).json({ message: 'Recipient not found.' });
          return;
        }
      }
      if (!recipientAddress) {
        res.status(400).json({ message: 'Recipient address could not be determined.' });
        return;
      }
      const transaction = submitPayment(body.senderId, recipientAddress, body.amount);
      res.status(201).json({ transaction: serializeTransaction(transaction) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/transactions/pending', (_req, res) => {
    const transactions = getPendingTransactions().map(serializePendingTransaction);
    res.json({ transactions });
  });

  router.post('/mine', (req, res, next) => {
    try {
      const body = mineSchema.parse(req.body);
      const result = mineNextBlock(body.minerId);
      res.json({
        reward: result.reward,
        transactions: result.block.map(serializeTransaction)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/blockchain', (_req, res) => {
    const view = getBlockchainView();
    res.json({
      height: view.height,
      difficulty: view.difficulty,
      blocks: view.blocks.map(serializeBlock)
    });
  });

  return router;
}