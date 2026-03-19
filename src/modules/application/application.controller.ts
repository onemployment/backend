import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/ports/jwt-payload.port';
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get()
  async findAll(@Request() req: { user: JwtPayload }) {
    return this.applicationService.findAllByUserId(req.user.sub);
  }

  @Post()
  async create(
    @Request() req: { user: JwtPayload },
    @Body() dto: CreateApplicationDto
  ) {
    return this.applicationService.create(req.user.sub, dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.applicationService.findById(id, req.user.sub);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Request() req: { user: JwtPayload },
    @Body() dto: UpdateApplicationStatusDto
  ) {
    return this.applicationService.updateStatus(id, req.user.sub, dto);
  }
}
