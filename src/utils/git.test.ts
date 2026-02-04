import { describe, expect, test } from "bun:test";
import { getGitContext, type GitContext } from "./git";

describe("getGitContext", () => {
  test("returns object with expected shape", async () => {
    const context = await getGitContext();

    expect(context).toHaveProperty("branch");
    expect(context).toHaveProperty("commit");
    expect(context).toHaveProperty("dirty");
    expect(context).toHaveProperty("filesChanged");

    expect(typeof context.branch).toBe("string");
    expect(typeof context.commit).toBe("string");
    expect(typeof context.dirty).toBe("boolean");
    expect(Array.isArray(context.filesChanged)).toBe(true);
  });

  test("returns 'unknown' values when not in git repo", async () => {
    // Run from /tmp which is not a git repo
    const context = await getGitContext("/tmp");

    expect(context.branch).toBe("unknown");
    expect(context.commit).toBe("unknown");
    expect(context.dirty).toBe(false);
    expect(context.filesChanged).toEqual([]);
  });
});
