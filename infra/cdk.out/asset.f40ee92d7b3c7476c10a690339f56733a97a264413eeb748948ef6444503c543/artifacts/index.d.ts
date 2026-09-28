import { S3Client } from "@aws-sdk/client-s3";
export declare function getS3Client(): S3Client;
export interface ArtifactUploadResult {
    artifactId: string;
    s3Key: string;
    uploadUrl?: string;
    multipartUploadId?: string;
}
export declare function uploadArtifact(workTreeId: string, taskId: string | undefined, fileName: string, content: Buffer | Uint8Array, contentType: string, metadata?: Record<string, string>): Promise<ArtifactUploadResult>;
export declare function getArtifactSignedUrl(s3Key: string, expiresIn?: number): Promise<string>;
export declare function deleteArtifact(s3Key: string): Promise<void>;
export declare function createMultipartUpload(workTreeId: string, taskId: string | undefined, fileName: string, contentType: string): Promise<{
    uploadId: string;
    s3Key: string;
}>;
export declare function uploadPart(s3Key: string, uploadId: string, partNumber: number, content: Buffer | Uint8Array): Promise<string>;
export declare function completeMultipartUpload(s3Key: string, uploadId: string, parts: Array<{
    PartNumber: number;
    ETag: string;
}>): Promise<void>;
export declare function abortMultipartUpload(s3Key: string, uploadId: string): Promise<void>;
