const pg = require("pg");
const { Client } = pg;
const client = new Client({
    connectionString: "postgres://postgres.eltommxihzzizogvcgpz:pH67lWsrXqy8lTsG@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require",
    ssl: {
        rejectUnauthorized: false
    }
});

async function main() {
    await client.connect();
    const res = await client.query("SELECT * FROM public.users WHERE email = $1", ["shilpa053020@gmail.com"]);
    if (res.rows.length === 0) {
        console.log("User not found!");
    } else {
        console.log(JSON.stringify(res.rows[0], null, 2));
    }
    await client.end();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
