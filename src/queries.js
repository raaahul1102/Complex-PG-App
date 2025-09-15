const { pool } = require('./db');

// CROSS JOIN users x products with optional filters + pagination
async function crossJoinRecommendations({ minPrice = 0, limit = 10, offset = 0, nameLike }) {
  let idx = 1;
  const params = [];
  const where = [];

  params.push(Number(minPrice)); // $1
  where.push(`p.price > $${idx++}`);

  if (nameLike && String(nameLike).trim().length > 0) {
    params.push(`%${nameLike}%`); // $2
    where.push(`(u.name ILIKE $${idx} OR p.name ILIKE $${idx})`);
    idx++;
  }

  params.push(Number(limit));
  const limitParam = idx++;
  params.push(Number(offset));
  const offsetParam = idx++;

  const sql = `
    SELECT u.id AS user_id, u.name AS user_name, p.id AS product_id, p.name AS product_name, p.price
    FROM users u
    CROSS JOIN products p
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY u.id, p.id
    LIMIT $${limitParam} OFFSET $${offsetParam};
  `;

  const { rows } = await pool.query(sql, params);
  return rows;
}

// GROUP BY + HAVING: users with total order value > minTotal
async function highValueUsers({ minTotal = 1000 }) {
  const sql = `
    SELECT u.id, u.name, ROUND(SUM(o.quantity * p.price)::numeric, 2) AS total_value
    FROM users u
    JOIN orders o ON o.user_id = u.id
    JOIN products p ON p.id = o.product_id
    GROUP BY u.id, u.name
    HAVING SUM(o.quantity * p.price) > $1
    ORDER BY total_value DESC;
  `;
  const { rows } = await pool.query(sql, [Number(minTotal)]);
  return rows;
}

// Top-selling product per user via subquery + window function
async function topProductPerUser({ userId }) {
  const sql = `
    WITH ranked AS (
      SELECT
        o.user_id,
        o.product_id,
        SUM(o.quantity) AS total_quantity,
        ROW_NUMBER() OVER (PARTITION BY o.user_id ORDER BY SUM(o.quantity) DESC) AS rn
      FROM orders o
      GROUP BY o.user_id, o.product_id
    )
    SELECT
      u.id AS user_id,
      u.name AS user_name,
      p.id AS product_id,
      p.name AS product_name,
      r.total_quantity
    FROM ranked r
    JOIN users u ON u.id = r.user_id
    JOIN products p ON p.id = r.product_id
    WHERE r.user_id = $1 AND r.rn = 1;
  `;
  const { rows } = await pool.query(sql, [Number(userId)]);
  return rows;
}

module.exports = {
  crossJoinRecommendations,
  highValueUsers,
  topProductPerUser,
};
