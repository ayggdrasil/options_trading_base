import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront"
import fs from 'fs'
import path from 'path'
import mime from 'mime-types'
import { parseArgs } from "util"
import { config } from 'dotenv'

const { values } = parseArgs({
  options: {
    mode: {
      type: 'string'
    }
  }
})

let envPath;

if (values.mode === 'prod') {
  envPath = './environments/.env.prod';
} else if (values.mode === 'dev') {
  envPath = './environments/.env.dev';
} else if (values.mode === 'bera') {
  envPath = './environments/.env.bera';
} else {
  envPath = './environments/.env.dev';
}

const __dirname = path.resolve()

config({ path: path.resolve(__dirname, envPath), override: true });  

const MOBY_FRONTEND_BUCKET = process.env.MOBY_FRONTEND_BUCKET;
const MOBY_FRONTEND_BUCKET_REGION = process.env.MOBY_FRONTEND_BUCKET_REGION;
const CLOUDFRONT_DISTRIBUTION_ID = process.env.MOBY_FRONTEND_CLOUDFRONT_DISTRIBUTION_ID;

// deploy build folder contents to AWS S3 bucket
const deploy = async () => {
  const s3 = new S3Client({
    region: MOBY_FRONTEND_BUCKET_REGION,
  });

  const bucketName = MOBY_FRONTEND_BUCKET;
  const buildPath = path.resolve(__dirname, './build');

  const files = getAllFiles(buildPath);
  const jscsshtmlOnlyFiles = files.filter(file => file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.html'));

  for (let file of process.env.INCLUDE_ASSETS ? files : jscsshtmlOnlyFiles) {
    const filePath = path.resolve(buildPath, file);
    const fileContent = fs.readFileSync(filePath);

    let contentEncoding = ""
    
    // remove .gz extension
    if (file.endsWith('.gz')) {
      file = file.slice(0, -3);
      contentEncoding = "gzip"
    }

    const contentType = mime.lookup(file);

    const params = {
      Bucket: bucketName,
      Key: file,
      Body: fileContent,
      ContentType: contentType || 'application/octet-stream',
      ContentEncoding: contentEncoding,
    };

    try {
      await s3.send(new PutObjectCommand(params));
      console.log(`Uploaded ${file}`);
    } catch (error) {
      console.error(`Error uploading ${file}:`, error);
    }
  }

  // @TODO: delete deprecated index.js index.css files
  // cloudfront invalidation
  const cloudfront = new CloudFrontClient({
    region: "us-east-1",
  });

  const invalidationParams = {
    DistributionId: CLOUDFRONT_DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: Date.now().toString(),
      Paths: {
        Quantity: 1,
        Items: ['/index.html'],
      },
    },
  };

  const command = new CreateInvalidationCommand(invalidationParams);
  const response = await cloudfront.send(command);

  console.log('Deployment completed!');
};

const getAllFiles = (dirPath, fileList = []) => {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(path.relative('./build', filePath));
    }
  });

  return fileList;
};

(async () => {
  try {
    await deploy();
  } catch (error) {
    console.error('Error occurred during deployment:', error);
  }
})();