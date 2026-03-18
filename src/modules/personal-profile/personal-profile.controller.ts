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
import { PersonalProfileService } from './personal-profile.service';
import { ExtractPersonalProfileDto } from './dto/extract-personal-profile.dto';
import { UpdatePersonalProfileDto } from './dto/update-personal-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/ports/jwt-payload.port';

@Controller('personal-profile')
export class PersonalProfileController {
  constructor(
    private readonly personalProfileService: PersonalProfileService
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async get(@Request() req: { user: JwtPayload }) {
    return this.personalProfileService.getByUserId(req.user.sub);
  }

  @Post('extract')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async extract(
    @Request() req: { user: JwtPayload },
    @Body() dto: ExtractPersonalProfileDto
  ) {
    return this.personalProfileService.extractFromText(req.user.sub, dto.text);
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req: { user: JwtPayload },
    @Body() dto: UpdatePersonalProfileDto
  ) {
    return this.personalProfileService.update(req.user.sub, dto);
  }
}
