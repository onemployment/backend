import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { CareerProfileService } from './career-profile.service';
import { UpdateCareerProfileDto } from './dto/update-career-profile.dto';
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

  @Put()
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req: { user: JwtPayload },
    @Body() dto: UpdateCareerProfileDto
  ) {
    return this.careerProfileService.updateSections(req.user.sub, dto);
  }

  @Post('extract')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async extract(@Request() req: { user: JwtPayload }) {
    return this.careerProfileService.extractFromSourceDocument(req.user.sub);
  }
}
