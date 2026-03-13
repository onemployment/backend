import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UsernameSuggestionsUtil } from './utils/username-suggestions.util';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../infrastructure/persistence/prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UserController],
  providers: [UserService, UsernameSuggestionsUtil],
})
export class UserModule {}
