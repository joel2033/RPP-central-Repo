import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for serverless environments
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10
});

// Add error handling for reconnections
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  
  // Handle specific reconnection errors (57P01: terminating connection due to administrator command)
  if (err.code === '57P01' || err.message.includes('terminating connection due to administrator command')) {
    console.log('Attempting to reconnect to database...');
    // The pool will automatically attempt to reconnect on the next query
  }
});

export const db = drizzle({ client: pool, schema });