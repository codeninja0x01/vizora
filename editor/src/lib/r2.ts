import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutBucketCorsCommand,
  PutBucketLifecycleConfigurationCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import mime from 'mime/lite';

interface r2Params {
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  accountId: string;
  cdn: string;
}

interface PresignedUrlOptions {
  expiresIn?: number;
  contentType?: string;
}

export interface PresignedUpload {
  fileName: string;
  filePath: string;
  contentType: string;
  presignedUrl: string;
  url: string;
}

export class R2StorageService {
  private client: S3Client;
  private bucketName: string;
  private accountId: string;
  private cdn: string;

  constructor(params: r2Params) {
    this.bucketName = params.bucketName;
    this.accountId = params.accountId;
    this.cdn = params.cdn;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${params.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: params.accessKeyId,
        secretAccessKey: params.secretAccessKey,
      },
    });
  }

  async uploadData(
    fileName: string,
    data: Buffer | string,
    contentType: string = 'application/octet-stream'
  ): Promise<string> {
    try {
      const type = mime.getType(fileName) || contentType;

      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
          Body: data,
          ContentType: type,
        })
      );

      const url = this.getUrl(fileName);
      return url;
    } catch (error) {
      throw new Error(
        `Failed to upload to R2: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async uploadJson(fileName: string, data: any): Promise<string> {
    const content = JSON.stringify(data);
    return this.uploadData(fileName, content, 'application/json');
  }

  async createPresignedUpload(
    filePath: string,
    options: PresignedUrlOptions = {}
  ): Promise<PresignedUpload> {
    const inferredType =
      options.contentType ||
      mime.getType(filePath) ||
      'application/octet-stream';

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
      ContentType: inferredType,
    });

    const presignedUrl = await getSignedUrl(this.client, command, {
      expiresIn: options.expiresIn ?? 3600,
      signableHeaders: new Set(['content-type']),
    });

    return {
      fileName: filePath.split('/').pop() || filePath,
      filePath,
      contentType: inferredType,
      presignedUrl,
      url: this.getUrl(filePath),
    };
  }

  getUrl(fileName: string): string {
    return `${this.cdn}/${fileName}`;
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
  }

  async setupLifecycleRule(): Promise<void> {
    await this.client.send(
      new PutBucketLifecycleConfigurationCommand({
        Bucket: this.bucketName,
        LifecycleConfiguration: {
          Rules: [
            {
              ID: 'delete-renders-after-30-days',
              Status: 'Enabled',
              Filter: { Prefix: 'renders/' },
              Expiration: { Days: 30 },
            },
          ],
        },
      })
    );
  }

  /**
   * Configures CORS rules for the R2 bucket
   * @throws {Error} If CORS configuration fails
   */
  async setupCors(): Promise<void> {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ];

    await this.client.send(
      new PutBucketCorsCommand({
        Bucket: this.bucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: allowedOrigins,
              AllowedMethods: ['GET', 'HEAD', 'PUT'],
              AllowedHeaders: ['*'],
              ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      })
    );
  }

  getCdnUrl(key: string): string {
    return this.getUrl(key);
  }

  /**
   * Generates a presigned URL for downloading a file
   * @param key - The file key in the bucket
   * @param expiresIn - URL expiration time in seconds (default: 3600)
   * @returns Presigned download URL
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Get the public URL for an asset
   * Uses direct CDN access (requires CORS configuration)
   * Falls back to API proxy if R2_SERVE_MODE=proxy is set
   * @param fileName - The file name/path in the bucket
   * @param origin - Optional origin header for proxy mode URL construction
   * @returns Public URL for the asset (either CDN or proxy URL)
   * @throws {Error} If R2_SERVE_MODE has an invalid value
   */
  getAssetUrl(fileName: string, origin?: string): string {
    const mode = process.env.R2_SERVE_MODE || 'cdn';

    if (!['cdn', 'proxy'].includes(mode)) {
      throw new Error(
        `Invalid R2_SERVE_MODE: ${mode}. Must be 'cdn' or 'proxy'`
      );
    }

    if (mode === 'proxy') {
      // Use API proxy (for development or when CORS isn't configured)
      // Validate origin against allowlist if provided
      const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [];
      const validatedOrigin =
        origin && ALLOWED_ORIGINS.includes(origin) ? origin : undefined;
      const baseUrl =
        validatedOrigin ||
        process.env.NEXT_PUBLIC_APP_URL ||
        'http://localhost:3000';
      return `${baseUrl}/api/assets/${fileName}`;
    }

    // Use direct CDN (production, requires CORS)
    return this.getUrl(fileName);
  }
}
