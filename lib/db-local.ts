/**
 * PGlite (embedded Postgres) wrapper for zero-config local development.
 * Provides a Neon-compatible sql tagged template interface backed by PGlite.
 *
 * Supports all three call patterns used in the codebase:
 * 1. Tagged template:  sql`SELECT * FROM agents WHERE id = ${id}`
 * 2. Raw SQL string:   sql(migrationSQL)
 * 3. Raw SQL + params:  sql(query, [param1])
 *
 * Also supports nested sql fragments (e.g. sql`AND agent_id = ${id}` inside outer query).
 */

import * as fs from 'fs';
import * as path from 'path';

type PGliteInstance = any;

// Use globalThis to persist across Next.js hot reloads in dev mode
const g = globalThis as any;

async function doInit(): Promise<PGliteInstance> {
  const { PGlite } = await import('@electric-sql/pglite');

  const dataDir = path.join(process.cwd(), '.volition', 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const instance = new PGlite(dataDir);

  // Run migrations using a direct sql wrapper (avoids circular getDB() calls)
  const migrationSql = createSqlFunction(() => Promise.resolve(instance));
  const { ensureMigrations } = await import('./db-migrate');
  await ensureMigrations(migrationSql);

  console.log('[db] PGlite initialized at .volition/data/');
  return instance;
}

function getDB(): Promise<PGliteInstance> {
  if (!g.__volitionPGlite) {
    g.__volitionPGlite = doInit();
  }
  return g.__volitionPGlite;
}

/**
 * Build a parameterized query from tagged template strings and values.
 * Handles nested SQL fragments (objects with __sqlFragment marker).
 */
function buildQuery(
  strings: TemplateStringsArray,
  values: any[],
): { queryText: string; params: any[] } {
  let queryText = '';
  const params: any[] = [];

  for (let i = 0; i < strings.length; i++) {
    queryText += strings[i];
    if (i < values.length) {
      const val = values[i];
      if (val !== null && typeof val === 'object' && val.__sqlFragment === true) {
        // Inline nested SQL fragment, renumbering its $N placeholders
        const offset = params.length;
        const fragmentText = val.text.replace(
          /\$(\d+)/g,
          (_: string, n: string) => `$${parseInt(n) + offset}`,
        );
        queryText += fragmentText;
        params.push(...val.params);
      } else {
        params.push(val);
        queryText += `$${params.length}`;
      }
    }
  }

  return { queryText, params };
}

/**
 * Create a sql tagged template function that uses the given PGlite instance getter.
 * Separated from getDB() so migration init can pass the instance directly.
 */
function createSqlFunction(getInstance: () => Promise<PGliteInstance>) {
  function sql(stringsOrQuery: TemplateStringsArray | string, ...values: any[]): any {
    // --- Raw string call: sql(queryString) or sql(queryString, [params]) ---
    if (typeof stringsOrQuery === 'string') {
      const query = stringsOrQuery;
      if (values.length > 0 && Array.isArray(values[0])) {
        // Parameterized: sql(query, [param1, param2])
        return getInstance()
          .then((db) => db.query(query, values[0]))
          .then((r: any) => r.rows ?? []);
      }
      // Raw multi-statement SQL (migrations): sql(queryString)
      return getInstance()
        .then((db) => db.exec(query))
        .then((results: any[]) => {
          if (!Array.isArray(results) || results.length === 0) return [];
          const last = [...results]
            .reverse()
            .find((r: any) => r.rows && r.rows.length > 0);
          return last?.rows ?? [];
        });
    }

    // --- Tagged template call: sql`SELECT * FROM ... WHERE id = ${id}` ---
    const strings = stringsOrQuery as TemplateStringsArray;
    const { queryText, params } = buildQuery(strings, values);

    const resultPromise = getInstance()
      .then((db) => db.query(queryText, params))
      .then((r: any) => r.rows ?? []);

    // Return thenable that also acts as a nestable SQL fragment
    return {
      __sqlFragment: true,
      text: queryText,
      params,
      then(
        resolve?: (value: any[]) => any,
        reject?: (error: any) => any,
      ): Promise<any> {
        return resultPromise.then(resolve, reject);
      },
    };
  }

  return sql;
}

/**
 * Create a Neon-compatible sql tagged template function backed by PGlite.
 */
export function createLocalSql() {
  return createSqlFunction(getDB);
}

/**
 * Create a Pool-compatible wrapper around PGlite (for getPool() compatibility).
 */
export async function getLocalPool(): Promise<any> {
  const instance = await getDB();
  return {
    query: (text: string, params?: any[]) => instance.query(text, params),
    end: () => Promise.resolve(),
  };
}
