import { neon } from "@neondatabase/serverless";

// Build sırasında DATABASE_URL olmayabilir; neon sadece query anında bağlanır.
const sql = neon(
  process.env.DATABASE_URL ?? "postgresql://localhost/placeholder",
);

export default sql;
