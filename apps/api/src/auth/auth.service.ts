import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { learnerMemory, learnerProfiles, users, type AppDatabase } from '@ml-lab/db';
import { DATABASE } from '../db.module';

const ROUNDS = process.env.NODE_ENV === 'test' || process.env.DATABASE_DRIVER === 'pglite' ? 4 : 10;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly db: AppDatabase,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string, name?: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@') || password.length < 8) {
      throw new UnauthorizedException('Email and a password of at least 8 characters are required');
    }
    const existing = await this.db.select().from(users).where(eq(users.email, normalized));
    if (existing.length > 0) throw new ConflictException('Email already registered');
    const id = randomUUID();
    const passwordHash = await hash(password, ROUNDS);
    await this.db.insert(users).values({ id, email: normalized, passwordHash, name: name ?? null });
    await this.db.insert(learnerProfiles).values({ userId: id });
    await this.db.insert(learnerMemory).values({ userId: id });
    return this.issue(id, normalized, name ?? null);
  }

  async login(email: string, password: string) {
    const normalized = email.trim().toLowerCase();
    const rows = await this.db.select().from(users).where(eq(users.email, normalized));
    const user = rows[0];
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.issue(user.id, user.email, user.name);
  }

  async me(userId: string) {
    const rows = await this.db.select().from(users).where(eq(users.id, userId));
    const user = rows[0];
    if (!user) throw new UnauthorizedException();
    const profiles = await this.db.select().from(learnerProfiles).where(eq(learnerProfiles.userId, userId));
    return {
      user: { id: user.id, email: user.email, name: user.name },
      profile: profiles[0] ?? null,
    };
  }

  private issue(id: string, email: string, name: string | null) {
    const token = this.jwt.sign({ sub: id, email });
    return { token, user: { id, email, name } };
  }
}
