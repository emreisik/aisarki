import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Lazy init — build sırasında (page data collection) DATABASE_URL yoksa
// neon() constructor'ı bir hata fırlatır. Proxy ile ilk gerçek query'de kurarız.
let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Admin app Neon Postgres erişimi için gereklidir.",
    );
  }
  client = neon(url);
  return client;
}

// Tagged template API'yi ve .query() metodunu lazy forward et.
const sql = new Proxy(function () {}, {
  apply(_target, _thisArg, args) {
    return (getClient() as unknown as (...a: unknown[]) => unknown).apply(
      undefined,
      args,
    );
  },
  get(_target, prop) {
    return Reflect.get(getClient(), prop);
  },
}) as unknown as NeonQueryFunction<false, false>;

export default sql;
