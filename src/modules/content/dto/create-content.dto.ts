import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { ContentType, TargetPlatform } from "@prisma/client";

export class CreateContentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
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
}
