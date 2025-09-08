# Revised Phase 2: Local Authentication Implementation Plan

## Architectural Consistency - Approach 2

**Service Layer**: Returns domain models (User entities, primitives) - HTTP-agnostic
**Controller Layer**: Shapes HTTP responses, handles API contracts, applies transformations

## Detailed File Structure & Implementation Plan

### 1. Utility Components (Build First)

#### `src/api/auth/utils/jwt.util.ts`

```typescript
export interface JWTPayload {
  sub: string; // user.id
  email: string;
  username: string;
  iss: string; // "onemployment-auth"
  aud: string; // "onemployment-api"
  iat: number;
  exp: number;
}

export class JWTUtil {
  private readonly secret: string;
  private readonly issuer = 'onemployment-auth';
  private readonly audience = 'onemployment-api';
  private readonly expiresIn = '8h';

  generateToken(user: User): Promise<string>;
  validateToken(token: string): Promise<JWTPayload>;
  extractPayload(token: string): JWTPayload | null;
}
```

#### `src/api/user/utils/validation.util.ts`

```typescript
export class ValidationUtil {
  // Email validation (toLowerCase transformation)
  static validateEmail(email: string): boolean;
  static sanitizeEmail(email: string): string;

  // Username validation (GitHub pattern: 1-39 chars, alphanumeric + hyphens)
  static validateUsername(username: string): boolean;
  static isReservedUsername(username: string): boolean; // admin, api, www, etc.

  // Password complexity validation
  static validatePassword(password: string): boolean;
  static checkPasswordComplexity(password: string): string[]; // return error list

  // Name validation (letters, spaces, hyphens, apostrophes, dots)
  static validateName(name: string): boolean;
  static sanitizeName(name: string): string;
}
```

#### `src/api/user/utils/username-suggestions.util.ts`

```typescript
export class UsernameSuggestionsUtil {
  constructor(private userRepository: IUserRepository) {}

  // Generate sequential numbered suggestions: username → username2, username3, username4
  async generateSuggestions(
    baseUsername: string,
    count: number = 3
  ): Promise<string[]>;

  // Check availability of a single username (case-insensitive)
  async isUsernameAvailable(username: string): Promise<boolean>;

  // Get first available suggestion from generated list
  async getFirstAvailable(baseUsername: string): Promise<string>;
}
```

### 2. Enhanced Schema Files (API Response Types)

#### `src/api/auth/auth.schema.ts` (UPDATED)

```typescript
// LOGIN REQUEST/RESPONSE SCHEMAS (email-based, not username-based)

export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((s) => s.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

// API Response Schema (shaped by controller)
export const loginResponseSchema = z.object({
  message: z.string(),
  token: z.string(), // JWT token
  user: z.object({
    id: z.string(),
    email: z.string(),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string().nullable(),
    emailVerified: z.boolean(),
    createdAt: z.string(), // ISO 8601 string
    lastLoginAt: z.string().nullable(),
  }),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;

// Remove registerSchema - moved to user domain
```

#### `src/api/user/user.schema.ts` (NEW FILE)

```typescript
// USER REGISTRATION SCHEMA
export const userRegistrationSchema = z.object({
  email: z
    .string()
    .email()
    .max(255)
    .transform((s) => s.toLowerCase()),
  password: z
    .string()
    .min(8)
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  username: z
    .string()
    .min(1)
    .max(39)
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/),
  firstName: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z\s\-'\.]+$/),
  lastName: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z\s\-'\.]+$/),
});

// USER PROFILE UPDATE SCHEMA
export const userProfileUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(200).nullable().optional(),
});

// API RESPONSE SCHEMAS (shaped by controllers)
export const userRegistrationResponseSchema = z.object({
  message: z.string(),
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string().nullable(),
    emailVerified: z.boolean(),
    accountCreationMethod: z.string(),
    createdAt: z.string(),
    lastLoginAt: z.string().nullable(),
  }),
});

export const usernameValidationResponseSchema = z.object({
  available: z.boolean(),
  message: z.string(),
  suggestions: z.array(z.string()).optional(), // only if available = false
});

export const userProfileResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string().nullable(),
    emailVerified: z.boolean(),
    accountCreationMethod: z.string(),
    createdAt: z.string(),
    lastLoginAt: z.string().nullable(),
  }),
});

export type UserRegistrationRequest = z.infer<typeof userRegistrationSchema>;
export type UserProfileUpdateRequest = z.infer<typeof userProfileUpdateSchema>;
export type UserRegistrationResponse = z.infer<
  typeof userRegistrationResponseSchema
>;
export type UsernameValidationResponse = z.infer<
  typeof usernameValidationResponseSchema
>;
export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;
```

