import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UsernameSuggestionsUtil } from './utils/username-suggestions.util';
import { AuthModule } from '../auth/auth.module';
import { PrismaPersistenceModule } from '../../infrastructure/persistence/prisma/prisma-persistence.module';

@Module({
  imports: [PrismaPersistenceModule, AuthModule],
  controllers: [UserController],
  providers: [UserService, UsernameSuggestionsUtil],
})
export class UserModule {}
