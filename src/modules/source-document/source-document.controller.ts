import {
  Controller,
  Post,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SourceDocumentService } from './source-document.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/ports/jwt-payload.port';

@Controller('source-documents')
export class SourceDocumentController {
  constructor(private readonly sourceDocumentService: SourceDocumentService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(201)
  async upload(
    @Request() req: { user: JwtPayload },
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const doc = await this.sourceDocumentService.uploadSourceDocument(
      req.user.sub,
      file.buffer,
      file.originalname,
      file.mimetype,
      file.size
    );

    return {
      message: 'Source document uploaded successfully',
      sourceDocument: {
        id: doc.id,
        originalFilename: doc.originalFilename,
        sizeBytes: doc.sizeBytes,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      },
    };
  }
}
