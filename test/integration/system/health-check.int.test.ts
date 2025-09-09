import request from 'supertest';
import { Application } from 'express';
import { createTestApp, TestAppSetup } from '../helpers/utils';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';

const globalWithPostgres = global as typeof globalThis & {
  postgresContainer: StartedPostgreSqlContainer;
  prismaClient: PrismaClient;
};

describe('System Health Check Integration Tests', () => {
  let testSetup: TestAppSetup;
  let app: Application;

  beforeEach(() => {
    testSetup = createTestApp(globalWithPostgres.prismaClient);
    app = testSetup.app;
  });

  describe('GET /health - System Health Check', () => {
    it('should return health status with all required fields', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
    });

    it('should return valid timestamp format', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 5000); // Within last 5 seconds
    });

    it('should return numeric uptime', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should return environment information', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(typeof response.body.environment).toBe('string');
      expect(response.body.environment).toBeTruthy();
    });

    it('should respond quickly', async () => {
      const startTime = Date.now();
      await request(app).get('/health').expect(200);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).get('/health').expect(200));

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.body.status).toBe('ok');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('environment');
      });
    });

    it('should be accessible without authentication', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should return consistent structure across requests', async () => {
      const response1 = await request(app).get('/health').expect(200);
      const response2 = await request(app).get('/health').expect(200);

      // Structure should be the same
      expect(Object.keys(response1.body).sort()).toEqual(
        Object.keys(response2.body).sort()
      );

      // Status and environment should be consistent
      expect(response1.body.status).toBe(response2.body.status);
      expect(response1.body.environment).toBe(response2.body.environment);

      // Uptime should increase (or be equal if very fast)
      expect(response2.body.uptime).toBeGreaterThanOrEqual(
        response1.body.uptime
      );
    });
  });

  describe('GET /version - Version Information', () => {
    it('should return version information', async () => {
      const response = await request(app).get('/version').expect(200);

      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('build');
      expect(typeof response.body.version).toBe('string');
      expect(typeof response.body.build).toBe('string');
    });

    it('should return valid build timestamp', async () => {
      const response = await request(app).get('/version').expect(200);

      const buildTimestamp = new Date(response.body.build);
      expect(buildTimestamp).toBeInstanceOf(Date);
      expect(buildTimestamp.getTime()).toBeGreaterThan(Date.now() - 60000); // Within last minute
    });

    it('should be accessible without authentication', async () => {
      const response = await request(app).get('/version').expect(200);

      expect(response.body).toHaveProperty('version');
    });
  });

  describe('System Endpoints Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await request(app).get('/nonexistent').expect(404);
      await request(app).get('/api/v1/nonexistent').expect(404);
      await request(app).get('/health/detailed').expect(404);
    });

    it('should handle malformed requests gracefully', async () => {
      // Test with various malformed requests
      await request(app)
        .get('/health')
        .set('Accept', 'invalid/type')
        .expect(200); // Should still return health check

      await request(app)
        .get('/health')
        .set('User-Agent', 'malicious<script>alert(1)</script>')
        .expect(200); // Should still return health check
    });
  });

  describe('Database Connectivity Validation', () => {
    it('should maintain database connection during health checks', async () => {
      // Perform health check
      await request(app).get('/health').expect(200);

      // Verify database is still accessible
      await expect(
        testSetup.prismaClient.$queryRaw`SELECT 1`
      ).resolves.toBeDefined();
    });

    it('should handle health checks with active database operations', async () => {
      // Start a database operation
      const dbOperation = testSetup.prismaClient.user.findMany();

      // Perform health check concurrently
      const healthCheck = request(app).get('/health').expect(200);

      // Both should complete successfully
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

      // Make multiple sequential requests
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await request(app).get('/health').expect(200);
        const responseTime = Date.now() - startTime;
        requestTimes.push(responseTime);
      }

      // All response times should be reasonable
      requestTimes.forEach((time) => {
        expect(time).toBeLessThan(1000);
      });

      // Calculate average response time
      const avgResponseTime =
        requestTimes.reduce((sum, time) => sum + time, 0) / requestTimes.length;
      expect(avgResponseTime).toBeLessThan(500); // Average should be under 500ms
    });

    it('should handle burst requests efficiently', async () => {
      const startTime = Date.now();

      // Send 20 concurrent requests
      const requests = Array(20)
        .fill(null)
        .map(() => request(app).get('/health').expect(200));

      await Promise.all(requests);

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(5000); // All 20 requests should complete within 5 seconds
    });
  });

  describe('Integration with Authentication System', () => {
    it('should work independently of authentication status', async () => {
      // Health check should work without any authentication setup
      const response = await request(app).get('/health').expect(200);
      expect(response.body.status).toBe('ok');

      // Health check should work with invalid token
      const responseWithInvalidToken = await request(app)
        .get('/health')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(200);
      expect(responseWithInvalidToken.body.status).toBe('ok');

      // Health check should work with malformed auth header
      const responseWithMalformedAuth = await request(app)
        .get('/health')
        .set('Authorization', 'Malformed Auth Header')
        .expect(200);
      expect(responseWithMalformedAuth.body.status).toBe('ok');
    });
  });
});
