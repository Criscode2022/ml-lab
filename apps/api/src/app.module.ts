import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { join } from 'node:path';
import { DbModule } from './db.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { LearningModule } from './learning/learning.module';
import { SandboxController } from './sandbox.controller';
import { AiController } from './ai.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '../../.env'),
        join(__dirname, '../../../.env'),
      ],
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret-change-me-32ch',
      signOptions: { expiresIn: '7d' },
    }),
    DbModule,
    AuthModule,
    LearningModule,
  ],
  controllers: [HealthController, SandboxController, AiController],
})
export class AppModule {}
