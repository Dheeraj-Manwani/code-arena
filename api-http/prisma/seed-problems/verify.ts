/**
 * Checks every seeded test case against a reference solution.
 *
 * A wrong `expectedOutput` is the worst failure this seed can have: the problem
 * looks fine, and a *correct* submission is marked wrong. That is not something
 * to catch by reading — so every problem below has an independent
 * implementation here, and this script asserts the two agree.
 *
 * Run it after editing any seed script:
 *   npx ts-node prisma/seed-problems/verify.ts
 *
 * It touches no database.
 */
import problems01 from "./01-arrays-strings";
import problems02 from "./02-two-pointers-sliding-window";
import problems03 from "./03-hashing-counting";
import problems04 from "./04-binary-search-sorting";
import problems05 from "./05-dp-greedy-stack";
import type { SeedProblem } from "./shared";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Reference implementations, keyed by slug. Deliberately written plainly. */
const reference: Record<string, (...args: any[]) => any> = {
  // --- 01: arrays & strings -------------------------------------------------
  "running-sum": (nums: number[]) => {
    const out: number[] = [];
    let total = 0;
    for (const n of nums) out.push((total += n));
    return out;
  },
  "sorted-squares": (nums: number[]) => nums.map((n) => n * n).sort((a, b) => a - b),
  "single-number-xor": (nums: number[]) => nums.reduce((a, b) => a ^ b, 0),
  "plus-one-digits": (digits: number[]) => {
    const out = [...digits];
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i] < 9) {
        out[i]++;
        return out;
      }
      out[i] = 0;
    }
    return [1, ...out];
  },
  "max-consecutive-ones": (nums: number[]) => {
    let best = 0;
    let run = 0;
    for (const n of nums) {
      run = n === 1 ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return best;
  },
  "longest-common-prefix": (strs: string[]) => {
    if (strs.length === 0) return "";
    let prefix = strs[0];
    for (const s of strs.slice(1)) {
      while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
    return prefix;
  },
  "valid-palindrome-alphanumeric": (s: string) => {
    const clean = s.toLowerCase().replace(/[^a-z0-9]/g, "");
    return clean === [...clean].reverse().join("");
  },
  "reverse-words-in-string": (s: string) => s.trim().split(/\s+/).reverse().join(" "),

  // --- 02: two pointers & sliding window ------------------------------------
  "two-sum-sorted": (numbers: number[], target: number) => {
    let lo = 0;
    let hi = numbers.length - 1;
    while (lo < hi) {
      const sum = numbers[lo] + numbers[hi];
      if (sum === target) return [lo + 1, hi + 1];
      if (sum < target) lo++;
      else hi--;
    }
    return [];
  },
  "container-with-most-water": (height: number[]) => {
    let lo = 0;
    let hi = height.length - 1;
    let best = 0;
    while (lo < hi) {
      best = Math.max(best, (hi - lo) * Math.min(height[lo], height[hi]));
      if (height[lo] < height[hi]) lo++;
      else hi--;
    }
    return best;
  },
  "max-average-subarray": (nums: number[], k: number) => {
    let sum = 0;
    for (let i = 0; i < k; i++) sum += nums[i];
    let best = sum;
    for (let i = k; i < nums.length; i++) {
      sum += nums[i] - nums[i - k];
      best = Math.max(best, sum);
    }
    return best / k;
  },
  "min-size-subarray-sum": (target: number, nums: number[]) => {
    let lo = 0;
    let sum = 0;
    let best = Infinity;
    for (let hi = 0; hi < nums.length; hi++) {
      sum += nums[hi];
      while (sum >= target) {
        best = Math.min(best, hi - lo + 1);
        sum -= nums[lo++];
      }
    }
    return best === Infinity ? 0 : best;
  },
  "remove-duplicates-sorted": (nums: number[]) => new Set(nums).size,
  "valid-palindrome-one-deletion": (s: string) => {
    const isPal = (lo: number, hi: number) => {
      while (lo < hi) {
        if (s[lo] !== s[hi]) return false;
        lo++;
        hi--;
      }
      return true;
    };
    let lo = 0;
    let hi = s.length - 1;
    while (lo < hi) {
      if (s[lo] !== s[hi]) return isPal(lo + 1, hi) || isPal(lo, hi - 1);
      lo++;
      hi--;
    }
    return true;
  },
  "trapping-rain-water": (height: number[]) => {
    let lo = 0;
    let hi = height.length - 1;
    let leftMax = 0;
    let rightMax = 0;
    let total = 0;
    while (lo < hi) {
      if (height[lo] < height[hi]) {
        leftMax = Math.max(leftMax, height[lo]);
        total += leftMax - height[lo];
        lo++;
      } else {
        rightMax = Math.max(rightMax, height[hi]);
        total += rightMax - height[hi];
        hi--;
      }
    }
    return total;
  },

  // --- 03: hashing & counting -----------------------------------------------
  "contains-duplicate": (nums: number[]) => new Set(nums).size !== nums.length,
  "valid-anagram": (s: string, t: string) =>
    s.length === t.length &&
    [...s].sort().join("") === [...t].sort().join(""),
  "first-unique-character": (s: string) => {
    const count = new Map<string, number>();
    for (const c of s) count.set(c, (count.get(c) ?? 0) + 1);
    for (let i = 0; i < s.length; i++) if (count.get(s[i]) === 1) return i;
    return -1;
  },
  "majority-element": (nums: number[]) => {
    let candidate = nums[0];
    let votes = 0;
    for (const n of nums) {
      if (votes === 0) candidate = n;
      votes += n === candidate ? 1 : -1;
    }
    return candidate;
  },
  "subarray-sum-equals-k": (nums: number[], k: number) => {
    const seen = new Map<number, number>([[0, 1]]);
    let prefix = 0;
    let count = 0;
    for (const n of nums) {
      prefix += n;
      count += seen.get(prefix - k) ?? 0;
      seen.set(prefix, (seen.get(prefix) ?? 0) + 1);
    }
    return count;
  },
  "pivot-index": (nums: number[]) => {
    const total = nums.reduce((a, b) => a + b, 0);
    let left = 0;
    for (let i = 0; i < nums.length; i++) {
      if (left === total - left - nums[i]) return i;
      left += nums[i];
    }
    return -1;
  },
  "longest-consecutive-sequence": (nums: number[]) => {
    const set = new Set(nums);
    let best = 0;
    for (const n of set) {
      if (set.has(n - 1)) continue;
      let length = 1;
      while (set.has(n + length)) length++;
      best = Math.max(best, length);
    }
    return best;
  },
  "sorted-intersection": (a: number[], b: number[]) => {
    const setB = new Set(b);
    return [...new Set(a.filter((n) => setB.has(n)))].sort((x, y) => x - y);
  },

  // --- 04: binary search & sorting ------------------------------------------
  "classic-binary-search": (nums: number[], target: number) => nums.indexOf(target),
  "search-insert-position": (nums: number[], target: number) => {
    let lo = 0;
    let hi = nums.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (nums[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  },
  "integer-square-root": (x: number) => Math.floor(Math.sqrt(x)),
  "search-rotated-sorted-array": (nums: number[], target: number) => nums.indexOf(target),
  "find-minimum-rotated": (nums: number[]) => Math.min(...nums),
  "koko-eating-bananas": (piles: number[], h: number) => {
    const hours = (k: number) => piles.reduce((sum, p) => sum + Math.ceil(p / k), 0);
    let lo = 1;
    let hi = Math.max(...piles);
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (hours(mid) <= h) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  },
  "merge-intervals": (intervals: number[][]) => {
    const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
    const out: number[][] = [];
    for (const [start, end] of sorted) {
      const last = out[out.length - 1];
      if (last && start <= last[1]) last[1] = Math.max(last[1], end);
      else out.push([start, end]);
    }
    return out;
  },
  "h-index": (citations: number[]) => {
    const sorted = [...citations].sort((a, b) => b - a);
    let h = 0;
    while (h < sorted.length && sorted[h] > h) h++;
    return h;
  },

  // --- 05: DP, greedy & stacks ----------------------------------------------
  "min-cost-climbing-stairs": (cost: number[]) => {
    let a = 0;
    let b = 0;
    for (let i = 2; i <= cost.length; i++) {
      const next = Math.min(b + cost[i - 1], a + cost[i - 2]);
      a = b;
      b = next;
    }
    return b;
  },
  "house-robber": (nums: number[]) => {
    let take = 0;
    let skip = 0;
    for (const n of nums) {
      const nextTake = skip + n;
      skip = Math.max(skip, take);
      take = nextTake;
    }
    return Math.max(take, skip);
  },
  "coin-change-combinations": (amount: number, coins: number[]) => {
    const dp = new Array(amount + 1).fill(0);
    dp[0] = 1;
    for (const coin of coins) {
      for (let a = coin; a <= amount; a++) dp[a] += dp[a - coin];
    }
    return dp[amount];
  },
  "unique-paths-grid": (m: number, n: number) => {
    const dp = new Array(n).fill(1);
    for (let row = 1; row < m; row++) {
      for (let col = 1; col < n; col++) dp[col] += dp[col - 1];
    }
    return dp[n - 1];
  },
  "jump-game": (nums: number[]) => {
    let reach = 0;
    for (let i = 0; i < nums.length; i++) {
      if (i > reach) return false;
      reach = Math.max(reach, i + nums[i]);
    }
    return true;
  },
  "gas-station-circuit": (gas: number[], cost: number[]) => {
    const total = gas.reduce((a, b) => a + b, 0) - cost.reduce((a, b) => a + b, 0);
    if (total < 0) return -1;
    let start = 0;
    let tank = 0;
    for (let i = 0; i < gas.length; i++) {
      tank += gas[i] - cost[i];
      if (tank < 0) {
        start = i + 1;
        tank = 0;
      }
    }
    return start;
  },
  "daily-temperatures": (temperatures: number[]) => {
    const out = new Array(temperatures.length).fill(0);
    const stack: number[] = [];
    for (let i = 0; i < temperatures.length; i++) {
      while (stack.length && temperatures[i] > temperatures[stack[stack.length - 1]]) {
        const j = stack.pop()!;
        out[j] = i - j;
      }
      stack.push(i);
    }
    return out;
  },
  "largest-rectangle-histogram": (heights: number[]) => {
    const stack: number[] = [];
    let best = 0;
    for (let i = 0; i <= heights.length; i++) {
      const h = i === heights.length ? 0 : heights[i];
      while (stack.length && heights[stack[stack.length - 1]] >= h) {
        const height = heights[stack.pop()!];
        const width = stack.length ? i - stack[stack.length - 1] - 1 : i;
        best = Math.max(best, height * width);
      }
      stack.push(i);
    }
    return best;
  },
};

const allProblems: SeedProblem[] = [
  ...problems01,
  ...problems02,
  ...problems03,
  ...problems04,
  ...problems05,
];

/** Mirrors the judge's comparison: epsilon for numbers, deep equality otherwise. */
function equal(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-6;
  return JSON.stringify(a) === JSON.stringify(b);
}

let failures = 0;
let checked = 0;
const missing: string[] = [];

for (const problem of allProblems) {
  const solve = reference[problem.slug];
  if (!solve) {
    missing.push(problem.slug);
    continue;
  }

  for (const [index, tc] of problem.testCases.entries()) {
    const args = JSON.parse(tc.input) as unknown[];
    const expected = JSON.parse(tc.expectedOutput) as unknown;
    let actual: unknown;
    try {
      actual = solve(...args);
    } catch (error) {
      console.error(`✗ ${problem.slug} case ${index + 1}: reference threw — ${error}`);
      failures++;
      continue;
    }

    checked++;
    if (!equal(actual, expected)) {
      failures++;
      console.error(
        `✗ ${problem.slug} case ${index + 1}\n    input:    ${tc.input}\n    expected: ${
          tc.expectedOutput
        }\n    actual:   ${JSON.stringify(actual)}`,
      );
    }
  }
}

console.log(`\nChecked ${checked} test cases across ${allProblems.length} problems.`);
if (missing.length) {
  console.error(`✗ No reference solution for: ${missing.join(", ")}`);
}
if (failures || missing.length) {
  console.error(`\n❌ ${failures} mismatch(es), ${missing.length} unverified problem(s).\n`);
  process.exit(1);
}
console.log("✅ Every expected output matches an independent implementation.\n");
