import { Controller, Post, UseGuards, Request, HttpCode } from '@nestjs/common';
import { CareerProfileService } from './career-profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/ports/jwt-payload.port';

@Controller('career-profile')
export class CareerProfileController {
  constructor(private readonly careerProfileService: CareerProfileService) {}

  @Post('extract')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async extract(@Request() req: { user: JwtPayload }) {
    return this.careerProfileService.extractFromSourceDocument(req.user.sub);
  }
}
