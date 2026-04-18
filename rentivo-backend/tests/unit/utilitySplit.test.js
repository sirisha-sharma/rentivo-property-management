import {
  roundCurrency,
  calculateTotalUtilities,
  buildUtilitySplitDetails,
  isUtilitySplitValidationError,
} from "../../utils/utilitySplit.js";

// helpers

const makeTenant = (id, name = "Tenant", email = "t@test.com") => ({
  _id: { toString: () => id },
  userId: { _id: { toString: () => `u${id}` }, name, email },
});

const UTILITIES_1000 = { other: 1000 };
const UTILITIES_MIXED = { electricity: 300, water: 100, internet: 50, other: 50 };

// roundCurrency tests

describe("roundCurrency", () => {
  test("rounds to 2 decimal places", () => {
    expect(roundCurrency(1.005)).toBe(1.01);
    expect(roundCurrency(1.004)).toBe(1.00);
    expect(roundCurrency(3.14159)).toBe(3.14);
  });

  test("handles zero", () => {
    expect(roundCurrency(0)).toBe(0);
  });

  test("handles integers", () => {
    expect(roundCurrency(100)).toBe(100);
    expect(roundCurrency(1000)).toBe(1000);
  });

  test("handles null/undefined/empty gracefully (treated as 0)", () => {
    expect(roundCurrency(null)).toBe(0);
    expect(roundCurrency(undefined)).toBe(0);
    expect(roundCurrency("")).toBe(0);
  });

  test("handles large values", () => {
    expect(roundCurrency(999999.999)).toBe(1000000.00);
  });

  test("handles negative values", () => {
    expect(roundCurrency(-1.005)).toBe(-1.00);
    expect(roundCurrency(-3.14159)).toBe(-3.14);
  });
});

// calculateTotalUtilities tests

describe("calculateTotalUtilities", () => {
  test("sums all utility keys", () => {
    expect(
      calculateTotalUtilities({ electricity: 300, water: 100, internet: 50, gas: 50, waste: 25, other: 75 })
    ).toBe(600);
  });

  test("handles partial keys (missing keys default to 0)", () => {
    expect(calculateTotalUtilities({ electricity: 200, water: 100 })).toBe(300);
  });

  test("returns 0 for empty object", () => {
    expect(calculateTotalUtilities({})).toBe(0);
  });

  test("returns 0 for undefined input", () => {
    expect(calculateTotalUtilities()).toBe(0);
  });

  test("ignores non-utility keys", () => {
    expect(calculateTotalUtilities({ electricity: 100, rent: 5000 })).toBe(100);
  });

  test("rounds the total correctly", () => {
    expect(calculateTotalUtilities({ electricity: 0.1, water: 0.2 })).toBe(0.30);
  });

  test("handles string-valued utilities by parsing them", () => {
    expect(calculateTotalUtilities({ electricity: "200", water: "100" })).toBe(300);
  });
});

// equal split tests

