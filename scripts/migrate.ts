/** Applies the SQL migrations in ./drizzle. Runs before each deploy. */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "postgres://localhost:5432/common_grounds";
const client = postgres(url, { max: 1, ssl: url.includes(".render.com") ? "require" : false });

migrate(drizzle(client), { migrationsFolder: "./drizzle" })
  .then(async () => {
    console.log("Migrations applied");
    await client.end();
  })
  .catch(async (e) => {
    console.error(e);
    await client.end();
    process.exit(1);
  });
