import { Request, Response } from 'express';
import { User } from '@prisma/client';
import { IUserService } from './contracts/user.service.contract';
import {
  UserRegistrationRequest,
  UserProfileUpdateRequest,
  UserRegistrationResponse,
  UsernameValidationResponse,
  UserProfileResponse,
} from './user.schema';

export class UserController {
  constructor(private readonly userService: IUserService) {}

  // POST /user - Local user registration
  public registerUser = async (req: Request, res: Response): Promise<void> => {
    const userData = req.body as UserRegistrationRequest;

    // Service returns domain model + token
    const { user, token } = await this.userService.registerUser(userData);

    // Controller shapes the API response
    const response: UserRegistrationResponse = {
      message: 'User created successfully',
      token,
      user: this.transformUserToAPI(user),
    };

    res.status(201).json(response);
  };

  // GET /user/me - Get current user profile
  public getCurrentUser = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.sub;

    // Service returns domain model
    const user = await this.userService.getUserProfile(userId);

    // Controller shapes API response
    const response: UserProfileResponse = {
      user: this.transformUserToAPI(user),
    };

    res.status(200).json(response);
  };

  // PUT /user/me - Update current user profile
  public updateCurrentUser = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.sub;
    const updates = req.body as UserProfileUpdateRequest;

    // Service returns updated domain model
    const user = await this.userService.updateUserProfile(userId, updates);

    // Controller shapes API response
    const response = {
      message: 'Profile updated successfully',
      user: this.transformUserToAPI(user),
    };

    res.status(200).json(response);
  };

  // GET /user/validate/username - Username availability check
  public validateUsername = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { username } = req.query as { username: string };

    if (!username) {
      res.status(400).json({
        available: false,
        message: 'Username parameter is required',
      });
      return;
    }

    // Service returns primitive data
    const { available, suggestions } =
      await this.userService.validateUsername(username);

    // Controller shapes API response
    const response: UsernameValidationResponse = {
      available,
      message: available ? 'Username is available' : 'Username is taken',
      ...(suggestions && { suggestions }),
    };

    res.status(200).json(response);
  };

  // GET /user/validate/email - Email availability check
  public validateEmail = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.query as { email: string };

    if (!email) {
      res.status(400).json({
        available: false,
        message: 'Email parameter is required',
      });
      return;
    }

    // Service returns primitive data
    const { available } = await this.userService.validateEmail(email);

    // Controller shapes API response
    res.status(200).json({
      available,
      message: available
        ? 'Email is available'
        : 'Email already registered. Please sign in instead',
    });
  };

  // GET /user/suggest-usernames - Username suggestions for conflicts
  public suggestUsernames = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { username } = req.query as { username: string };

    if (!username) {
      res.status(400).json({
        suggestions: [],
        message: 'Username parameter is required',
      });
      return;
    }

    // Service returns primitive array
    const suggestions = await this.userService.suggestUsernames(username);

    // Controller shapes API response
    res.status(200).json({ suggestions });
  };

  // CONSISTENT TRANSFORMATION METHOD
  private transformUserToAPI(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      accountCreationMethod: user.accountCreationMethod,
      createdAt: user.createdAt.toISOString(), // Transform Date → ISO string
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
    };
  }
}
