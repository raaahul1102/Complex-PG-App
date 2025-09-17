require('dotenv').config();
const express = require('express');
const { crossJoinRecommendations, highValueUsers, topProductPerUser } = require('./queries');
const { transactionalOrder } = require('./transactions');
const { exportToCsv } = require('./csv');

const app = express();
app.use(express.json());

app.get('/queries/cross-join', async (req, res) => {
  try {
    const minPrice = Number(req.query.minPrice || 50);
    const limit = Number(req.query.limit || 20);
    const offset = Number(req.query.offset || 0);
    const nameLike = req.query.nameLike || '';
    const results = await crossJoinRecommendations({ minPrice, limit, offset, nameLike });
    
    if (req.query.export === '1') {
      const file = await exportToCsv(results.data, 'cross_join.csv');
      return res.json({ 
        exported: file, 
        rowsExported: results.data.length,
        pagination: results.pagination 
      });
    }
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/queries/high-value-users', async (req, res) => {
  try {
    const minTotal = Number(req.query.minTotal || 1000);
    const results = await highValueUsers({ minTotal });
    
    if (req.query.export === '1') {
      const file = await exportToCsv(results.data, 'high_value_users.csv');
      return res.json({ 
        exported: file, 
        rowsExported: results.data.length,
        pagination: results.pagination 
      });
    }
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/queries/top-products/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const results = await topProductPerUser({ userId });
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/orders/transactional', async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;
    const out = await transactionalOrder({ userId, productId, quantity });
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
