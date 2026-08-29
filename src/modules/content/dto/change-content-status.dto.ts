import { IsEnum, IsNotEmpty } from "class-validator";
import { ContentStatus } from "@prisma/client";

export class ChangeContentStatusDto {
  @IsEnum(ContentStatus)
  @IsNotEmpty()
  status!: ContentStatus;
}
