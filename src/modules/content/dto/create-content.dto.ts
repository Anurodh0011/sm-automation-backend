import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import { ContentStatus, ContentType, TargetPlatform } from "@prisma/client";

export class CreateContentDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType = ContentType.POST;

  @IsOptional()
  @IsEnum(TargetPlatform)
  platform?: TargetPlatform = TargetPlatform.GENERAL;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus = ContentStatus.DRAFT;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}
