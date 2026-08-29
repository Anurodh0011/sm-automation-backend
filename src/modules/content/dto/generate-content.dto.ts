import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { ContentType, TargetPlatform } from "@prisma/client";

export class GenerateContentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  topic!: string;

  @IsOptional()
  @IsEnum(TargetPlatform)
  platform?: TargetPlatform = TargetPlatform.GENERAL;

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType = ContentType.POST;

  @IsOptional()
  @IsString()
  tone?: string = "Professional";

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}
