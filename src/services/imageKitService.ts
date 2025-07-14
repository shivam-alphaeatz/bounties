export interface ImageKitUploadResponse {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  height: number;
  width: number;
  size: number;
  filePath: string;
  fileType: string;
  tags?: string[];
  isPrivateFile: boolean;
  customCoordinates?: string;
  metadata?: Record<string, any>;
}

export interface ImageKitUploadOptions {
  file: File;
  bountyId: string;
  bountyName: string;
  folder?: string;
}

export class ImageKitService {
  private static readonly UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';
  private static readonly API_KEY = 'private_Xnl1m1tdSydoMVUF/8rfCoVnQjw='; // Hardcoded from curl command
  private static readonly FOLDER = '/bounties';

  /**
   * Sanitize filename by removing special characters and spaces
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .toLowerCase()
      .substring(0, 50); // Limit length to 50 characters
  }

  /**
   * Generate filename using bounty name and ID
   */
  private static generateFilename(bountyName: string, bountyId: string, originalFilename: string): string {
    const sanitizedBountyName = this.sanitizeFilename(bountyName);
    const fileExtension = originalFilename.split('.').pop() || 'jpg';
    return `${sanitizedBountyName}-${bountyId}.${fileExtension}`;
  }

  /**
   * Upload file directly to ImageKit using XMLHttpRequest
   */
  static async uploadFile(options: ImageKitUploadOptions): Promise<ImageKitUploadResponse> {
    const { file, bountyId, bountyName, folder = this.FOLDER } = options;

    const filename = this.generateFilename(bountyName, bountyId, file.name);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', filename);
    formData.append('folder', folder);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open('POST', this.UPLOAD_URL, true);
      xhr.setRequestHeader('Authorization', `Basic ${btoa(this.API_KEY + ':')}`);
      
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            const result: ImageKitUploadResponse = JSON.parse(xhr.responseText);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        } else {
          reject(new Error(`ImageKit upload failed: ${xhr.status} ${xhr.statusText} - ${xhr.responseText}`));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error occurred during upload'));
      };
      
      xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          console.log(`Upload progress: ${percentComplete.toFixed(2)}%`);
        }
      };
      
      xhr.send(formData);
    });
  }

  /**
   * Upload file and return just the URL
   */
  static async uploadFileAndGetUrl(options: ImageKitUploadOptions): Promise<string> {
    const result = await this.uploadFile(options);
    return result.url;
  }

  /**
   * Check if ImageKit is properly configured
   */
  static isConfigured(): boolean {
    return true; // Always configured since we're using hardcoded key
  }
} 