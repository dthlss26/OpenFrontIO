/**
 * @jest-environment jsdom
 */

import { Cosmetics } from "../../../src/core/CosmeticSchemas";
import { UserSettings } from "../../../src/core/game/UserSettings";

// Mock localStorage (FAKE - implements full localStorage interface)
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock document.documentElement.classList to verify toggleDarkMode() calls
// This is needed because toggleDarkMode() calls document.documentElement.classList.add/remove
const mockAdd = jest.fn();
const mockRemove = jest.fn();
Object.defineProperty(document.documentElement, "classList", {
  value: {
    add: mockAdd,
    remove: mockRemove,
  },
  writable: true,
});

describe("UserSettings", () => {
  let userSettings: UserSettings;

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    userSettings = new UserSettings();
  });

  test("get() should return defaultValue when key does not exist", () => {
    expect(userSettings.get("nonexistent", true)).toBe(true);
    expect(userSettings.get("nonexistent", false)).toBe(false);
  });

  test("get() should return true when value is 'true'", () => {
    localStorageMock.setItem("test-key", "true");
    expect(userSettings.get("test-key", false)).toBe(true);
  });

  test("get() should return false when value is 'false'", () => {
    localStorageMock.setItem("test-key", "false");
    expect(userSettings.get("test-key", true)).toBe(false);
  });

  test("set() should store 'true' for true values", () => {
    userSettings.set("test-key", true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith("test-key", "true");
  });

  test("getFloat() should return parsed float value", () => {
    localStorageMock.setItem("test-key", "3.14");
    expect(userSettings.getFloat("test-key", 0)).toBe(3.14);
  });

  test("getFloat() should return defaultValue for NaN values", () => {
    localStorageMock.setItem("test-key", "not-a-number");
    expect(userSettings.getFloat("test-key", 0.5)).toBe(0.5);
  });

  test("setFloat() should store number as string", () => {
    userSettings.setFloat("test-key", 3.14);
    expect(localStorageMock.setItem).toHaveBeenCalledWith("test-key", "3.14");
  });

  test("darkMode() should return false by default", () => {
    expect(userSettings.darkMode()).toBe(false);
  });

  test("toggleDarkMode() should toggle the setting and update DOM", () => {
    expect(userSettings.darkMode()).toBe(false);
    userSettings.toggleDarkMode();
    expect(userSettings.darkMode()).toBe(true);
    expect(mockAdd).toHaveBeenCalledWith("dark");

    userSettings.toggleDarkMode();
    expect(userSettings.darkMode()).toBe(false);
    expect(mockRemove).toHaveBeenCalledWith("dark");
  });

  test("getSelectedPatternName() should return null when cosmetics is null", () => {
    expect(userSettings.getSelectedPatternName(null)).toBeNull();
  });

  test("getSelectedPatternName() should return pattern when valid", () => {
    localStorageMock.setItem(
      "territoryPattern",
      "pattern:testPattern:palette1",
    );
    const cosmetics: Cosmetics = {
      patterns: { testPattern: { pattern: "pattern-data" } },
      colorPalettes: {
        palette1: {
          name: "palette1",
          primaryColor: "#ff0000",
          secondaryColor: "#0000ff",
        },
      },
    };

    const pattern = userSettings.getSelectedPatternName(cosmetics);
    expect(pattern).toBeDefined();
    expect(pattern?.name).toBe("testPattern");
    expect(pattern?.patternData).toBe("pattern-data");
  });

  test("setSelectedPatternName() should remove item when undefined", () => {
    localStorageMock.setItem("territoryPattern", "test");
    userSettings.setSelectedPatternName(undefined);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      "territoryPattern",
    );
  });

  test("backgroundMusicVolume() should return 0 by default", () => {
    expect(userSettings.backgroundMusicVolume()).toBe(0);
  });

  test("setBackgroundMusicVolume() should store value", () => {
    userSettings.setBackgroundMusicVolume(0.75);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "settings.backgroundMusicVolume",
      "0.75",
    );
  });

  test("focusLocked() should always return false", () => {
    expect(userSettings.focusLocked()).toBe(false);
    localStorageMock.setItem("settings.focusLocked", "true");
    expect(userSettings.focusLocked()).toBe(false);
  });

  test("getDevOnlyPattern() should return undefined when not set", () => {
    expect(userSettings.getDevOnlyPattern()).toBeUndefined();
  });

  test("getDevOnlyPattern() should return pattern when set", () => {
    localStorageMock.setItem("dev-pattern", "pattern-data");
    localStorageMock.setItem("dev-primary", "#ff0000");
    localStorageMock.setItem("dev-secondary", "#0000ff");

    const pattern = userSettings.getDevOnlyPattern();
    expect(pattern).toBeDefined();
    expect(pattern?.name).toBe("dev-pattern");
    expect(pattern?.patternData).toBe("pattern-data");
    expect(pattern?.colorPalette?.primaryColor).toBe("#ff0000");
    expect(pattern?.colorPalette?.secondaryColor).toBe("#0000ff");
  });

  test("getSelectedPatternName() should handle pattern without prefix", () => {
    localStorageMock.setItem("territoryPattern", "testPattern:palette1");
    const cosmetics: Cosmetics = {
      patterns: { testPattern: { pattern: "pattern-data" } },
      colorPalettes: {
        palette1: {
          name: "palette1",
          primaryColor: "#ff0000",
          secondaryColor: "#0000ff",
        },
      },
    };

    const pattern = userSettings.getSelectedPatternName(cosmetics);
    expect(pattern).toBeDefined();
    expect(pattern?.name).toBe("testPattern");
  });

  test("getSelectedColor() should return color when set", () => {
    localStorageMock.setItem("settings.territoryColor", "#ff0000");
    expect(userSettings.getSelectedColor()).toBe("#ff0000");
  });

  test("setSelectedColor() should store color when defined", () => {
    userSettings.setSelectedColor("#00ff00");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "settings.territoryColor",
      "#00ff00",
    );
  });

  test("soundEffectsVolume() should return 1 by default", () => {
    expect(userSettings.soundEffectsVolume()).toBe(1);
  });

  test("setSoundEffectsVolume() should store value", () => {
    userSettings.setSoundEffectsVolume(0.5);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "settings.soundEffectsVolume",
      "0.5",
    );
  });

  test("toggleEmojis() should toggle the setting", () => {
    expect(userSettings.emojis()).toBe(true);
    userSettings.toggleEmojis();
    expect(userSettings.emojis()).toBe(false);
    userSettings.toggleEmojis();
    expect(userSettings.emojis()).toBe(true);
  });
});
