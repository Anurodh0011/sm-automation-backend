import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from "class-validator";

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug must contain only lowercase letters, numbers, and hyphens",
  })
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
