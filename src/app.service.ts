import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return "Hello World!";
  }

  async checkDatabaseHealth() {
    await this.prisma.$queryRaw`SELECT 1`;
    const userCount = await this.prisma.user.count();
    const contentCount = await this.prisma.content.count();

    return {
      status: "connected",
      database: "PostgreSQL",
      counts: {
        users: userCount,
        contents: contentCount,
      },
    };
  }
}
