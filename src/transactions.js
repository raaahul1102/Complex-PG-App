const { pool } = require('./db');

async function transactionalOrder({ userId, productId, quantity }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the product row to check and decrement stock safely
    const { rows: prodRows } = await client.query(
      'SELECT id, stock FROM products WHERE id = $1 FOR UPDATE',
      [Number(productId)]
    );
    if (prodRows.length === 0) throw new Error('Product not found');
    if (prodRows.stock < Number(quantity)) throw new Error('Insufficient stock');

    await client.query(
      'INSERT INTO orders (user_id, product_id, quantity) VALUES ($1, $2, $3)',
      [Number(userId), Number(productId), Number(quantity)]
    );

    const { rowCount: updated } = await client.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2',
      [Number(quantity), Number(productId)]
    );
    if (updated !== 1) throw new Error('Stock update failed');

    await client.query('COMMIT');
    return { success: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { transactionalOrder };
