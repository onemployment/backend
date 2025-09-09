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
