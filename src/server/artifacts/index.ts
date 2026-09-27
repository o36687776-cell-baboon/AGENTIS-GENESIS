import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getConfig } from "../config";

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (s3Client) {
    return s3Client;
  }

  const config = getConfig();
  s3Client = new S3Client({ region: config.awsRegion });
  return s3Client;
}

export interface ArtifactUploadResult {
  artifactId: string;
  s3Key: string;
  uploadUrl?: string;
  multipartUploadId?: string;
}

export async function uploadArtifact(
  workTreeId: string,
  taskId: string | undefined,
  fileName: string,
  content: Buffer | Uint8Array,
  contentType: string,
  metadata?: Record<string, string>
): Promise<ArtifactUploadResult> {
  const config = getConfig();
  const client = getS3Client();
  const artifactId = `art-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const s3Key = `work-trees/${workTreeId}/${artifactId}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: config.artifactBucketName,
    Key: s3Key,
    Body: content,
    ContentType: contentType,
    Metadata: {
      workTreeId,
      taskId: taskId || "",
      artifactId,
      ...metadata,
    },
  });

  await client.send(command);

  return { artifactId, s3Key };
}

export async function getArtifactSignedUrl(
  s3Key: string,
  expiresIn = 3600
): Promise<string> {
  const config = getConfig();
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: config.artifactBucketName,
    Key: s3Key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function deleteArtifact(s3Key: string): Promise<void> {
  const config = getConfig();
  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: config.artifactBucketName,
    Key: s3Key,
  });

  await client.send(command);
}

export async function createMultipartUpload(
  workTreeId: string,
  taskId: string | undefined,
  fileName: string,
  contentType: string
): Promise<{ uploadId: string; s3Key: string }> {
  const config = getConfig();
  const client = getS3Client();
  const artifactId = `art-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const s3Key = `work-trees/${workTreeId}/${artifactId}/${fileName}`;

  const command = new CreateMultipartUploadCommand({
    Bucket: config.artifactBucketName,
    Key: s3Key,
    ContentType: contentType,
  });

  const response = await client.send(command);
  return { uploadId: response.UploadId!, s3Key };
}

export async function uploadPart(
  s3Key: string,
  uploadId: string,
  partNumber: number,
  content: Buffer | Uint8Array
): Promise<string> {
  const config = getConfig();
  const client = getS3Client();

  const command = new UploadPartCommand({
    Bucket: config.artifactBucketName,
    Key: s3Key,
    UploadId: uploadId,
    PartNumber: partNumber,
    Body: content,
  });

  const response = await client.send(command);
  return response.ETag!;
}

export async function completeMultipartUpload(
  s3Key: string,
  uploadId: string,
  parts: Array<{ PartNumber: number; ETag: string }>
): Promise<void> {
  const config = getConfig();
  const client = getS3Client();

  const command = new CompleteMultipartUploadCommand({
    Bucket: config.artifactBucketName,
    Key: s3Key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });

  await client.send(command);
}

export async function abortMultipartUpload(s3Key: string, uploadId: string): Promise<void> {
  const config = getConfig();
  const client = getS3Client();

  const command = new AbortMultipartUploadCommand({
    Bucket: config.artifactBucketName,
    Key: s3Key,
    UploadId: uploadId,
  });

  await client.send(command);
}