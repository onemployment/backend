import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp, TestAppSetup } from '../helpers/utils';
import { PrismaService } from '../../../src/database/prisma.service';

describe('System Health Check Integration Tests', () => {
  let testSetup: TestAppSetup;
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    testSetup = await createTestApp();
    app = testSetup.app;
    prismaService = testSetup.prismaService;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health - System Health Check', () => {
    it('should return health status with all required fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('details');
    });

    it('should report database as healthy', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.info.database.status).toBe('up');
    });

    it('should respond quickly', async () => {
      const startTime = Date.now();
      await request(app.getHttpServer()).get('/api/v1/health').expect(200);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app.getHttpServer()).get('/api/v1/health').expect(200)
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.body.status).toBe('ok');
        expect(response.body).toHaveProperty('info');
        expect(response.body).toHaveProperty('details');
      });
    });

    it('should be accessible without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should return consistent structure across requests', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);
      const response2 = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(Object.keys(response1.body).sort()).toEqual(
        Object.keys(response2.body).sort()
      );
      expect(response1.body.status).toBe(response2.body.status);
    });
  });

  describe('System Endpoints Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/nonexistent')
        .expect(404);
      await request(app.getHttpServer())
        .get('/api/v1/health/detailed')
        .expect(404);
    });

    it('should handle malformed requests gracefully', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Accept', 'invalid/type')
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('User-Agent', 'malicious<script>alert(1)</script>')
        .expect(200);
    });
  });

  describe('Database Connectivity Validation', () => {
    it('should maintain database connection during health checks', async () => {
      await request(app.getHttpServer()).get('/api/v1/health').expect(200);

      await expect(
        prismaService.$queryRaw`SELECT 1`
      ).resolves.toBeDefined();
    });

    it('should handle health checks with active database operations', async () => {
      const dbOperation = prismaService.user.findMany();
      const healthCheck = request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      const [users, healthResponse] = await Promise.all([
        dbOperation,
        healthCheck,
      ]);

      expect(Array.isArray(users)).toBe(true);
      expect(healthResponse.body.status).toBe('ok');
    });
  });

  describe('Performance Monitoring', () => {
    it('should maintain consistent response times under load', async () => {
      const requestTimes: number[] = [];

      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await request(app.getHttpServer()).get('/api/v1/health').expect(200);
        const responseTime = Date.now() - startTime;
        requestTimes.push(responseTime);
      }

      requestTimes.forEach((time) => {
        expect(time).toBeLessThan(1000);
      });

      const avgResponseTime =
        requestTimes.reduce((sum, time) => sum + time, 0) / requestTimes.length;
      expect(avgResponseTime).toBeLessThan(500);
    });
  });

  describe('Integration with Authentication System', () => {
    it('should work independently of authentication status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);
      expect(response.body.status).toBe('ok');

      const responseWithInvalidToken = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(200);
      expect(responseWithInvalidToken.body.status).toBe('ok');

      const responseWithMalformedAuth = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Authorization', 'Malformed Auth Header')
        .expect(200);
      expect(responseWithMalformedAuth.body.status).toBe('ok');
    });
  });
});
