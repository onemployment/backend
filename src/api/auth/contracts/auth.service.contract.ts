import { User } from '@prisma/client';
import { LoginRequest } from '../auth.schema';

export abstract class IAuthService {
  // Returns domain model + token, NOT API response shape
  abstract loginUser(
    credentials: LoginRequest
  ): Promise<{ user: User; token: string }>;
}
