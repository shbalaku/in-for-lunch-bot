// PostgreSQL Client Library
const { Client } = require('pg');

var service = {};

service.CreateClient = CreateClient;

module.exports = service;

/* Function to create PG client */
function CreateClient() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
    ssl: true
  });
  return client;
}
