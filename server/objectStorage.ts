import { Response } from "express";
import { randomUUID } from "crypto";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// Simplified object storage service for development
export class ObjectStorageService {
  constructor() {}

  // For now, return mock upload URL for development
  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    // Return a mock upload URL that we can use for development
    return `https://storage.mock.com/uploads/${objectId}`;
  }

  // Placeholder for object file retrieval
  async getObjectEntityFile(objectPath: string): Promise<any> {
    // For development, we'll just validate the path format
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    
    // Return a mock file object
    return {
      path: objectPath,
      exists: true
    };
  }

  // Normalize object path from URL to internal format
  normalizeObjectEntityPath(rawPath: string): string {
    // If it's already in the internal format, return as-is
    if (rawPath.startsWith("/objects/")) {
      return rawPath;
    }
    
    // If it's a mock upload URL, convert to internal format
    if (rawPath.includes("storage.mock.com/uploads/")) {
      const filename = rawPath.split("/uploads/")[1];
      return `/objects/${filename}`;
    }
    
    return rawPath;
  }

  // Mock file download for development
  async downloadObject(file: any, res: Response, cacheTtlSec: number = 3600) {
    // For development, return a placeholder response
    res.set({
      "Content-Type": "application/pdf",
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    });
    res.send("Mock file content - Object storage will be implemented with real files");
  }

  // Mock public object search
  async searchPublicObject(filePath: string): Promise<any> {
    // For development, return a mock file if the path looks valid
    if (filePath && filePath.length > 0) {
      return {
        path: filePath,
        exists: true
      };
    }
    return null;
  }
}