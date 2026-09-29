const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { parse } = require("csv-parse/sync");

const client = new Client({
  host: "localhost",
  port: 5432,
  database: "nwis",
  user: "bhumi",
  password: "",
});

const DATA_DIR = "/Users/bhumi/Desktop";

const skipTables = new Set([
  "wells",
  "well_trajectories",
  "formations",
  "operational_events",
]);

function tableName(filename) {
  return path.basename(filename, ".csv")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
}

function columnName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
}

function escapeIdentifier(name) {
  return `"${name.replace(/"/g, '""')}"`;
}

function escapeValue(value) {
  if (value === null || value === undefined || value === "") {
    return "NULL";
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  await client.connect();

  const files = fs
    .readdirSync(DATA_DIR)
    .filter(file => file.toLowerCase().endsWith(".csv"));

  console.log(`Found ${files.length} CSV files.`);

  for (const file of files) {
    const table = tableName(file);

    if (skipTables.has(table)) {
      console.log(`Skipping ${file} — already imported.`);
      continue;
    }

    const filePath = path.join(DATA_DIR, file);

    console.log(`\nImporting ${file} → ${table}`);

    const csvText = fs.readFileSync(filePath, "utf8");

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
    });

    if (records.length === 0) {
      console.log("No records found.");
      continue;
    }

    const columns = Object.keys(records[0]).map(columnName);

    await client.query(`DROP TABLE IF EXISTS ${escapeIdentifier(table)}`);

    const createColumns = columns
      .map(column => `${escapeIdentifier(column)} TEXT`)
      .join(", ");

    await client.query(`
      CREATE TABLE ${escapeIdentifier(table)} (
        id SERIAL PRIMARY KEY,
        ${createColumns}
      )
    `);

    for (const record of records) {
      const values = Object.values(record).map(escapeValue);

      await client.query(`
        INSERT INTO ${escapeIdentifier(table)}
        (${columns.map(escapeIdentifier).join(", ")})
        VALUES (${values.join(", ")})
      `);
    }

    console.log(`✓ Imported ${records.length} rows into ${table}`);
  }

  await client.end();

  console.log("\n=================================");
  console.log("ALL REMAINING CSV FILES IMPORTED");
  console.log("=================================");
}

main().catch(error => {
  console.error("\nImport failed:");
  console.error(error);
  client.end();
});