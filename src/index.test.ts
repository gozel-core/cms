import { test, expect } from "vitest";
import { extractLocaleFromFilePath } from "./util";

test("empty", () => {
    expect(extractLocaleFromFilePath("tr-TR.json")).toBe("tr-TR");
});
