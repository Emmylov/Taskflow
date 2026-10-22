import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateOrderTotal, calculatePromotion } from "./orderPricing.ts";

describe("first-order surprise promotions", () => {
  it("applies the 50% tier to smaller first orders", () => {
    const promotion = calculatePromotion(20_000, true);

    assert.deepEqual(
      {
        code: promotion.code,
        discountPercent: promotion.discountPercent,
        discountCents: promotion.discountCents,
      },
      { code: "SURPRISE-50", discountPercent: 50, discountCents: 10_000 },
    );
  });

  it("applies the 30% tier to mid-sized first orders", () => {
    const promotion = calculatePromotion(50_000, true);

    assert.deepEqual(
      {
        code: promotion.code,
        discountPercent: promotion.discountPercent,
        discountCents: promotion.discountCents,
      },
      { code: "SURPRISE-30", discountPercent: 30, discountCents: 15_000 },
    );
  });

  it("applies the capped 20% tier to large first orders", () => {
    const promotion = calculatePromotion(500_000, true);

    assert.deepEqual(
      {
        code: promotion.code,
        discountPercent: promotion.discountPercent,
        discountCents: promotion.discountCents,
      },
      { code: "SURPRISE-20", discountPercent: 20, discountCents: 75_000 },
    );
  });
});

describe("returning-client surprise promotions", () => {
  it("applies the 25% tier to smaller returning-client orders", () => {
    const promotion = calculatePromotion(20_000, false);

    assert.deepEqual(
      {
        code: promotion.code,
        discountPercent: promotion.discountPercent,
        discountCents: promotion.discountCents,
      },
      { code: "RETURN-25", discountPercent: 25, discountCents: 5_000 },
    );
  });

  it("applies the 20% tier to mid-sized returning-client orders", () => {
    const promotion = calculatePromotion(50_000, false);

    assert.deepEqual(
      {
        code: promotion.code,
        discountPercent: promotion.discountPercent,
        discountCents: promotion.discountCents,
      },
      { code: "RETURN-20", discountPercent: 20, discountCents: 10_000 },
    );
  });

  it("applies the capped 10% tier to large returning-client orders", () => {
    const promotion = calculatePromotion(600_000, false);

    assert.deepEqual(
      {
        code: promotion.code,
        discountPercent: promotion.discountPercent,
        discountCents: promotion.discountCents,
      },
      { code: "RETURN-10", discountPercent: 10, discountCents: 50_000 },
    );
  });
});

describe("checkout total calculation", () => {
  it("does not stack the automatic promotion with a custom-price proposal", () => {
    const promotion = calculatePromotion(50_000, true, true);

    assert.equal(promotion.eligible, false);
    assert.equal(promotion.discountCents, 0);
    assert.equal(promotion.code, null);
  });

  it("matches the amount stored on an order to subtotal plus delivery less discount", () => {
    const subtotalCents = 50_000;
    const deliveryFeeCents = 18_000;
    const promotion = calculatePromotion(subtotalCents, true);
    const storedOrder = {
      subtotalCents,
      deliveryFeeCents,
      discountCents: promotion.discountCents,
      totalCents: calculateOrderTotal(subtotalCents, deliveryFeeCents, promotion.discountCents),
    };

    assert.equal(
      storedOrder.totalCents,
      storedOrder.subtotalCents + storedOrder.deliveryFeeCents - storedOrder.discountCents,
    );
    assert.equal(storedOrder.totalCents, 53_000);
  });
});