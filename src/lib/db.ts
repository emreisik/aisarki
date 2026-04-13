import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL env değişkeni tanımlı değil");
}

const sql = neon(process.env.DATABASE_URL);

export default sql;