### 3. User Domain Implementation (NEW) - Service Returns Domain Models

#### `src/api/user/user.repository.ts` (NEW FILE)

```typescript
export interface IUserRepository {
  // User creation (returns domain model)
  createUser(userData: UserCreationData): Promise<User>;

  // Profile management (returns domain models)
  findById(id: string): Promise<User | null>;
  updateProfile(id: string, updates: ProfileUpdateData): Promise<User>;

  // Validation queries (returns primitives)
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  isEmailTaken(email: string): Promise<boolean>;
  isUsernameTaken(username: string): Promise<boolean>; // case-insensitive check

  // Username conflict resolution (returns domain models)
  findUsersByUsernamePrefix(prefix: string): Promise<User[]>;
}

export interface UserCreationData {
  email: string;
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  accountCreationMethod: 'local' | 'google';
}

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  displayName?: string | null;
}

export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async createUser(userData: UserCreationData): Promise<User> {
    return await this.prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        passwordHash: userData.passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        accountCreationMethod: userData.accountCreationMethod,
        lastPasswordChange: new Date(), // Set for local accounts
      },
    });
  }

  // Uses indexes for performance: email, username, LOWER(username)
  // All other methods return domain models or primitives, not API shapes
}
```

#### `src/api/user/user.service.ts` (NEW FILE) - Returns Domain Models

```typescript
export interface IUserService {
  // Returns domain models + primitives, NOT API response shapes
  registerUser(
    userData: UserRegistrationRequest
  ): Promise<{ user: User; token: string }>;
  getUserProfile(userId: string): Promise<User>;
  updateUserProfile(
    userId: string,
    updates: UserProfileUpdateRequest
  ): Promise<User>;

  // Validation services return primitive data structures
  validateUsername(
    username: string
  ): Promise<{ available: boolean; suggestions?: string[] }>;
  validateEmail(email: string): Promise<{ available: boolean }>;
  suggestUsernames(baseUsername: string): Promise<string[]>;
}

export class UserService implements IUserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordStrategy: IPasswordStrategy,
    private readonly jwtUtil: JWTUtil,
    private readonly usernameSuggestionsUtil: UsernameSuggestionsUtil
  ) {}

  async registerUser(
    userData: UserRegistrationRequest
  ): Promise<{ user: User; token: string }> {
    // 1. Validate email uniqueness
    if (await this.userRepository.isEmailTaken(userData.email)) {
      throw new ConflictError(
        'Email already registered. Please sign in instead'
      );
    }

    // 2. Validate username uniqueness (case-insensitive)
    if (await this.userRepository.isUsernameTaken(userData.username)) {
      throw new ConflictError('Username already taken');
    }

    // 3. Hash password
    const passwordHash = await this.passwordStrategy.hash(userData.password);

    // 4. Create user (returns domain model)
    const user = await this.userRepository.createUser({
      email: userData.email,
      username: userData.username,
      passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      accountCreationMethod: 'local',
    });

    // 5. Generate JWT token
    const token = await this.jwtUtil.generateToken(user);

    // Return domain model + token (not API response shape)
    return { user, token };
  }

  async getUserProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user; // Return domain model
  }

  async validateUsername(
    username: string
  ): Promise<{ available: boolean; suggestions?: string[] }> {
    const available =
      await this.usernameSuggestionsUtil.isUsernameAvailable(username);

    if (!available) {
      const suggestions =
        await this.usernameSuggestionsUtil.generateSuggestions(username);
      return { available: false, suggestions };
    }

    return { available: true }; // No API response shaping here
  }

  // Other methods return domain models or primitives...
}
```

