const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions
} = require('@azure/storage-blob');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'documents';
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

function getClient() {
  if (!connectionString) throw new Error('AZURE_STORAGE_CONNECTION_STRING not set');
  return BlobServiceClient.fromConnectionString(connectionString);
}

/**
 * Upload a file buffer to Azure Blob Storage
 * @param {Buffer} buffer - file buffer from multer
 * @param {string} blobPath - e.g. "2026/OUT/001/final.pdf"
 * @param {string} mimeType - e.g. "application/pdf"
 * @returns {string} blob URL (private, use generateSAS to access)
 */
async function uploadToBlob(buffer, blobPath, mimeType = 'application/octet-stream') {
  const client = getClient();
  const containerClient = client.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType }
  });

  // Return the base URL (not publicly accessible — use SAS)
  return blockBlobClient.url.split('?')[0];
}

/**
 * Generate a time-limited SAS URL for secure access
 * @param {string} blobPath - e.g. "2026/OUT/001/final.pdf"
 * @param {number} expiryMinutes - how long the link is valid (default 60)
 * @returns {string} SAS URL
 */
function generateSAS(blobPath, expiryMinutes = 60) {
  if (!accountName || !accountKey) {
    throw new Error('AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY must be set for SAS generation');
  }

  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  const expiresOn = new Date(Date.now() + expiryMinutes * 60 * 1000);

  const sasToken = generateBlobSASQueryParameters({
    containerName,
    blobName: blobPath,
    permissions: BlobSASPermissions.parse('r'),
    expiresOn
  }, sharedKeyCredential).toString();

  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}?${sasToken}`;
}

/**
 * Delete a blob (for cleanup if needed)
 */
async function deleteBlob(blobPath) {
  const client = getClient();
  const containerClient = client.getContainerClient(containerName);
  await containerClient.deleteBlob(blobPath);
}

module.exports = { uploadToBlob, generateSAS, deleteBlob };
