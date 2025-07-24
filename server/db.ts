import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for serverless environments
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

// if (!process.env.DATABASE_URL) {
//   throw new Error(
//     "DATABASE_URL must be set. Did you forget to provision a database?",
//   );
// }

// Connection pool configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
};

let pool: Pool;

// Function to create or recreate the pool
function createPool(): Pool {
  if (pool) {
    pool.end();
  }
  
  pool = new Pool(poolConfig);
  
  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Database pool error:', err);
    
    // Handle specific reconnection errors (57P01: terminating connection due to administrator command)
    if (err.code === '57P01' || err.message.includes('terminating connection due to administrator command')) {
      console.log('Connection terminated by administrator, will recreate pool on next query...');
    }
  });
  
  return pool;
}

// Initial pool creation
createPool();

// Auto-reconnect wrapper with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if this is a fatal connection error that requires pool recreation
      if (
        error.code === '57P01' || // terminating connection due to administrator command
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.message.includes('terminating connection due to administrator command') ||
        error.message.includes('Connection terminated unexpectedly')
      ) {
        console.log(`Fatal connection error on attempt ${attempt + 1}/${maxRetries}:`, error.message);
        
        // Recreate the pool for fatal errors
        console.log('Recreating database pool...');
        createPool();
        
        // Wait before retrying with exponential backoff
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } else {
        // For non-fatal errors, don't retry
        throw error;
      }
    }
  }
  
  throw lastError;
}

// Export the pool with retry wrapper
export { pool };

// Create database instance with retry wrapper
const originalQuery = pool.query.bind(pool);
pool.query = async (...args: any[]) => {
  return withRetry(() => originalQuery(...args));
};

export const db = drizzle({ client: pool, schema });