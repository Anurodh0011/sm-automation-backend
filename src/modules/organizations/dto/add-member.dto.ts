import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from "class-validator";
import { Role } from "@prisma/client";

export class AddMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role = Role.MEMBER;
}
