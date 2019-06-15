// Initialise Postgres Tables

const PostgreSQL = require('./utils/postgres');

const client = PostgreSQL.CreateClient();

client.connect(function(err) {
  if (err) throw err;
  // Create LunchGroups Table if it does not exist
  client.query('CREATE TABLE IF NOT EXISTS lunch_groups (\
    person_id VARCHAR (80) NOT NULL,\
    person_name VARCHAR (35) NOT NULL,\
    group_name VARCHAR (35) NOT NULL,\
    admin BOOLEAN NOT NULL,\
    status VARCHAR (8) NOT NULL,\
    primary_group VARCHAR (35),\
    poll_in_progress BOOLEAN NOT NULL,\
    in_the_office BOOLEAN,\
    in_for_lunch BOOLEAN,\
    comments VARCHAR (80));', function(err, res) {
    if (err) throw err;
    client.end();
  });
});
