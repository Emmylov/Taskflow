export type PromotionResult = {
  eligible: boolean;
  isFirstOrder: boolean;
  discountCents: number;
  discountPercent: number;
  code: string | null;
  label: string;
  message: string;
};

export function calculatePromotion(subtotalCents: number, isFirstOrder: boolean, customPrice = false): PromotionResult {
  if (customPrice || subtotalCents <= 0) {
    return {
      eligible: false,
      isFirstOrder,
      discountCents: 0,
      discountPercent: 0,
      code: null,
      label: customPrice ? "Custom price proposal" : "Add a service to reveal your offer",
      message: customPrice ? "Custom price proposals are reviewed separately and cannot be combined with the surprise offer." : "Add a service to reveal your offer.",
    };
  }

  const tier = isFirstOrder
    ? subtotalCents <= 25_000
      ? { percent: 50, capCents: 25_000, code: "SURPRISE-50", label: "50% first-order surprise" }
      : subtotalCents <= 75_000
        ? { percent: 30, capCents: 75_000, code: "SURPRISE-30", label: "30% first-order surprise" }
        : { percent: 20, capCents: 75_000, code: "SURPRISE-20", label: "20% first-order surprise" }
    : subtotalCents <= 25_000
      ? { percent: 25, capCents: 20_000, code: "RETURN-25", label: "25% returning-client surprise" }
      : subtotalCents <= 75_000
        ? { percent: 20, capCents: 50_000, code: "RETURN-20", label: "20% returning-client surprise" }
        : { percent: 10, capCents: 50_000, code: "RETURN-10", label: "10% returning-client surprise" };
  const discountCents = Math.min(Math.round(subtotalCents * tier.percent / 100), tier.capCents);
  return {
    eligible: discountCents > 0,
    isFirstOrder,
    discountCents,
    discountPercent: tier.percent,
    code: tier.code,
    label: tier.label,
    message: isFirstOrder
      ? "Your first project gets a bigger welcome. The exact saving is locked to this project total."
      : "Welcome back. Your returning-client saving is applied automatically.",
  };
}

export function calculateOrderTotal(subtotalCents: number, deliveryFeeCents: number, discountCents: number): number {
  return Math.max(0, subtotalCents + deliveryFeeCents - discountCents);
}