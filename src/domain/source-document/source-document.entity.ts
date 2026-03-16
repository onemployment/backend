export interface SourceDocument {
  id: string;
  userId: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
}
