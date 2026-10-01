"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getS3Client = getS3Client;
exports.uploadArtifact = uploadArtifact;
exports.getArtifactSignedUrl = getArtifactSignedUrl;
exports.deleteArtifact = deleteArtifact;
exports.createMultipartUpload = createMultipartUpload;
exports.uploadPart = uploadPart;
exports.completeMultipartUpload = completeMultipartUpload;
exports.abortMultipartUpload = abortMultipartUpload;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const config_1 = require("../config");
let s3Client = null;
function getS3Client() {
    if (s3Client) {
        return s3Client;
    }
    const config = (0, config_1.getConfig)();
    s3Client = new client_s3_1.S3Client({ region: config.awsRegion });
    return s3Client;
}
async function uploadArtifact(workTreeId, taskId, fileName, content, contentType, metadata) {
    const config = (0, config_1.getConfig)();
    const client = getS3Client();
    const artifactId = `art-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const s3Key = `work-trees/${workTreeId}/${artifactId}/${fileName}`;
    const command = new client_s3_1.PutObjectCommand({
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
async function getArtifactSignedUrl(s3Key, expiresIn = 3600) {
    const config = (0, config_1.getConfig)();
    const client = getS3Client();
    const command = new client_s3_1.GetObjectCommand({
        Bucket: config.artifactBucketName,
        Key: s3Key,
    });
    return (0, s3_request_presigner_1.getSignedUrl)(client, command, { expiresIn });
}
async function deleteArtifact(s3Key) {
    const config = (0, config_1.getConfig)();
    const client = getS3Client();
    const command = new client_s3_1.DeleteObjectCommand({
        Bucket: config.artifactBucketName,
        Key: s3Key,
    });
    await client.send(command);
}
async function createMultipartUpload(workTreeId, taskId, fileName, contentType) {
    const config = (0, config_1.getConfig)();
    const client = getS3Client();
    const artifactId = `art-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const s3Key = `work-trees/${workTreeId}/${artifactId}/${fileName}`;
    const command = new client_s3_1.CreateMultipartUploadCommand({
        Bucket: config.artifactBucketName,
        Key: s3Key,
        ContentType: contentType,
    });
    const response = await client.send(command);
    return { uploadId: response.UploadId, s3Key };
}
async function uploadPart(s3Key, uploadId, partNumber, content) {
    const config = (0, config_1.getConfig)();
    const client = getS3Client();
    const command = new client_s3_1.UploadPartCommand({
        Bucket: config.artifactBucketName,
        Key: s3Key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: content,
    });
    const response = await client.send(command);
    return response.ETag;
}
async function completeMultipartUpload(s3Key, uploadId, parts) {
    const config = (0, config_1.getConfig)();
    const client = getS3Client();
    const command = new client_s3_1.CompleteMultipartUploadCommand({
        Bucket: config.artifactBucketName,
        Key: s3Key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
    });
    await client.send(command);
}
async function abortMultipartUpload(s3Key, uploadId) {
    const config = (0, config_1.getConfig)();
    const client = getS3Client();
    const command = new client_s3_1.AbortMultipartUploadCommand({
        Bucket: config.artifactBucketName,
        Key: s3Key,
        UploadId: uploadId,
    });
    await client.send(command);
}
