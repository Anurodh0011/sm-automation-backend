import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { ContentStatus, ContentType, TargetPlatform } from "@prisma/client";

export class UpdateContentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @IsOptional()
  @IsEnum(TargetPlatform)
  platform?: TargetPlatform;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}