describe("buildUtilitySplitDetails - equal split", () => {
  test("splits equally between two tenants", () => {
    const tenants = [makeTenant("1", "Alice", "a@t.com"), makeTenant("2", "Bob", "b@t.com")];
    const result = buildUtilitySplitDetails({ splitMethod: "equal", tenants, utilities: UTILITIES_1000 });

    expect(result.splitMethod).toBe("equal");
    expect(result.tenantCount).toBe(2);
    expect(result.splits).toHaveLength(2);
    expect(result.splits[0].totalAmount).toBe(500);
    expect(result.splits[1].totalAmount).toBe(500);
  });

  test("totals always add up to the declared amount (rounding absorbed by last tenant)", () => {
    // 1000 / 3 = 333.33 so last tenant gets the extra penny
    const tenants = [makeTenant("1"), makeTenant("2"), makeTenant("3")];
    const result = buildUtilitySplitDetails({ splitMethod: "equal", tenants, utilities: UTILITIES_1000 });
    const sum = result.splits.reduce((acc, s) => acc + s.totalAmount, 0);
    expect(roundCurrency(sum)).toBe(1000);
  });

  test("single tenant gets 100%", () => {
    const tenants = [makeTenant("1", "Solo", "s@t.com")];
    const result = buildUtilitySplitDetails({ splitMethod: "equal", tenants, utilities: UTILITIES_1000 });
    expect(result.splits[0].totalAmount).toBe(1000);
  });

  test("handles mixed utilities equally", () => {
    const tenants = [makeTenant("1"), makeTenant("2")];
    const result = buildUtilitySplitDetails({ splitMethod: "equal", tenants, utilities: UTILITIES_MIXED });
    const sum = result.splits.reduce((acc, s) => acc + s.totalAmount, 0);
    expect(roundCurrency(sum)).toBe(calculateTotalUtilities(UTILITIES_MIXED));
  });

  test("throws when no tenants", () => {
    expect(() =>
      buildUtilitySplitDetails({ splitMethod: "equal", tenants: [], utilities: UTILITIES_1000 })
    ).toThrow("No active tenants found for this property");
  });

  test("each split includes tenantId, userId, tenantName, tenantEmail, splitPercentage", () => {
    const tenants = [makeTenant("1", "Alice", "alice@t.com"), makeTenant("2", "Bob", "bob@t.com")];
    const result = buildUtilitySplitDetails({ splitMethod: "equal", tenants, utilities: UTILITIES_1000 });
    const split = result.splits[0];
    expect(split).toHaveProperty("tenantId");
    expect(split).toHaveProperty("userId");
    expect(split).toHaveProperty("tenantName");
    expect(split).toHaveProperty("tenantEmail");
    expect(split).toHaveProperty("splitPercentage");
  });
});

// room-size split tests

describe("buildUtilitySplitDetails - room-size split", () => {
  const tenants = [makeTenant("1", "Alice", "a@t.com"), makeTenant("2", "Bob", "b@t.com")];

  test("splits proportionally by room size", () => {
    const roomSizes = [{ name: "Room A", size: 300 }, { name: "Room B", size: 100 }];
    const result = buildUtilitySplitDetails({
      splitMethod: "room-size",
      tenants,
      utilities: UTILITIES_1000,
      roomSizes,
    });
    expect(result.splits[0].totalAmount).toBe(750);
    expect(result.splits[1].totalAmount).toBe(250);
  });

  test("totals always sum to declared amount", () => {
    const roomSizes = [{ name: "A", size: 150 }, { name: "B", size: 100 }];
    const result = buildUtilitySplitDetails({
      splitMethod: "room-size",
      tenants,
      utilities: UTILITIES_1000,
      roomSizes,
    });
    const sum = result.splits.reduce((acc, s) => acc + s.totalAmount, 0);
    expect(roundCurrency(sum)).toBe(1000);
  });

  test("throws when roomSizes has fewer entries than tenants", () => {
    expect(() =>
      buildUtilitySplitDetails({
        splitMethod: "room-size",
        tenants,
        utilities: UTILITIES_1000,
        roomSizes: [{ name: "A", size: 100 }],
      })
    ).toThrow("Room sizes are not fully configured for this property");
  });

  test("throws when a room size is zero", () => {
    expect(() =>
      buildUtilitySplitDetails({
        splitMethod: "room-size",
        tenants,
        utilities: UTILITIES_1000,
        roomSizes: [{ name: "A", size: 0 }, { name: "B", size: 100 }],
      })
    ).toThrow("Each active tenant must have a positive room size configured");
  });

  test("throws when roomSizes is not provided", () => {
    expect(() =>
      buildUtilitySplitDetails({ splitMethod: "room-size", tenants, utilities: UTILITIES_1000 })
    ).toThrow("Room sizes are not fully configured for this property");
  });

  test("includes roomName and roomSize metadata on each split", () => {
    const roomSizes = [{ name: "Room A", size: 200 }, { name: "Room B", size: 200 }];
    const result = buildUtilitySplitDetails({
      splitMethod: "room-size",
      tenants,
      utilities: UTILITIES_1000,
      roomSizes,
    });
    expect(result.splits[0]).toHaveProperty("roomName", "Room A");
    expect(result.splits[0]).toHaveProperty("roomSize", 200);
  });
});

