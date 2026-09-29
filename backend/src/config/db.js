const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "nwis",
  user: "bhumi",
  password: "",
});

module.exports = pool;