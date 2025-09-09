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
