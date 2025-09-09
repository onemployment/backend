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
