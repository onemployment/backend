import { Module } from '@nestjs/common';
import { PrismaUserRepository } from './user.repository';
import { USER_REPOSITORY } from '../../../domain/user/user.repository.port';

@Module({
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [USER_REPOSITORY],
})
export class PrismaPersistenceModule {}
