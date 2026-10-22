import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PatientsModule } from './patients/patients.module';
import { ConditionsModule } from './conditions/conditions.module';
import { EncountersModule } from './encounters/encounters.module';
import { FollowUpsModule } from './followups/followups.module';
import { InsurancesModule } from './insurances/insurances.module';
import { VaccinesModule } from './vaccines/vaccines.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { OcrModule } from './ocr/ocr.module';
import { SummaryModule } from './summary/summary.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    ConditionsModule,
    EncountersModule,
    FollowUpsModule,
    InsurancesModule,
    VaccinesModule,
    AttachmentsModule,
    OcrModule,
    SummaryModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
