import { Request, Response } from 'express';
import { User } from '@prisma/client';
import { LoginRequest, LoginResponse } from './auth.schema';
import { IAuthService } from './contracts/auth.service.contract';

export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  public loginUser = async (req: Request, res: Response): Promise<void> => {
    const credentials = req.body as LoginRequest;

    // Service returns domain model + token
    const { user, token } = await this.authService.loginUser(credentials);

    // Controller shapes API response (consistent with UserController)
    const response: LoginResponse = {
      message: 'Login successful',
      token,
      user: this.transformUserToAPI(user), // Same transformation as UserController
    };

    res.status(200).json(response);
  };

  public logoutUser = async (req: Request, res: Response): Promise<void> => {
    // JWT is stateless, so just return success
    res.status(200).json({ message: 'Logout successful' });
  };

  // CONSISTENT TRANSFORMATION METHOD (same as UserController)
  private transformUserToAPI(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
    };
  }
}
