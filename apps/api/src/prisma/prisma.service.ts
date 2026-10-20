import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { loadEnv } from '../config/env';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ datasourceUrl: loadEnv().databaseUrl });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
