import { SourceDocument } from './source-document.entity';

export const SOURCE_DOCUMENT_REPOSITORY = Symbol('ISourceDocumentRepository');

export interface SourceDocumentUpsertData {
  userId: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ISourceDocumentRepository {
  findByUserId(userId: string): Promise<SourceDocument | null>;
  upsert(data: SourceDocumentUpsertData): Promise<SourceDocument>;
  deleteByUserId(userId: string): Promise<void>;
}
