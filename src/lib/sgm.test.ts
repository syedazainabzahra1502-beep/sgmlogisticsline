import { describe, it, expect } from "vitest";
import { checkPermit, cartTotals, isValidTRN, SERVICES } from "./sgm";

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
    expect(isValidTRN("105290435400001")).toBe(true);
    expect(isValidTRN("12345")).toBe(false);
  });
});

describe("AED pricing", () => {
  it("RTA ROW permit is AED 2,350, route survey AED 6,800, Gate 4 AED 3,400", () => {
    const p = (id: string) => SERVICES.find((s) => s.id === id)?.price;
    expect(p("rta-row")).toBe(2350);
    expect(p("route-survey")).toBe(6800);
    expect(p("gate4-marshal")).toBe(3400);
  });
});
