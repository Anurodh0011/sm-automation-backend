import { BadRequestException } from "@nestjs/common";
import { ContentStatus } from "@prisma/client";
import { ContentStatusMachine } from "./content-status-machine";

describe("ContentStatusMachine (Domain Lifecycle)", () => {
  describe("Valid Transitions", () => {
    it("should allow GENERATED -> IN_REVIEW", () => {
      expect(() =>
        ContentStatusMachine.assertValidTransition(
          ContentStatus.GENERATED,
          ContentStatus.IN_REVIEW,
        ),
      ).not.toThrow();
    });

    it("should allow IN_REVIEW -> APPROVED", () => {
      expect(() =>
        ContentStatusMachine.assertValidTransition(
          ContentStatus.IN_REVIEW,
          ContentStatus.APPROVED,
        ),
      ).not.toThrow();
    });

    it("should allow IN_REVIEW -> DRAFT", () => {
      expect(() =>
        ContentStatusMachine.assertValidTransition(
          ContentStatus.IN_REVIEW,
          ContentStatus.DRAFT,
        ),
      ).not.toThrow();
    });

    it("should allow APPROVED -> ARCHIVED", () => {
      expect(() =>
        ContentStatusMachine.assertValidTransition(
          ContentStatus.APPROVED,
          ContentStatus.ARCHIVED,
        ),
      ).not.toThrow();
    });

    it("should allow ARCHIVED -> DRAFT (restoration)", () => {
      expect(() =>
        ContentStatusMachine.assertValidTransition(
          ContentStatus.ARCHIVED,
          ContentStatus.DRAFT,
        ),
      ).not.toThrow();
    });
  });

  describe("Invalid Transitions", () => {
    it("should reject DRAFT -> APPROVED directly without review", () => {
      expect(() =>
        ContentStatusMachine.assertValidTransition(
          ContentStatus.DRAFT,
          ContentStatus.APPROVED,
        ),
      ).toThrow(BadRequestException);
    });

    it("should reject ARCHIVED -> APPROVED directly", () => {
      expect(() =>
        ContentStatusMachine.assertValidTransition(
          ContentStatus.ARCHIVED,
          ContentStatus.APPROVED,
        ),
      ).toThrow(BadRequestException);
    });

    it("should reject ARCHIVED -> IN_REVIEW directly", () => {
      expect(() =>
        ContentStatusMachine.assertValidTransition(
          ContentStatus.ARCHIVED,
          ContentStatus.IN_REVIEW,
        ),
      ).toThrow(BadRequestException);
    });
  });
});