// occupancy split tests

describe("buildUtilitySplitDetails - occupancy split", () => {
  const tenants = [makeTenant("t1", "Alice", "a@t.com"), makeTenant("t2", "Bob", "b@t.com")];

  test("splits proportionally by occupant count", () => {
    const occupancyData = { t1: 3, t2: 1 };
    const result = buildUtilitySplitDetails({
      splitMethod: "occupancy",
      tenants,
      utilities: UTILITIES_1000,
      occupancyData,
    });
    expect(result.splits[0].totalAmount).toBe(750);
    expect(result.splits[1].totalAmount).toBe(250);
  });

  test("totals always sum to declared amount", () => {
    const occupancyData = { t1: 2, t2: 3 };
    const result = buildUtilitySplitDetails({
      splitMethod: "occupancy",
      tenants,
      utilities: UTILITIES_1000,
      occupancyData,
    });
    const sum = result.splits.reduce((acc, s) => acc + s.totalAmount, 0);
    expect(roundCurrency(sum)).toBe(1000);
  });

  test("throws when occupancyData is empty", () => {
    expect(() =>
      buildUtilitySplitDetails({ splitMethod: "occupancy", tenants, utilities: UTILITIES_1000, occupancyData: {} })
    ).toThrow("Occupancy data is required for occupancy-based splitting");
  });

  test("throws when occupancyData is missing", () => {
    expect(() =>
      buildUtilitySplitDetails({ splitMethod: "occupancy", tenants, utilities: UTILITIES_1000 })
    ).toThrow("Occupancy data is required for occupancy-based splitting");
  });

  test("throws when a tenant has zero occupants", () => {
    expect(() =>
      buildUtilitySplitDetails({
        splitMethod: "occupancy",
        tenants,
        utilities: UTILITIES_1000,
        occupancyData: { t1: 0, t2: 2 },
      })
    ).toThrow("Each active tenant must have a positive occupant count");
  });

  test("throws when a tenant occupant count is non-numeric", () => {
    expect(() =>
      buildUtilitySplitDetails({
        splitMethod: "occupancy",
        tenants,
        utilities: UTILITIES_1000,
        occupancyData: { t1: "abc", t2: 2 },
      })
    ).toThrow("Each active tenant must have a positive occupant count");
  });

  test("includes occupantCount metadata on each split", () => {
    const occupancyData = { t1: 2, t2: 3 };
    const result = buildUtilitySplitDetails({
      splitMethod: "occupancy",
      tenants,
      utilities: UTILITIES_1000,
      occupancyData,
    });
    expect(result.splits[0]).toHaveProperty("occupantCount", 2);
    expect(result.splits[1]).toHaveProperty("occupantCount", 3);
  });
});

// custom split tests

