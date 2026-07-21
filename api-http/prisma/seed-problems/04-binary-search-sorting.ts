import { seedProblems, runSeed, type SeedProblem } from "./shared";

/**
 * 4/5 — Binary search and sorting.
 *
 * Half of these do not search an array at all — they binary-search an *answer*
 * (a speed, a capacity), which is the step most people miss. The statements say
 * so explicitly, because "binary search on the answer" is a technique you
 * either know or reinvent painfully.
 */
const problems: SeedProblem[] = [
  {
    slug: "classic-binary-search",
    title: "Binary Search",
    description: `The array is sorted ascending and every value is distinct. Return the index of
\`target\`, or \`-1\` if it is absent.

Your solution must run in O(log n).

Write it once, carefully, and reuse the shape forever. The two details that bite:
compute the midpoint as \`low + (high - low) / 2\` to avoid overflow, and be
consistent about whether \`high\` is inclusive.`,
    tags: ["Array", "Binary Search"],
    difficulty: "easy",
    points: 100,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "A sorted integer array `nums` of distinct values, and an integer `target`.",
    outputFormat: "The index of target, or -1 if it is not present.",
    constraints: [
      "1 <= nums.length <= 10^4",
      "-10^4 < nums[i], target < 10^4",
      "All values are distinct and sorted ascending",
    ],
    functionName: "search",
    params: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
    returnType: "int",
    testCases: [
      { input: "[[-1,0,3,5,9,12],9]", expectedOutput: "4", isHidden: false },
      { input: "[[-1,0,3,5,9,12],2]", expectedOutput: "-1", isHidden: false },
      // Both boundaries, and a single-element array.
      { input: "[[1,2,3,4,5],1]", expectedOutput: "0", isHidden: true },
      { input: "[[1,2,3,4,5],5]", expectedOutput: "4", isHidden: true },
      { input: "[[5],5]", expectedOutput: "0", isHidden: true },
    ],
  },

  {
    slug: "search-insert-position",
    title: "Search Insert Position",
    description: `Return the index of \`target\` in the sorted array. If it is not there, return the
index where it would be inserted to keep the array sorted.

This is the lower-bound variant of binary search, and it is worth noticing that
the answer can be \`nums.length\` — when the target is larger than everything.`,
    tags: ["Array", "Binary Search"],
    difficulty: "easy",
    points: 100,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "A sorted array `nums` of distinct integers, and an integer `target`.",
    outputFormat: "The index of target, or the index at which it would be inserted.",
    constraints: [
      "1 <= nums.length <= 10^4",
      "-10^4 <= nums[i], target <= 10^4",
      "nums contains distinct values sorted ascending",
    ],
    functionName: "searchInsert",
    params: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
    returnType: "int",
    testCases: [
      { input: "[[1,3,5,6],5]", expectedOutput: "2", isHidden: false },
      { input: "[[1,3,5,6],2]", expectedOutput: "1", isHidden: false },
      // Insert past the end, and insert before the start.
      { input: "[[1,3,5,6],7]", expectedOutput: "4", isHidden: true },
      { input: "[[1,3,5,6],0]", expectedOutput: "0", isHidden: true },
      { input: "[[1],1]", expectedOutput: "0", isHidden: true },
    ],
  },

  {
    slug: "integer-square-root",
    title: "Integer Square Root",
    description: `Return the square root of a non-negative integer, rounded **down** to the nearest
integer. Do not use any built-in square-root function.

Binary search the answer: the result lies in \`[0, x]\`, and for a candidate
\`m\` you only need to know whether \`m * m\` exceeds \`x\`. Watch the multiplication
— \`m * m\` overflows 32 bits well before \`x\` does.`,
    tags: ["Math", "Binary Search"],
    difficulty: "easy",
    points: 120,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "A non-negative integer `x`.",
    outputFormat: "floor(sqrt(x)).",
    constraints: ["0 <= x <= 2^31 - 1"],
    functionName: "mySqrt",
    params: [{ name: "x", type: "int" }],
    returnType: "int",
    testCases: [
      { input: "[4]", expectedOutput: "2", isHidden: false },
      { input: "[8]", expectedOutput: "2", isHidden: false },
      { input: "[0]", expectedOutput: "0", isHidden: true },
      { input: "[1]", expectedOutput: "1", isHidden: true },
      // Large enough that m*m overflows a 32-bit int mid-search.
      { input: "[2147395599]", expectedOutput: "46339", isHidden: true },
    ],
  },

  {
    slug: "search-rotated-sorted-array",
    title: "Search a Rotated Sorted Array",
    description: `A sorted array of distinct values has been rotated at some unknown pivot — for
example \`[0,1,2,4,5,6,7]\` may arrive as \`[4,5,6,7,0,1,2]\`. Return the index of
\`target\`, or \`-1\`.

Your solution must run in O(log n).

At any midpoint, **one of the two halves is still sorted**. Work out which, then
decide whether the target lies inside it. That single observation is the whole
problem.`,
    tags: ["Array", "Binary Search"],
    difficulty: "medium",
    points: 180,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "A rotated sorted array `nums` of distinct integers, and an integer `target`.",
    outputFormat: "The index of target, or -1 if it is absent.",
    constraints: [
      "1 <= nums.length <= 5000",
      "-10^4 <= nums[i], target <= 10^4",
      "All values are distinct",
      "nums is a sorted array rotated between 1 and nums.length times",
    ],
    functionName: "search",
    params: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
    returnType: "int",
    testCases: [
      { input: "[[4,5,6,7,0,1,2],0]", expectedOutput: "4", isHidden: false },
      { input: "[[4,5,6,7,0,1,2],3]", expectedOutput: "-1", isHidden: false },
      { input: "[[1],0]", expectedOutput: "-1", isHidden: true },
      // Rotation point at the very start (i.e. not rotated at all).
      { input: "[[1,2,3,4,5],4]", expectedOutput: "3", isHidden: true },
      { input: "[[5,1,2,3,4],5]", expectedOutput: "0", isHidden: true },
    ],
  },

  {
    slug: "find-minimum-rotated",
    title: "Minimum of a Rotated Sorted Array",
    description: `A sorted array of distinct values has been rotated at an unknown pivot. Return
its smallest element in O(log n).

The minimum is the one place where the array "drops". Compare the midpoint with
the rightmost element to decide which half contains that drop — comparing with
the *left* element instead is a classic way to get this subtly wrong.`,
    tags: ["Array", "Binary Search"],
    difficulty: "medium",
    points: 160,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "A rotated sorted array `nums` of distinct integers.",
    outputFormat: "The minimum value in the array.",
    constraints: [
      "1 <= nums.length <= 5000",
      "-5000 <= nums[i] <= 5000",
      "All values are distinct",
    ],
    functionName: "findMin",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    testCases: [
      { input: "[[3,4,5,1,2]]", expectedOutput: "1", isHidden: false },
      { input: "[[4,5,6,7,0,1,2]]", expectedOutput: "0", isHidden: false },
      // Not rotated, and a single element.
      { input: "[[1,2,3,4,5]]", expectedOutput: "1", isHidden: true },
      { input: "[[11,13,15,17]]", expectedOutput: "11", isHidden: true },
      { input: "[[2,1]]", expectedOutput: "1", isHidden: true },
    ],
  },

  {
    slug: "koko-eating-bananas",
    title: "Minimum Eating Speed",
    description: `There are \`piles.length\` piles of bananas and \`h\` hours available. At a chosen
speed of \`k\` bananas per hour, eating a pile of size \`p\` takes
\`ceil(p / k)\` hours — you never move on to another pile within the same hour,
so a small pile still costs a whole hour.

Return the **smallest** integer speed that finishes every pile within \`h\` hours.

This is binary search on the answer: speed is bounded by \`[1, max(piles)]\`, and
"can I finish at speed k" is monotonic — if k works, so does every larger speed.`,
    tags: ["Array", "Binary Search", "Greedy"],
    difficulty: "medium",
    points: 200,
    timeLimit: 3000,
    memoryLimit: 256,
    inputFormat: "An integer array `piles`, and an integer `h` of available hours.",
    outputFormat: "The minimum integer eating speed that finishes in time.",
    constraints: [
      "1 <= piles.length <= 10^4",
      "piles.length <= h <= 10^9",
      "1 <= piles[i] <= 10^9",
    ],
    functionName: "minEatingSpeed",
    params: [
      { name: "piles", type: "int[]" },
      { name: "h", type: "int" },
    ],
    returnType: "int",
    testCases: [
      { input: "[[3,6,7,11],8]", expectedOutput: "4", isHidden: false },
      { input: "[[30,11,23,4,20],5]", expectedOutput: "30", isHidden: false },
      { input: "[[30,11,23,4,20],6]", expectedOutput: "23", isHidden: true },
      // Exactly as many hours as piles forces the maximum pile as the speed.
      { input: "[[1,1,1,1],4]", expectedOutput: "1", isHidden: true },
      { input: "[[312884470],968709470]", expectedOutput: "1", isHidden: true },
    ],
  },

  {
    slug: "merge-intervals",
    title: "Merge Overlapping Intervals",
    description: `Each interval is a \`[start, end]\` pair. Merge every set of overlapping
intervals and return the result sorted by start.

Intervals that merely touch — \`[1,4]\` and \`[4,5]\` — count as overlapping and
become \`[1,5]\`.

Sort by start first; after that a single pass suffices, because an interval can
only ever overlap the one currently being built.`,
    tags: ["Array", "Sorting", "Intervals"],
    difficulty: "medium",
    points: 190,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An array of `[start, end]` integer pairs, in arbitrary order.",
    outputFormat: "The merged intervals, sorted ascending by start.",
    constraints: [
      "1 <= intervals.length <= 10^4",
      "intervals[i].length == 2",
      "0 <= start <= end <= 10^4",
    ],
    functionName: "merge",
    params: [{ name: "intervals", type: "int[][]" }],
    returnType: "int[][]",
    testCases: [
      { input: "[[[1,3],[2,6],[8,10],[15,18]]]", expectedOutput: "[[1,6],[8,10],[15,18]]", isHidden: false },
      { input: "[[[1,4],[4,5]]]", expectedOutput: "[[1,5]]", isHidden: false },
      // Unsorted input, and an interval wholly contained in another.
      { input: "[[[5,6],[1,3],[2,10]]]", expectedOutput: "[[1,10]]", isHidden: true },
      { input: "[[[1,4],[2,3]]]", expectedOutput: "[[1,4]]", isHidden: true },
      { input: "[[[1,2]]]", expectedOutput: "[[1,2]]", isHidden: true },
    ],
  },

  {
    slug: "h-index",
    title: "H-Index",
    description: `Given the citation counts of a researcher's papers, return their **h-index**: the
largest \`h\` such that at least \`h\` papers have \`h\` or more citations each.

Sorting descending makes it a single scan — walk the sorted list and stop when
the citation count drops below the position. Counting sort gets it to O(n),
since no h-index can exceed the number of papers.`,
    tags: ["Array", "Sorting", "Counting"],
    difficulty: "medium",
    points: 170,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `citations` of per-paper citation counts.",
    outputFormat: "The researcher's h-index.",
    constraints: [
      "1 <= citations.length <= 5000",
      "0 <= citations[i] <= 1000",
    ],
    functionName: "hIndex",
    params: [{ name: "citations", type: "int[]" }],
    returnType: "int",
    testCases: [
      { input: "[[3,0,6,1,5]]", expectedOutput: "3", isHidden: false },
      { input: "[[1,3,1]]", expectedOutput: "1", isHidden: false },
      // No citations at all, and every paper heavily cited.
      { input: "[[0,0,0]]", expectedOutput: "0", isHidden: true },
      { input: "[[100,100,100]]", expectedOutput: "3", isHidden: true },
      { input: "[[11,15]]", expectedOutput: "2", isHidden: true },
    ],
  },
];

export default problems;

// Only seeds when run directly, so `verify.ts` can import the data without
// touching the database.
if (require.main === module) {
  runSeed(() => seedProblems("Binary Search & Sorting", problems));
}
