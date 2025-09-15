const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const { faker } = require('@faker-js/faker');

async function runSQLFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await client.query(sql);
}

async function seed(numUsers = 100, numProducts = 50, numOrders = 500) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users
    for (let i = 0; i < numUsers; i++) {
      const name = faker.person.fullName();
      const email = faker.internet.email();
      await client.query(
        'INSERT INTO users (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
        [name, email]
      );
    }

    // Products
    for (let i = 0; i < numProducts; i++) {
      const pname = faker.commerce.productName();
      const price = parseFloat(faker.commerce.price({ min: 10, max: 500, dec: 2 }));
      const stock = faker.number.int({ min: 50, max: 500 });
      await client.query(
        'INSERT INTO products (name, price, stock) VALUES ($1, $2, $3)',
        [pname, price, stock]
      );
    }

    // Orders
    const { rows: users } = await client.query('SELECT id FROM users');
    const { rows: products } = await client.query('SELECT id FROM products');

    for (let i = 0; i < numOrders; i++) {
      const u = users[Math.floor(Math.random() * users.length)].id;
      const p = products[Math.floor(Math.random() * products.length)].id;
      const qty = faker.number.int({ min: 1, max: 10 });
      await client.query(
        'INSERT INTO orders (user_id, product_id, quantity) VALUES ($1, $2, $3)',
        [u, p, qty]
      );
    }

    await client.query('COMMIT');
    console.log('Seeding complete.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seed error:', e);
  } finally {
    client.release();
  }
}

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await runSQLFile(client, path.join(__dirname, 'schema.sql'));
    await client.query('COMMIT');
    console.log('Schema created.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Schema error:', e);
  } finally {
    client.release();
  }

  await seed(
    Number(process.env.SEED_USERS || 100),
    Number(process.env.SEED_PRODUCTS || 50),
    Number(process.env.SEED_ORDERS || 500)
  );

  process.exit(0);
})();
