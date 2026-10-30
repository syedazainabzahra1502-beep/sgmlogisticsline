import { describe, it, expect } from "vitest";
import { checkPermit, cartTotals, isValidTRN } from "./sgm";

describe("RTA permit rules", () => {
  it("clears loads within limits", () => {
    expect(checkPermit({ weightT: 60, widthM: 3.5, heightM: 4.0, departHour: 14 }).status).toBe("cleared");
  });
  it("oversize inside night window is pending", () => {
    expect(checkPermit({ weightT: 61, widthM: 3, heightM: 3, departHour: 2 }).status).toBe("pending");
  });
  it("oversize outside night window is hazard", () => {
    expect(checkPermit({ weightT: 50, widthM: 4.2, heightM: 3, departHour: 10 }).status).toBe("hazard");
  });
});

describe("checkout", () => {
  it("applies 5% UAE VAT", () => {
    expect(cartTotals([{ id: "a", name: "a", price: 1299, unit: "", qty: 1 }]).total).toBe(1363.95);
  });
  it("validates 15-digit TRN", () => {
    expect(isValidTRN("100123456789012")).toBe(true);
    expect(isValidTRN("12345")).toBe(false);
  });
});
