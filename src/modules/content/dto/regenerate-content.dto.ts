import { IsOptional, IsString } from "class-validator";

export class RegenerateContentDto {
  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  prompt?: string;
}
