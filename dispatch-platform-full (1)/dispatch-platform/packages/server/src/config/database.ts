/**
 * Database Configuration
 * 
 * Provides a robust database layer with:
 * - Connection pooling
 * - Transaction support
 * - Query building helpers
 * - Migration system
 * - Seed data
 * 
 * Uses raw SQL for maximum control and performance.
 * Compatible with PostgreSQL (primary), MySQL, and SQLite (development).
 */

import { Client, Pool, PoolClient, QueryResult, QueryConfig } from 'pg';
import { logger } from './logger';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  poolMin: number;
  poolMax: number;
}

function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'freight_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '20', 10),
  };
}

// ============================================================================
// DATABASE CLASS
// ============================================================================

class Database {
  private pool: Pool | null = null;
  private config: DatabaseConfig;

  constructor() {
    this.config = getDatabaseConfig();
  }

  /**
   * Connect to the database and initialize the connection pool
   */
  async connect(): Promise<void> {
    if (this.pool) return;

    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
      min: this.config.poolMin,
      max: this.config.poolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      statement_timeout: 60000,
    });

    // Test the connection
    const client = await this.pool.connect();
    try {
      await client.query('SELECT NOW()');
      logger.debug('Database connection test successful');
    } finally {
      client.release();
    }

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error:', err);
    });
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('Database pool closed');
    }
  }

  /**
   * Get a client from the pool (for transactions)
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) await this.connect();
    return (this.pool as Pool).connect();
  }

  /**
   * Execute a query with parameters
   */
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) await this.connect();
    const start = Date.now();
    try {
      const result = await (this.pool as Pool).query<T>(text, params);
      const duration = Date.now() - start;
      if (duration > 1000) {
        logger.warn(`Slow query (${duration}ms): ${text.substring(0, 200)}`);
      }
      return result;
    } catch (error) {
      logger.error('Database query error:', { text: text.substring(0, 200), params, error });
      throw error;
    }
  }

  /**
   * Execute a query and return a single row
   */
  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  /**
   * Execute a query and return all rows
   */
  async queryMany<T = any>(text: string, params?: any[]): Promise<T[]> {
    const result = await this.query<T>(text, params);
    return result.rows;
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute raw SQL (for migrations, seeding, etc.)
   */
  async execute(sql: string): Promise<void> {
    if (!this.pool) await this.connect();
    await (this.pool as Pool).query(sql);
  }

  /**
   * Check if database is connected
   */
  isConnected(): boolean {
    return this.pool !== null && (this.pool as any).totalCount > 0;
  }

  /**
   * Get pool statistics
   */
  getStats(): { total: number; idle: number; waiting: number } {
    if (!this.pool) return { total: 0, idle: 0, waiting: 0 };
    return {
      total: (this.pool as any).totalCount,
      idle: (this.pool as any).idleCount,
      waiting: (this.pool as any).waitingCount,
    };
  }

  // ==========================================================================
  // MIGRATION SYSTEM
  // ==========================================================================

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    logger.info('Running database migrations...');

    // Create migrations table if it doesn't exist
    await this.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Get list of executed migrations
    const executedResult = await this.query<{ name: string }>(
      'SELECT name FROM migrations ORDER BY id'
    );
    const executed = new Set(executedResult.rows.map((r) => r.name));

    // Get migration files
    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      logger.warn(`Migrations directory not found: ${migrationsDir}`);
      return;
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    // Execute pending migrations
    for (const file of migrationFiles) {
      if (executed.has(file)) continue;

      logger.info(`Executing migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      await this.transaction(async (client) => {
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      });

      logger.info(`✅ Migration completed: ${file}`);
    }

    logger.info('All migrations up to date');
  }

  // ==========================================================================
  // SEED DATA
  // ==========================================================================

  /**
   * Seed the database with initial data
   */
  async seed(): Promise<void> {
    logger.info('Seeding database...');

    const seedsDir = path.join(__dirname, '..', '..', 'seeds');
    if (!fs.existsSync(seedsDir)) {
      logger.warn(`Seeds directory not found: ${seedsDir}`);
      return;
    }

    const seedFiles = fs
      .readdirSync(seedsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of seedFiles) {
      logger.info(`Executing seed: ${file}`);
      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf-8');
      await this.execute(sql);
    }

    logger.info('✅ Database seeding complete');
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const database = new Database();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build a WHERE clause from filters object
 */
export function buildWhereClause(
  filters: Record<string, any>,
  startIndex: number = 1
): { clause: string; params: any[]; nextIndex: number } {
  const conditions: string[] = [];
  const params: any[] = [];
  let index = startIndex;

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'object' && !Array.isArray(value)) continue;
    if (Array.isArray(value) && value.length === 0) continue;

    conditions.push(`${key} = $${index}`);
    params.push(value);
    index++;
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
    nextIndex: index,
  };
}

/**
 * Build a paginated query
 */
export function buildPaginatedQuery(
  baseQuery: string,
  page: number = 1,
  limit: number = 20,
  orderBy?: string
): { query: string; offset: number; limitValue: number } {
  const offset = (page - 1) * limit;
  let query = baseQuery;
  if (orderBy) query += ` ORDER BY ${orderBy}`;
  query += ` LIMIT ${limit} OFFSET ${offset}`;
  return { query, offset, limitValue: limit };
}

/**
 * Generate a UUID v4 (database function)
 */
export async function generateUuid(): Promise<string> {
  const result = await database.queryOne<{ uuid: string }>('SELECT gen_random_uuid() as uuid');
  return result?.uuid || require('crypto').randomUUID();
}
