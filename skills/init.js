// Initialise Postgres Tables

const PostgreSQL = require('./utils/postgres');

const client = PostgreSQL.CreateClient();

client.connect(function(err) {
  if (err) throw err;
  // Create LunchGroups Table if it does not exist
  client.query('CREATE TABLE IF NOT EXISTS lunch_groups (\
    name VARCHAR (50) UNIQUE NOT NULL,\
    members JSON NOT NULL);', function(err, res) {
    if (err) throw err;
    client.end();
  });
});