#### `src/api/user/user.controller.ts` (NEW FILE) - Shapes API Responses

```typescript
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
    const userId = (req as any).user.sub;

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
    const userId = (req as any).user.sub;
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
```

### 4. Enhanced Authentication Domain (CONSISTENT PATTERNS)

#### `src/api/auth/auth.repository.ts` (UPDATED) - Returns Domain Models

```typescript
export interface IAuthRepository {
  // Returns domain models, not API response shapes
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;

  // Activity tracking (void/primitives)
  updateLastLogin(userId: string): Promise<void>;

  // Account linking (returns domain model)
  linkGoogleAccount(userId: string, googleId: string): Promise<User>;
}

export class AuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  public async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  // All methods return domain models or primitives, no API shapes
}
```

#### `src/api/auth/auth.service.ts` (UPDATED) - Returns Domain Models

```typescript
export interface IAuthService {
  // Returns domain model + token, NOT API response shape
  loginUser(credentials: LoginRequest): Promise<{ user: User; token: string }>;
}

export class AuthService implements IAuthService {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly passwordStrategy: IPasswordStrategy,
    private readonly jwtUtil: JWTUtil
  ) {}

  async loginUser(
    credentials: LoginRequest
  ): Promise<{ user: User; token: string }> {
    // 1. Find user by email (case-insensitive)
    const user = await this.authRepository.findByEmail(credentials.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 2. Check if user has passwordHash (not OAuth-only account)
    if (!user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 3. Verify password
    const isValid = await this.passwordStrategy.verify(
      credentials.password,
      user.passwordHash
    );
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 4. Update lastLoginAt
    await this.authRepository.updateLastLogin(user.id);

    // 5. Generate JWT token
    const token = await this.jwtUtil.generateToken(user);

    // Return domain model + token (service layer doesn't shape API responses)
    return { user, token };
  }
}
```

#### `src/api/auth/auth.controller.ts` (UPDATED) - Shapes API Responses Consistently

```typescript
export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  public loginUser = async (
    req: Request<object, LoginResponse, LoginRequest>,
    res: Response<LoginResponse | ErrorResponse>
  ): Promise<void> => {
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
    // In future: could implement JWT blacklisting with Redis
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
```

### 5. Route Definitions (CONSISTENT MIDDLEWARE PATTERNS)

#### `src/api/auth/index.ts` (UPDATED)

```typescript
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { requestValidationHandler } from '../../middleware/request-validator.middleware';
import { asyncHandler } from '../../middleware/async-handler.middleware';
import { jwtAuthMiddleware } from '../../middleware/jwt-auth.middleware';
import { loginSchema } from './auth.schema';

export interface AuthDependencies {
  authController: AuthController;
}

export const createAuthRouter = (dependencies: AuthDependencies): Router => {
  const authRouter = Router();
  const { authController } = dependencies;

  // Public routes - consistent pattern
  authRouter.post(
    '/login',
    requestValidationHandler(loginSchema),
    asyncHandler(authController.loginUser)
  );

  // Protected routes - consistent middleware pattern
  authRouter.post(
    '/logout',
    jwtAuthMiddleware,
    asyncHandler(authController.logoutUser)
  );

  return authRouter;
};
```

#### `src/api/user/index.ts` (NEW FILE) - Consistent Middleware Patterns

