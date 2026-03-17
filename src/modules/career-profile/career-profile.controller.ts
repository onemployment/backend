import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { CareerProfileService } from './career-profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/ports/jwt-payload.port';

@Controller('career-profile')
export class CareerProfileController {
  constructor(private readonly careerProfileService: CareerProfileService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async get(@Request() req: { user: JwtPayload }) {
    return this.careerProfileService.getByUserId(req.user.sub);
  }

  @Post('extract')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async extract(@Request() req: { user: JwtPayload }) {
    return this.careerProfileService.extractFromSourceDocument(req.user.sub);
  }
}
