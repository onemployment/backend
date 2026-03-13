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
import { ResumeService } from './resume.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/ports/jwt-payload.port';

@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(201)
  async uploadResume(
    @Request() req: { user: JwtPayload },
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const resume = await this.resumeService.uploadResume(
      req.user.sub,
      file.buffer,
      file.originalname,
      file.mimetype,
      file.size
    );

    return {
      message: 'Resume uploaded successfully',
      resume: {
        id: resume.id,
        originalFilename: resume.originalFilename,
        sizeBytes: resume.sizeBytes,
        createdAt: resume.createdAt.toISOString(),
        updatedAt: resume.updatedAt.toISOString(),
      },
    };
  }

  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async analyzeResume(@Request() req: { user: JwtPayload }) {
    return this.resumeService.analyzeResume(req.user.sub);
  }
}
