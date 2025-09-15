const { pool } = require('./db');

async function explainCrossJoin({ minPrice = 0, limit = 10, offset = 0, nameLike }) {
  let idx = 1;
  const params = [];
  const where = [];

  params.push(Number(minPrice)); // $1
  where.push(`p.price > $${idx++}`);

  if (nameLike && String(nameLike).trim().length > 0) {
    params.push(`%${nameLike}%`);
    where.push(`(u.name ILIKE $${idx} OR p.name ILIKE $${idx})`);
    idx++;
  }

  params.push(Number(limit));
  const limitParam = idx++;
  params.push(Number(offset));
  const offsetParam = idx++;

  const sql = `
    EXPLAIN ANALYZE
    SELECT u.id, p.id
    FROM users u
    CROSS JOIN products p
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY u.id, p.id
    LIMIT $${limitParam} OFFSET $${offsetParam};
  `;

  const { rows } = await pool.query(sql, params);
  console.log(rows.map(r => r['QUERY PLAN']).join('\n'));
}

(async () => {
  const args = Object.fromEntries(
    process.argv.slice(2).map((v, i, a) => (v.startsWith('--') ? [v.replace('--',''), a[i+1]] : null)).filter(Boolean)
  );
  await explainCrossJoin({
    minPrice: args.minPrice || 50,
    limit: args.limit || 20,
    offset: args.offset || 0,
    nameLike: args.nameLike || ''
  });
  process.exit(0);
})();
