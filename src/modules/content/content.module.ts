import { Module } from "@nestjs/common";
import { ContentService } from "./content.service";
import { ContentController } from "./content.controller";
import { AiEngineModule } from "../ai-engine/ai-engine.module";
import { UsageModule } from "../usage/usage.module";

@Module({
  imports: [AiEngineModule, UsageModule],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