describe("buildUtilitySplitDetails - custom split", () => {
  const tenants = [makeTenant("t1", "Alice", "a@t.com"), makeTenant("t2", "Bob", "b@t.com")];

  test("assigns custom amounts to each tenant", () => {
    const customSplits = { t1: 600, t2: 400 };
    const result = buildUtilitySplitDetails({
      splitMethod: "custom",
      tenants,
      utilities: UTILITIES_1000,
      customSplits,
    });
    expect(result.splits[0].totalAmount).toBe(600);
    expect(result.splits[1].totalAmount).toBe(400);
  });

  test("accepts full utility breakdown per tenant", () => {
    const customSplits = {
      t1: { electricity: 200, water: 50, other: 0, internet: 0, gas: 0, waste: 0 },
      t2: { electricity: 100, water: 50, other: 600, internet: 0, gas: 0, waste: 0 },
    };
    const result = buildUtilitySplitDetails({
      splitMethod: "custom",
      tenants,
      utilities: { electricity: 300, water: 100, other: 600 },
      customSplits,
    });
    const sum = result.splits.reduce((acc, s) => acc + s.totalAmount, 0);
    expect(roundCurrency(sum)).toBe(1000);
  });

  test("throws when customSplits is missing", () => {
    expect(() =>
      buildUtilitySplitDetails({ splitMethod: "custom", tenants, utilities: UTILITIES_1000 })
    ).toThrow("Custom split data is required for custom splitting method");
  });

  test("throws when custom split amounts don't add up to total", () => {
    const customSplits = { t1: 600, t2: 300 }; // total 900, not 1000
    expect(() =>
      buildUtilitySplitDetails({
        splitMethod: "custom",
        tenants,
        utilities: UTILITIES_1000,
        customSplits,
      })
    ).toThrow("Custom split amounts must add up to the total utility amount");
  });

  test("includes splitPercentage on each split", () => {
    const customSplits = { t1: 700, t2: 300 };
    const result = buildUtilitySplitDetails({
      splitMethod: "custom",
      tenants,
      utilities: UTILITIES_1000,
      customSplits,
    });
    expect(result.splits[0].splitPercentage).toBe("70.00");
    expect(result.splits[1].splitPercentage).toBe("30.00");
  });
});

// edge cases - invalid method, null tenants etc

describe("buildUtilitySplitDetails - edge cases", () => {
  test("throws for unknown split method", () => {
    const tenants = [makeTenant("1")];
    expect(() =>
      buildUtilitySplitDetails({ splitMethod: "proportional", tenants, utilities: UTILITIES_1000 })
    ).toThrow("Invalid split method");
  });

  test("throws for null tenants", () => {
    expect(() =>
      buildUtilitySplitDetails({ splitMethod: "equal", tenants: null, utilities: UTILITIES_1000 })
    ).toThrow("No active tenants found for this property");
  });

  test("returns correct totalUtilities in result", () => {
    const tenants = [makeTenant("1")];
    const result = buildUtilitySplitDetails({ splitMethod: "equal", tenants, utilities: UTILITIES_MIXED });
    expect(result.totalUtilities).toBe(calculateTotalUtilities(UTILITIES_MIXED));
  });
});

// isUtilitySplitValidationError tests

describe("isUtilitySplitValidationError", () => {
  const knownMessages = [
    "Split weights must add up to more than zero",
    "No active tenants found for this property",
    "Invalid split method",
    "Room sizes are not fully configured for this property",
    "Each active tenant must have a positive room size configured",
    "Occupancy data is required for occupancy-based splitting",
    "Each active tenant must have a positive occupant count",
    "Custom split data is required for custom splitting method",
    "Custom split amounts must add up to the total utility amount",
  ];

  test.each(knownMessages)("returns true for known validation message: %s", (msg) => {
    expect(isUtilitySplitValidationError(new Error(msg))).toBe(true);
  });

  test("returns true for dynamic 'Custom split not defined for tenant X' message", () => {
    expect(isUtilitySplitValidationError(new Error("Custom split not defined for tenant Alice"))).toBe(true);
  });

  test("returns false for unexpected/internal error messages", () => {
    expect(isUtilitySplitValidationError(new Error("Cannot read property 'x' of undefined"))).toBe(false);
    expect(isUtilitySplitValidationError(new Error("MongoNetworkError"))).toBe(false);
  });

  test("returns false for null/undefined error", () => {
    expect(isUtilitySplitValidationError(null)).toBe(false);
    expect(isUtilitySplitValidationError(undefined)).toBe(false);
  });

  test("returns false for error with no message", () => {
    expect(isUtilitySplitValidationError(new Error(""))).toBe(false);
  });
});
