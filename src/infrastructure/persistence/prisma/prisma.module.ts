import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.client';
import { PrismaUserRepository } from './user.repository';
import { USER_REPOSITORY } from '../../../domain/user/user.repository.port';

@Module({
  providers: [
    PrismaService,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [PrismaService, USER_REPOSITORY],
})
export class PrismaModule {}
