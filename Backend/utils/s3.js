const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// Cached S3 Client instance
let s3ClientInstance = null;


function getS3Client() {
  if (!s3ClientInstance) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('[S3 Client Error] AWS Credentials (AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY) are not set in environment variables.');
    }

    s3ClientInstance = new S3Client({
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region,
    });
  }
  return s3ClientInstance;
}

/**
 * Uploads a file buffer to AWS S3.
 * 
 * @param {Object} file - Multer file object containing the memory buffer and metadata.
 * @param {string} shopId - Target shop identifier directory.
 * @returns {Promise<string>} The public URL of the uploaded S3 object.
 */
async function uploadBufferToS3(file, shopId) {
  const s3 = getS3Client();
  const bucketName = process.env.AWS_S3_BUCKET_NAME;

  if (!bucketName) {
    throw new Error('[S3 Upload Error] AWS_S3_BUCKET_NAME is not set in environment variables.');
  }

  // Create a unique filepath: uploads/SHOPID/timestamp-filename
  const cleanOriginalName = file.originalname.replace(/\s+/g, '_');
  const uniqueName = `${Date.now()}-${cleanOriginalName}`;
  const key = `uploads/${shopId.toUpperCase()}/${uniqueName}`;

  const uploadParams = {
    Bucket: bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    await s3.send(new PutObjectCommand(uploadParams));
    const region = process.env.AWS_REGION || 'us-east-1';
    
    // Construct the public object URL
    const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    console.log(`[S3 Storage] Successfully uploaded file to S3: ${s3Url}`);
    return s3Url;
  } catch (error) {
    console.error(`[S3 Storage] Upload failed for key: ${key}`, error);
    throw error;
  }
}

/**
 * Deletes an object from AWS S3 based on its public S3 URL.
 * 
 * @param {string} fileUrl - Full public URL of the S3 object.
 * @returns {Promise<void>}
 */
async function deleteFileFromS3(fileUrl) {
  if (!fileUrl) return;

  // Verify the URL structure points to Amazon AWS S3
  if (!fileUrl.includes('.amazonaws.com/')) {
    console.warn(`[S3 Storage] URL is not a recognized S3 address: ${fileUrl}. Skipping S3 deletion.`);
    return;
  }

  const s3 = getS3Client();
  const bucketName = process.env.AWS_S3_BUCKET_NAME;

  if (!bucketName) {
    throw new Error('[S3 Deletion Error] AWS_S3_BUCKET_NAME is not set.');
  }

  // Extract the object key from the S3 URL
  // Format: https://bucket-name.s3.region.amazonaws.com/uploads/SHOPID/filename
  const urlParts = fileUrl.split('.amazonaws.com/');
  if (urlParts.length < 2) {
    console.error(`[S3 Storage] Unable to parse S3 key from URL: ${fileUrl}`);
    return;
  }

  const key = decodeURIComponent(urlParts[1]);
  const deleteParams = {
    Bucket: bucketName,
    Key: key,
  };

  try {
    await s3.send(new DeleteObjectCommand(deleteParams));
    console.log(`[S3 Storage] Successfully deleted S3 object with key: ${key}`);
  } catch (error) {
    console.error(`[S3 Storage] Deletion failed for S3 key: ${key}`, error);
    throw error;
  }
}

/**
 * Fetches an object from AWS S3 as a stream.
 * 
 * @param {string} fileUrl - Full public URL of the S3 object.
 * @returns {Promise<Object>} Object containing Body stream and ContentType.
 */
async function downloadFileFromS3(fileUrl) {
  if (!fileUrl) {
    throw new Error('[S3 Storage] File URL is required to download from S3.');
  }

  const s3 = getS3Client();
  const bucketName = process.env.AWS_S3_BUCKET_NAME;

  if (!bucketName) {
    throw new Error('[S3 Storage] AWS_S3_BUCKET_NAME is not set.');
  }

  // Extract key from URL
  const urlParts = fileUrl.split('.amazonaws.com/');
  if (urlParts.length < 2) {
    throw new Error(`[S3 Storage] Unable to parse S3 key from URL: ${fileUrl}`);
  }

  const key = decodeURIComponent(urlParts[1]);
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await s3.send(command);
  return {
    Body: response.Body,
    ContentType: response.ContentType,
  };
}

module.exports = {
  uploadBufferToS3,
  deleteFileFromS3,
  downloadFileFromS3,
};
