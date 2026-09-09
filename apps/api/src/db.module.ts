import { Global, Inject, Module, OnModuleInit } from '@nestjs/common';
import { createDatabaseFromEnv, type AppDatabase } from '@ml-lab/db';

export const DATABASE = Symbol('DATABASE');

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: async () => createDatabaseFromEnv(),
    },
  ],
  exports: [DATABASE],
})
export class DbModule implements OnModuleInit {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}
  onModuleInit() {
    void this.db;
  }
}
