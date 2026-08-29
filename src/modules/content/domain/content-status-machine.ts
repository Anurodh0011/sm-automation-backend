import { BadRequestException } from "@nestjs/common";
import { ContentStatus } from "@prisma/client";

export const VALID_STATUS_TRANSITIONS: Record<ContentStatus, ContentStatus[]> =
  {
    [ContentStatus.DRAFT]: [
      ContentStatus.GENERATED,
      ContentStatus.IN_REVIEW,
      ContentStatus.ARCHIVED,
    ],
    [ContentStatus.GENERATED]: [
      ContentStatus.IN_REVIEW,
      ContentStatus.DRAFT,
      ContentStatus.ARCHIVED,
    ],
    [ContentStatus.IN_REVIEW]: [
      ContentStatus.APPROVED,
      ContentStatus.DRAFT,
      ContentStatus.ARCHIVED,
    ],
    [ContentStatus.APPROVED]: [
      ContentStatus.ARCHIVED,
      ContentStatus.IN_REVIEW,
      ContentStatus.DRAFT,
    ],
    [ContentStatus.ARCHIVED]: [ContentStatus.DRAFT],
  };

export class ContentStatusMachine {
  static canTransition(
    currentStatus: ContentStatus,
    newStatus: ContentStatus,
  ): boolean {
    if (currentStatus === newStatus) {
      return true; // No status change is allowed
    }

    const allowedTargets = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    return allowedTargets.includes(newStatus);
  }

  static assertValidTransition(
    currentStatus: ContentStatus,
    newStatus: ContentStatus,
  ): void {
    if (!this.canTransition(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid content status transition from '${currentStatus}' to '${newStatus}'. Allowed target statuses from '${currentStatus}' are: [${(VALID_STATUS_TRANSITIONS[currentStatus] || []).join(", ")}]`,
      );
    }
  }
}
