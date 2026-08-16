import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  BucketLocationConstraint,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3StorageService implements OnModuleInit {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(S3StorageService.name);
  private readonly bucketName: string;
  private readonly region: BucketLocationConstraint;
  private readonly domain: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME');
    this.region = this.configService.get<BucketLocationConstraint>('S3_REGION');
    this.domain = this.configService.get<string>('S3_DOMAIN');

    // Initialize S3 client with Arvan cloud credentials
    this.s3Client = new S3Client({
      endpoint: this.configService.get<string>('S3_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.configService.get<string>('S3_SECRET_KEY'),
      },
      forcePathStyle: true, // Required for some S3 compatible services
      region: this.region,
    });
  }

  async onModuleInit() {
    await this.validateConfig();
    await this.ensureBucketExists();
  }

  private async validateConfig() {
    this.logger.log('Validating S3 configuration...');
    const requiredVars = [
      'S3_ENDPOINT',
      'S3_ACCESS_KEY',
      'S3_SECRET_KEY',
      'S3_BUCKET_NAME',
      'S3_REGION',
    ];

    requiredVars.forEach((varName) => {
      if (!this.configService.get<string>(varName)) {
        throw new Error(`S3 configuration error: Missing ${varName}`);
      }
    });
  }

  async ensureBucketExists(): Promise<void> {
    try {
      this.logger.log(`Checking if bucket "${this.bucketName}" exists...`);

      const headBucketCommand = new HeadBucketCommand({
        Bucket: this.bucketName,
      });

      await this.s3Client.send(headBucketCommand);
      this.logger.log(`Bucket "${this.bucketName}" exists.`);
    } catch (error) {
      if (error.name === 'NotFound' || error.name === 'NoSuchBucket') {
        this.logger.log(`Bucket "${this.bucketName}" not found. Creating...`);
        await this.createBucket();
      } else {
        this.logger.error(`Error checking bucket: ${error.message}`);
        throw error;
      }
    }
  }

  private async createBucket(): Promise<void> {
    try {
      const createBucketCommand = new CreateBucketCommand({
        Bucket: this.bucketName,
        CreateBucketConfiguration: {
          LocationConstraint: this.region,
        },
      });

      await this.s3Client.send(createBucketCommand);
      this.logger.log(`Bucket "${this.bucketName}" created successfully.`);

      // Set bucket to be publicly readable for CDN access
      const putBucketPolicyCommand = new PutBucketPolicyCommand({
        Bucket: this.bucketName,
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'PublicReadGetObject',
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        }),
      });

      await this.s3Client.send(putBucketPolicyCommand);
      this.logger.log(`Public read policy set for bucket "${this.bucketName}"`);
    } catch (error) {
      this.logger.error(`Failed to create bucket: ${error.message}`);
      throw error;
    }
  }

  /**
   * Uploads a buffer and returns its public URL.
   *
   * `acl` defaults to public-read, which suits avatars and other non-sensitive
   * assets. Pass `'private'` for anything that should only be reachable through
   * a presigned URL — invoices and payment receipts, for example.
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string,
    folder = '',
    acl: ObjectCannedACL = 'public-read',
  ): Promise<string> {
    const key = folder ? `${folder}/${filename}` : filename;

    try {
      const putObjectCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: acl,
      });

      await this.s3Client.send(putObjectCommand);

      // Return URL using custom domain if configured, otherwise use S3 URL
      if (this.domain) {
        return `${this.domain}/${this.bucketName}/${key}`;
      }

      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Time-limited read URL for a private object.
   *
   * Objects uploaded with `acl: 'private'` are not reachable through the
   * bucket's public-read policy, so this is the only way to hand one to a
   * browser. Default lifetime is 15 minutes — long enough to open a PDF, short
   * enough that a copied link stops working quickly.
   */
  async getSignedReadUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const deleteObjectCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(deleteObjectCommand);
      this.logger.log(`Successfully deleted file: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw error;
    }
  }
}