```typescript
import { Router } from 'express';
import { UserController } from './user.controller';
import { requestValidationHandler } from '../../middleware/request-validator.middleware';
import { asyncHandler } from '../../middleware/async-handler.middleware';
import { jwtAuthMiddleware } from '../../middleware/jwt-auth.middleware';
import { userRegistrationSchema, userProfileUpdateSchema } from './user.schema';

export interface UserDependencies {
  userController: UserController;
}

export const createUserRouter = (dependencies: UserDependencies): Router => {
  const userRouter = Router();
  const { userController } = dependencies;

  // Public routes - same middleware pattern as auth
  userRouter.post(
    '/',
    requestValidationHandler(userRegistrationSchema),
    asyncHandler(userController.registerUser)
  );

  userRouter.get(
    '/validate/username',
    asyncHandler(userController.validateUsername)
  );

  userRouter.get('/validate/email', asyncHandler(userController.validateEmail));

  userRouter.get(
    '/suggest-usernames',
    asyncHandler(userController.suggestUsernames)
  );

  // Protected routes - same middleware pattern as auth
  userRouter.get(
    '/me',
    jwtAuthMiddleware,
    asyncHandler(userController.getCurrentUser)
  );

  userRouter.put(
    '/me',
    jwtAuthMiddleware,
    requestValidationHandler(userProfileUpdateSchema),
    asyncHandler(userController.updateCurrentUser)
  );

  return userRouter;
};
```

### 6. JWT Auth Middleware (CONSISTENT ACROSS DOMAINS)

#### `src/middleware/jwt-auth.middleware.ts` (NEW FILE)

```typescript
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../common/error/http-errors';
import { JWTUtil } from '../api/auth/utils/jwt.util';

// Consistent middleware pattern used by both domains
export const createJwtAuthMiddleware = (jwtUtil: JWTUtil) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedError('No token provided');
      }

      const token = authHeader.substring(7);
      const payload = await jwtUtil.validateToken(token);

      // Attach user info to request - used consistently by both domains
      (req as any).user = payload;
      next();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        next(error);
      } else {
        next(new UnauthorizedError('Invalid token'));
      }
    }
  };
};

// Export singleton for consistent usage
export let jwtAuthMiddleware: ReturnType<typeof createJwtAuthMiddleware>;

export const initializeJwtMiddleware = (jwtUtil: JWTUtil) => {
  jwtAuthMiddleware = createJwtAuthMiddleware(jwtUtil);
};
```

### 7. Updated Main API Router (CONSISTENT DOMAIN MOUNTING)

#### `src/api/index.ts` (UPDATED)

```typescript
import { Router } from 'express';
import { AuthController } from './auth/auth.controller';
import { UserController } from './user/user.controller';
import { createAuthRouter } from './auth';
import { createUserRouter } from './user';

export interface AppDependencies {
  authController: AuthController;
  userController: UserController;
}

export const createApiRouter = (dependencies: AppDependencies): Router => {
  const apiRouter = Router();

  // Mount domain routers consistently
  apiRouter.use(
    '/auth',
    createAuthRouter({
      authController: dependencies.authController,
    })
  );

  apiRouter.use(
    '/user',
    createUserRouter({
      userController: dependencies.userController,
    })
  );

  return apiRouter;
};
```

## Key Architectural Consistency Points

### 1. **Layered Responsibility (Both Domains)**

- **Repository**: Database operations → Domain models
- **Service**: Business logic → Domain models + primitives
- **Controller**: HTTP handling → API response shapes

### 2. **Consistent Transformation Pattern**

Both `AuthController` and `UserController` use identical `transformUserToAPI()` method

### 3. **Consistent Middleware Pattern**

Both domains use same middleware chain: `requestValidationHandler` → `jwtAuthMiddleware` → `asyncHandler`

### 4. **Consistent Error Handling**

Both domains throw same error types, handled by same error middleware

### 5. **Consistent Route Structure**

Both domains use same `create[Domain]Router` pattern with dependency injection

This approach ensures both domains follow identical architectural patterns while maintaining proper separation of concerns!
