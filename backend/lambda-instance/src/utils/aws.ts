import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { promisify } from "util";
import { gunzip, gzip } from "zlib";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export const client = new S3Client({
  region: process.env.APP_DATA_REGION,
})

export const cloudFrontClient = new CloudFrontClient({
  region: process.env.APP_DATA_REGION,
})

export const getS3 = async ({ Bucket, Key }) => {
  try {
    const { Body } = (await client.send(new GetObjectCommand({
      Bucket,
      Key,
    })))
    
    return JSON.parse(await Body.transformToString())
  } catch (e) {
    console.log("Error getting S3 data: ", e);
    return null
  }
}

export const getS3Stream = async ({ Bucket, Key }) => {
  try {
    const response = await client.send(new GetObjectCommand({
      Bucket,
      Key,
    }));
    
    return response.Body; // This is a stream
  } catch (e) {
    console.log("Error getting S3 stream: ", e);
    return null;
  }
}

export const fetchDataFromS3 = async ({Bucket, Key, initialData}) => {
  if (!Bucket || !Key) return { message: "S3 Bucket or Key is undefined." };

  for (let retries = 0; retries < Number(process.env.MAX_RETRIES); retries++) {
    try {
      const { Body } = (await client.send(new GetObjectCommand({
        Bucket,
        Key,
      })))

      const result = JSON.parse(await Body.transformToString())
      
      return result;
    } catch (error) {
      if (error.Code === 'NoSuchKey') {
        console.log("Creating initial data...");
        await putS3({ Bucket, Key, Body: JSON.stringify(initialData), CacheControl: 'no-cache' });
      } else {
        console.log('Error fetching from S3:', error);
      } 
    }
  }

  return null;
}

export const fetchDataFromS3Gzip = async ({Bucket, Key, initialData}) => {
  if (!Bucket || !Key) return { message: "S3 Bucket or Key is undefined." };

  for (let retries = 0; retries < Number(process.env.MAX_RETRIES); retries++) {
    try {
      const { Body } = (await client.send(new GetObjectCommand({
        Bucket,
        Key,
      })))

      const buffer = await streamToBuffer(Body) as Buffer;
      const decompressedResult = await gunzipAsync(buffer);
      
      return JSON.parse(decompressedResult.toString());
    } catch (error) {
      console.log('Error fetching from S3:', error);

      if (error.Code === 'NoSuchKey' && initialData) {
        console.log("Creating initial data...");
        const compressedInitialData = await gzipAsync(JSON.stringify(initialData));
        await putS3({ Bucket, Key, Body: compressedInitialData, CacheControl: 'no-cache' });

        return initialData;
      }
    }
  }

  return null;
}

export const putS3 = async ({ Bucket, Key, Body, CacheControl = "" }) => {
  await client.send(new PutObjectCommand({
    Bucket,
    Key,
    Body,
    CacheControl
  }))
}

export const putS3Gzip = async ({ Bucket, Key, Data, CacheControl = "" }) => {
  const compressedData = await gzipAsync(Data);

  await client.send(new PutObjectCommand({
    Bucket,
    Key,
    Body: compressedData,
    CacheControl
  }))
}

// Helper function to convert a stream to a buffer
export function streamToBuffer(stream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export const invalidateCloudfrontCache = async ({ 
  DistributionId, 
  InvalidationPaths 
}: {
  DistributionId?: string;
  InvalidationPaths: string[];
}) => {
  try {
    const command = new CreateInvalidationCommand({
      DistributionId: DistributionId || process.env.APP_CLOUDFRONT_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: `invalidation-${Date.now()}`,
        Paths: {
          Quantity: InvalidationPaths.length,
          Items: InvalidationPaths
        }
      }
    });

    const response = await cloudFrontClient.send(command);
    console.log('CloudFront cache invalidation success:', response);
    return response;
  } catch (error) {
    console.log('CloudFront cache invalidation error:', error);
    throw error;
  }
}