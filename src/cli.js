const { crossJoinRecommendations, highValueUsers, topProductPerUser } = require('./queries');
const { transactionalOrder } = require('./transactions');
const { exportToCsv } = require('./csv');

function parseArgs() {
  const raw = process.argv.slice(2);
  const out = { cmd: raw[0] };       
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].startsWith('--')) {
      const key = raw[i].slice(2);
      const next = raw[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;                 
        i++;                             
      } else {
        out[key] = true;                 
      }
    }
  }
  return out;
}

(async () => {
  const args = parseArgs();
  try {
    if (args.cmd === 'cross-join') {
      const rows = await crossJoinRecommendations({
        minPrice: Number(args.minPrice || 50),
        limit: Number(args.limit || 20),
        offset: Number(args.offset || 0),
        nameLike: args.nameLike || ''
      });
      if (args.csv) {
        const file = await exportToCsv(rows, String(args.csv));
        console.log(`Exported to ${file}`);
      } else {
        console.table(rows.slice(0, 20));
        console.log(`Total rows: ${rows.length}`);
      }
    } else if (args.cmd === 'high-value-users') {
      const rows = await highValueUsers({ minTotal: Number(args.minTotal || 1000) });
      if (args.csv) {
        const file = await exportToCsv(rows, String(args.csv));
        console.log(`Exported to ${file}`);
      } else {
        console.table(rows);
      }
    } else if (args.cmd === 'top-products') {
      const rows = await topProductPerUser({ userId: Number(args.userId) });
      console.table(rows);
    } else if (args.cmd === 'transaction') {
      const out = await transactionalOrder({
        userId: Number(args.userId),
        productId: Number(args.productId),
        quantity: Number(args.qty || args.quantity || 1)
      });
      console.log(out);
    } else {
      console.log(`Usage:
  npm run cli -- cross-join --minPrice 50 --limit 20 --offset 0 [--nameLike "Pro"] [--csv out.csv]
  npm run cli -- high-value-users [--minTotal 1000] [--csv out.csv]
  npm run cli -- top-products --userId 1
  npm run cli -- transaction --userId 1 --productId 2 --qty 3
`);
    }
  } catch (e) {
    console.error('CLI error:', e.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();
