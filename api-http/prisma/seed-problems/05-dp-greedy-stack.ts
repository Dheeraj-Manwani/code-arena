import { seedProblems, runSeed, type SeedProblem } from "./shared";

/**
 * 5/5 — Dynamic programming, greedy and monotonic stacks.
 *
 * The hardest script, and the one where the *distinction* matters most: three
 * of these look greedy and are not, and two look like DP and have a greedy
 * answer. The statements lean into that rather than hiding it, since telling
 * the two apart is the actual skill.
 */
const problems: SeedProblem[] = [
  {
    slug: "min-cost-climbing-stairs",
    title: "Min Cost Climbing Stairs",
    description: `Each index of \`cost\` is a step with a price. You pay the price of a step when you
stand on it, and from there you may climb one or two steps.

You may start at index 0 or index 1. Return the cheapest total cost to get past
the top step.

The recurrence is one line: reaching step \`i\` costs \`cost[i]\` plus the cheaper
of the two steps you could have come from. Only the last two values are ever
needed, so O(1) space is achievable.`,
    tags: ["Array", "DP"],
    difficulty: "easy",
    points: 130,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `cost` of per-step prices.",
    outputFormat: "The minimum total cost to climb past the last step.",
    constraints: ["2 <= cost.length <= 1000", "0 <= cost[i] <= 999"],
    functionName: "minCostClimbingStairs",
    params: [{ name: "cost", type: "int[]" }],
    returnType: "int",
    testCases: [
      { input: "[[10,15,20]]", expectedOutput: "15", isHidden: false },
      { input: "[[1,100,1,1,1,100,1,1,100,1]]", expectedOutput: "6", isHidden: false },
      // Two steps only — you start on the cheaper one and step straight off.
      { input: "[[5,3]]", expectedOutput: "3", isHidden: true },
      { input: "[[0,0,0,0]]", expectedOutput: "0", isHidden: true },
      { input: "[[1,2,3,4,5]]", expectedOutput: "6", isHidden: true },
    ],
  },

  {
    slug: "house-robber",
    title: "House Robber",
    description: `Each house holds some money, but robbing two adjacent houses triggers the alarm.
Return the most you can take.

The greedy instinct — take every other house, or always take the largest — is
wrong; \`[2,1,1,2]\` defeats both. The DP is: at each house, either you rob it
and add the best total from two houses back, or you skip it and keep the best
total from one house back.`,
    tags: ["Array", "DP"],
    difficulty: "medium",
    points: 160,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `nums` of the money in each house.",
    outputFormat: "The maximum amount that can be robbed without taking adjacent houses.",
    constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 400"],
    functionName: "rob",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    testCases: [
      { input: "[[1,2,3,1]]", expectedOutput: "4", isHidden: false },
      { input: "[[2,7,9,3,1]]", expectedOutput: "12", isHidden: false },
      // The case that breaks both greedy heuristics.
      { input: "[[2,1,1,2]]", expectedOutput: "4", isHidden: true },
      { input: "[[5]]", expectedOutput: "5", isHidden: true },
      { input: "[[0,0,0]]", expectedOutput: "0", isHidden: true },
    ],
  },

  {
    slug: "coin-change-combinations",
    title: "Counting Coin Combinations",
    description: `Given coin denominations of unlimited supply, return how many distinct
**combinations** make up \`amount\`. Order does not matter: \`1 + 2\` and
\`2 + 1\` are the same combination and count once.

That last sentence decides the loop order. Iterating coins on the outside and
amounts on the inside counts combinations; swapping them counts *permutations*
and gives a much larger answer.`,
    tags: ["DP", "Array"],
    difficulty: "medium",
    points: 190,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer `amount`, and an array `coins` of distinct denominations.",
    outputFormat: "The number of distinct combinations summing to amount.",
    constraints: [
      "1 <= coins.length <= 300",
      "1 <= coins[i] <= 5000",
      "All coin values are distinct",
      "0 <= amount <= 5000",
    ],
    functionName: "change",
    params: [
      { name: "amount", type: "int" },
      { name: "coins", type: "int[]" },
    ],
    returnType: "int",
    testCases: [
      { input: "[5,[1,2,5]]", expectedOutput: "4", isHidden: false },
      { input: "[3,[2]]", expectedOutput: "0", isHidden: false },
      // Amount 0 has exactly one combination: take nothing.
      { input: "[0,[7]]", expectedOutput: "1", isHidden: true },
      { input: "[10,[10]]", expectedOutput: "1", isHidden: true },
      { input: "[4,[1,2,3]]", expectedOutput: "4", isHidden: true },
    ],
  },

  {
    slug: "unique-paths-grid",
    title: "Unique Paths",
    description: `A robot starts in the top-left cell of an \`m x n\` grid and must reach the
bottom-right cell, moving only right or down. Return how many distinct paths
there are.

Every cell's count is the sum of the cell above and the cell to its left, which
is a two-line DP. It is also \`C(m + n - 2, m - 1)\` if you would rather do it
with a binomial coefficient.`,
    tags: ["DP", "Math", "Combinatorics"],
    difficulty: "medium",
    points: 160,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "Two integers `m` (rows) and `n` (columns).",
    outputFormat: "The number of distinct right/down paths from corner to corner.",
    constraints: ["1 <= m, n <= 100", "The answer fits in a 32-bit signed integer"],
    functionName: "uniquePaths",
    params: [
      { name: "m", type: "int" },
      { name: "n", type: "int" },
    ],
    returnType: "int",
    testCases: [
      { input: "[3,7]", expectedOutput: "28", isHidden: false },
      { input: "[3,2]", expectedOutput: "3", isHidden: false },
      // A single row or column admits exactly one path.
      { input: "[1,1]", expectedOutput: "1", isHidden: true },
      { input: "[1,10]", expectedOutput: "1", isHidden: true },
      { input: "[7,3]", expectedOutput: "28", isHidden: true },
    ],
  },

  {
    slug: "jump-game",
    title: "Jump Game",
    description: `Each element is the maximum number of steps you may jump forward from that
position. Starting at index 0, return whether you can reach the last index.

This one *is* greedy: track the furthest index reachable so far, and fail the
moment your current position passes it. No DP table required.`,
    tags: ["Array", "Greedy", "DP"],
    difficulty: "medium",
    points: 160,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `nums` of maximum jump lengths.",
    outputFormat: "`true` if the last index is reachable, otherwise `false`.",
    constraints: ["1 <= nums.length <= 10^4", "0 <= nums[i] <= 10^5"],
    functionName: "canJump",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "boolean",
    testCases: [
      { input: "[[2,3,1,1,4]]", expectedOutput: "true", isHidden: false },
      { input: "[[3,2,1,0,4]]", expectedOutput: "false", isHidden: false },
      // A single element is already at the end; a leading zero traps you.
      { input: "[[0]]", expectedOutput: "true", isHidden: true },
      { input: "[[0,1]]", expectedOutput: "false", isHidden: true },
      { input: "[[2,0,0]]", expectedOutput: "true", isHidden: true },
    ],
  },

  {
    slug: "gas-station-circuit",
    title: "Gas Station",
    description: `There are \`n\` stations arranged in a circle. Station \`i\` provides \`gas[i]\` fuel,
and driving from it to the next one costs \`cost[i]\`. Starting empty, return the
index you must begin at to complete the loop, or \`-1\` if it cannot be done.

If a solution exists it is unique.

Two facts collapse this to one pass: the trip is impossible when total gas is
less than total cost, and if you run dry between \`start\` and \`i\`, no station in
that range can be the answer either.`,
    tags: ["Array", "Greedy"],
    difficulty: "medium",
    points: 200,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "Two integer arrays `gas` and `cost` of equal length.",
    outputFormat: "The unique valid starting index, or -1 if the circuit is impossible.",
    constraints: [
      "1 <= gas.length == cost.length <= 10^5",
      "0 <= gas[i], cost[i] <= 10^4",
      "If a solution exists, it is unique",
    ],
    functionName: "canCompleteCircuit",
    params: [
      { name: "gas", type: "int[]" },
      { name: "cost", type: "int[]" },
    ],
    returnType: "int",
    testCases: [
      { input: "[[1,2,3,4,5],[3,4,5,1,2]]", expectedOutput: "3", isHidden: false },
      { input: "[[2,3,4],[3,4,3]]", expectedOutput: "-1", isHidden: false },
      { input: "[[5],[4]]", expectedOutput: "0", isHidden: true },
      { input: "[[3],[4]]", expectedOutput: "-1", isHidden: true },
      // Exactly break-even overall, so the loop is possible from one station.
      { input: "[[4,5,2,6,5,3],[3,2,7,3,2,9]]", expectedOutput: "-1", isHidden: true },
    ],
  },

  {
    slug: "daily-temperatures",
    title: "Daily Temperatures",
    description: `For each day, report how many days you must wait for a warmer temperature. If no
warmer day ever comes, report \`0\` for that day.

The O(n²) version re-scans forward from every day. The linear version keeps a
**monotonic decreasing stack** of unresolved days: when a warmer temperature
arrives it resolves everything on the stack that is cooler, and each day is
pushed and popped at most once.`,
    tags: ["Array", "Stack", "Monotonic Stack"],
    difficulty: "medium",
    points: 190,
    timeLimit: 3000,
    memoryLimit: 256,
    inputFormat: "An integer array `temperatures` of daily readings.",
    outputFormat: "An array where each entry is the wait in days, or 0 if none.",
    constraints: [
      "1 <= temperatures.length <= 10^5",
      "30 <= temperatures[i] <= 100",
    ],
    functionName: "dailyTemperatures",
    params: [{ name: "temperatures", type: "int[]" }],
    returnType: "int[]",
    testCases: [
      { input: "[[73,74,75,71,69,72,76,73]]", expectedOutput: "[1,1,4,2,1,1,0,0]", isHidden: false },
      { input: "[[30,40,50,60]]", expectedOutput: "[1,1,1,0]", isHidden: false },
      // Strictly decreasing: nothing is ever resolved.
      { input: "[[60,50,40,30]]", expectedOutput: "[0,0,0,0]", isHidden: true },
      { input: "[[30,60,90]]", expectedOutput: "[1,1,0]", isHidden: true },
      // Equal temperatures do not count as warmer.
      { input: "[[50,50,50]]", expectedOutput: "[0,0,0]", isHidden: true },
    ],
  },

  {
    slug: "largest-rectangle-histogram",
    title: "Largest Rectangle in a Histogram",
    description: `Each element is the height of a bar of width 1. Return the area of the largest
rectangle that fits entirely inside the histogram.

A rectangle is limited by the *shortest* bar it spans, so for each bar the
question is how far left and right it can extend before meeting something
shorter. A monotonic increasing stack answers both directions in one pass and
turns the obvious O(n²) into O(n).`,
    tags: ["Array", "Stack", "Monotonic Stack"],
    difficulty: "hard",
    points: 260,
    timeLimit: 3000,
    memoryLimit: 256,
    inputFormat: "An integer array `heights` of bar heights.",
    outputFormat: "The area of the largest rectangle contained in the histogram.",
    constraints: ["1 <= heights.length <= 10^5", "0 <= heights[i] <= 10^4"],
    functionName: "largestRectangleArea",
    params: [{ name: "heights", type: "int[]" }],
    returnType: "int",
    testCases: [
      { input: "[[2,1,5,6,2,3]]", expectedOutput: "10", isHidden: false },
      { input: "[[2,4]]", expectedOutput: "4", isHidden: false },
      // Uniform bars: the answer spans the whole histogram.
      { input: "[[3,3,3,3]]", expectedOutput: "12", isHidden: true },
      { input: "[[0]]", expectedOutput: "0", isHidden: true },
      { input: "[[5,4,3,2,1]]", expectedOutput: "9", isHidden: true },
    ],
  },
];

export default problems;

// Only seeds when run directly, so `verify.ts` can import the data without
// touching the database.
if (require.main === module) {
  runSeed(() => seedProblems("DP, Greedy & Stacks", problems));
}
