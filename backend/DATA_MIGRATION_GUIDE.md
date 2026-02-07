# Data Migration Guide: Local MongoDB → Azure Cosmos DB

This guide helps you migrate your local MongoDB data to Azure Cosmos DB without losing anything.

## Prerequisites

- Local MongoDB running with your data
- Azure Cosmos DB connection string in `.env` file
- Node.js and npm installed

## Step 1: Export Data from Local MongoDB

Run this command in the `backend` folder:

```bash
node export-local-data.js
```

**What it does:**
- Connects to your local MongoDB
- Exports all collections to JSON files
- Saves them in `backend/data-export/` folder

**Output:**
```
✅ Exported 5 documents to users.json
✅ Exported 120 documents to members.json
✅ Exported 45 documents to transactions.json
...
```

## Step 2: Verify Exported Data

Check the `backend/data-export/` folder. You should see:
- `users.json`
- `members.json`
- `transactions.json`
- `inventoryitems.json`
- `tasks.json`
- `promises.json`
- `membercontributions.json`
- `reports.json`

Open any file to verify your data is there.

## Step 3: Import Data to Azure Cosmos DB

Make sure your `.env` file has the Azure connection string:
```
MONGODB_URI=mongodb://stmichael-db:...@stmichael-db.mongo.cosmos.azure.com:10255/church_db?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@stmichael-db@
```

Run this command:

```bash
node import-to-azure.js
```

**What it does:**
- Connects to Azure Cosmos DB
- Reads JSON files from `data-export/`
- Imports all data to Azure
- Skips collections that already have data (prevents duplicates)

**Output:**
```
✅ Imported 5 documents to users
✅ Imported 120 documents to members
✅ Imported 45 documents to transactions
...
```

## Step 4: Verify Migration

Test the Azure database:

```bash
node test-direct-connection.js
```

You should see all your collections with the correct document counts.

## Important Notes

### Safety Features
- **No data deletion**: The import script never deletes existing data
- **Duplicate prevention**: Skips collections that already have data
- **Backup**: Your local data remains untouched in MongoDB

### If You Need to Re-import
If you want to reimport a collection:

1. Delete the collection in Azure first (using Azure Portal or MongoDB Compass)
2. Run `node import-to-azure.js` again

### Updating Local MongoDB Connection
If your local MongoDB uses a different connection string, edit `export-local-data.js`:

```javascript
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/your_database_name';
```

## Troubleshooting

### "Cannot connect to local MongoDB"
- Make sure MongoDB is running locally
- Check the connection string in `export-local-data.js`

### "Export directory not found"
- Run `export-local-data.js` first before `import-to-azure.js`

### "Collection already has documents"
- This is normal - it prevents duplicates
- If you want to reimport, delete the collection in Azure first

## Alternative: MongoDB Compass

You can also use MongoDB Compass GUI tool:

1. Connect to local MongoDB
2. Export each collection to JSON
3. Connect to Azure Cosmos DB
4. Import JSON files

Download: https://www.mongodb.com/products/compass
