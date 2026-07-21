import { seedProblems, runSeed, type SeedProblem } from "./shared";

/**
 * 2/5 — Two pointers and sliding windows.
 *
 * The first genuine *pattern* script. Every problem here has an obvious O(n²)
 * solution and an O(n) one that comes from moving two indices instead of one,
 * so the statements are written to point at that gap rather than hide it.
 */
const problems: SeedProblem[] = [
  {
    slug: "two-sum-sorted",
    title: "Two Sum on a Sorted Array",
    description: `The array is sorted in non-decreasing order. Find the two numbers that add up
to \`target\` and return their positions as **1-indexed** values, smaller index
first.

There is exactly one solution, and you may not use the same element twice.

Because the input is sorted you can do this in O(n) with constant extra space —
start a pointer at each end and let the sum tell you which one to move.`,
    tags: ["Array", "Two Pointers", "Binary Search"],
    difficulty: "medium",
    points: 130,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "A sorted integer array `numbers`, and an integer `target`.",
    outputFormat: "A two-element array `[i, j]` of 1-indexed positions with i < j.",
    constraints: [
      "2 <= numbers.length <= 3 * 10^4",
      "-1000 <= numbers[i] <= 1000",
      "numbers is sorted in non-decreasing order",
      "Exactly one pair sums to target",
    ],
    functionName: "twoSumSorted",
    params: [
      { name: "numbers", type: "int[]" },
      { name: "target", type: "int" },
    ],
    returnType: "int[]",
    testCases: [
      { input: "[[2,7,11,15],9]", expectedOutput: "[1,2]", isHidden: false },
      { input: "[[2,3,4],6]", expectedOutput: "[1,3]", isHidden: false },
      // Negatives, duplicates, and a pair that sits at the very end.
      { input: "[[-1,0],-1]", expectedOutput: "[1,2]", isHidden: true },
      { input: "[[1,2,3,4,4,9,56,90],8]", expectedOutput: "[4,5]", isHidden: true },
      // Target 6 rather than 4: with target 4 this array has TWO valid pairs
      // (-3+7 and -1+5), and the judge compares exactly — so a correct
      // solution that found the other pair would be marked wrong.
      { input: "[[-3,-1,2,5,7],6]", expectedOutput: "[2,5]", isHidden: true },
    ],
  },

  {
    slug: "container-with-most-water",
    title: "Container With Most Water",
    description: `Each element of \`height\` is a vertical line at that x-coordinate. Pick two
lines so that the container they form with the x-axis holds the most water, and
return that amount.

The area between lines \`i\` and \`j\` is \`(j - i) * min(height[i], height[j])\` —
the *shorter* line decides the depth.

Checking every pair is O(n²). Starting wide and moving the shorter line inward
is O(n); the reason that is safe to do is worth convincing yourself of.`,
    tags: ["Array", "Two Pointers", "Greedy"],
    difficulty: "medium",
    points: 160,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `height` of line heights.",
    outputFormat: "The maximum area an container can hold.",
    constraints: ["2 <= height.length <= 10^5", "0 <= height[i] <= 10^4"],
    functionName: "maxArea",
    params: [{ name: "height", type: "int[]" }],
    returnType: "int",
    testCases: [
      { input: "[[1,8,6,2,5,4,8,3,7]]", expectedOutput: "49", isHidden: false },
      { input: "[[1,1]]", expectedOutput: "1", isHidden: false },
      // The best pair is not the two tallest lines.
      { input: "[[1,2,4,3]]", expectedOutput: "4", isHidden: true },
      { input: "[[2,3,4,5,18,17,6]]", expectedOutput: "17", isHidden: true },
      { input: "[[0,2]]", expectedOutput: "0", isHidden: true },
    ],
  },

  {
    slug: "max-average-subarray",
    title: "Best Average of a Fixed Window",
    description: `Find the contiguous subarray of length exactly \`k\` with the greatest average,
and return that average as a floating-point number.

Answers within \`1e-5\` of the true value are accepted.

Recomputing each window's sum is O(n·k). Slide instead: add the entering
element, subtract the leaving one, and the whole scan is O(n).`,
    tags: ["Array", "Sliding Window"],
    difficulty: "easy",
    points: 120,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `nums`, and an integer window length `k`.",
    outputFormat: "The maximum average of any contiguous subarray of length k.",
    constraints: [
      "1 <= k <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
    ],
    functionName: "findMaxAverage",
    params: [
      { name: "nums", type: "int[]" },
      { name: "k", type: "int" },
    ],
    returnType: "double",
    testCases: [
      { input: "[[1,12,-5,-6,50,3],4]", expectedOutput: "12.75", isHidden: false },
      { input: "[[5],1]", expectedOutput: "5.0", isHidden: false },
      // Every window is negative, so the answer is too.
      { input: "[[-1,-2,-3,-4],2]", expectedOutput: "-1.5", isHidden: true },
      { input: "[[0,4,0,3,2],1]", expectedOutput: "4.0", isHidden: true },
      { input: "[[4,2,1,3,3],5]", expectedOutput: "2.6", isHidden: true },
    ],
  },

  {
    slug: "min-size-subarray-sum",
    title: "Shortest Subarray With a Large Enough Sum",
    description: `Return the length of the **shortest** contiguous subarray whose sum is greater
than or equal to \`target\`. If no such subarray exists, return \`0\`.

All values are positive, which is what makes a sliding window work: growing the
window can only increase the sum, so shrinking from the left is safe the moment
the target is met.`,
    tags: ["Array", "Sliding Window", "Two Pointers"],
    difficulty: "medium",
    points: 160,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer `target`, and an array `nums` of positive integers.",
    outputFormat: "The minimal length of a qualifying subarray, or 0 if there is none.",
    constraints: [
      "1 <= target <= 10^9",
      "1 <= nums.length <= 10^5",
      "1 <= nums[i] <= 10^4",
    ],
    functionName: "minSubArrayLen",
    params: [
      { name: "target", type: "int" },
      { name: "nums", type: "int[]" },
    ],
    returnType: "int",
    testCases: [
      { input: "[7,[2,3,1,2,4,3]]", expectedOutput: "2", isHidden: false },
      { input: "[4,[1,4,4]]", expectedOutput: "1", isHidden: false },
      // No subarray reaches the target at all.
      { input: "[11,[1,1,1,1,1,1,1,1]]", expectedOutput: "0", isHidden: true },
      { input: "[15,[1,2,3,4,5]]", expectedOutput: "5", isHidden: true },
      { input: "[213,[12,28,83,4,25,26,25,2,25,25,25,12]]", expectedOutput: "8", isHidden: true },
    ],
  },

  {
    slug: "remove-duplicates-sorted",
    title: "Count the Distinct Values in a Sorted Array",
    description: `The array is sorted in non-decreasing order. Return how many **distinct** values
it contains.

Because the array is sorted, every group of equal values is contiguous — so a
value is new exactly when it differs from the one before it, and a single pass
with no extra memory is enough.`,
    tags: ["Array", "Two Pointers"],
    difficulty: "easy",
    points: 90,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `nums`, sorted in non-decreasing order.",
    outputFormat: "The number of distinct values.",
    constraints: [
      "1 <= nums.length <= 3 * 10^4",
      "-100 <= nums[i] <= 100",
      "nums is sorted in non-decreasing order",
    ],
    functionName: "removeDuplicates",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    testCases: [
      { input: "[[1,1,2]]", expectedOutput: "2", isHidden: false },
      { input: "[[0,0,1,1,1,2,2,3,3,4]]", expectedOutput: "5", isHidden: false },
      // Every element identical, and every element distinct.
      { input: "[[2,2,2,2]]", expectedOutput: "1", isHidden: true },
      { input: "[[-3,-1,0,4]]", expectedOutput: "4", isHidden: true },
      { input: "[[5]]", expectedOutput: "1", isHidden: true },
    ],
  },

  {
    slug: "valid-palindrome-one-deletion",
    title: "Almost a Palindrome",
    description: `Return \`true\` if the string can be made a palindrome by deleting **at most one**
character. A string that is already a palindrome qualifies, since zero deletions
is at most one.

Walk two pointers inward. The moment they disagree you have exactly two
candidate repairs — skip the left character, or skip the right one — and the
answer is whether either remaining span is a palindrome.`,
    tags: ["String", "Two Pointers", "Greedy"],
    difficulty: "medium",
    points: 150,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "A string `s` of lowercase English letters.",
    outputFormat: "`true` if at most one deletion makes it a palindrome, otherwise `false`.",
    constraints: ["1 <= s.length <= 10^5", "s consists of lowercase English letters"],
    functionName: "validPalindrome",
    params: [{ name: "s", type: "string" }],
    returnType: "boolean",
    testCases: [
      { input: '["aba"]', expectedOutput: "true", isHidden: false },
      { input: '["abca"]', expectedOutput: "true", isHidden: false },
      // Needs two deletions.
      { input: '["abc"]', expectedOutput: "false", isHidden: true },
      { input: '["a"]', expectedOutput: "true", isHidden: true },
      // The repair must be taken on the RIGHT side — skipping the left
      // character here leaves "eeed", which is still not a palindrome.
      { input: '["eeeed"]', expectedOutput: "true", isHidden: true },
    ],
  },

  {
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    description: `The array gives an elevation map where every bar is 1 unit wide. Return how many
units of water are trapped after it rains.

The water above position \`i\` is
\`min(highest bar to its left, highest bar to its right) - height[i]\`,
floored at zero. The naive version computes both maxima per position in O(n²);
prefix arrays make it O(n) with O(n) space, and two pointers make it O(n) with
O(1).`,
    tags: ["Array", "Two Pointers", "Stack", "DP"],
    difficulty: "hard",
    points: 240,
    timeLimit: 3000,
    memoryLimit: 256,
    inputFormat: "An integer array `height` of non-negative bar heights.",
    outputFormat: "The total units of trapped water.",
    constraints: ["1 <= height.length <= 2 * 10^4", "0 <= height[i] <= 10^5"],
    functionName: "trap",
    params: [{ name: "height", type: "int[]" }],
    returnType: "int",
    testCases: [
      { input: "[[0,1,0,2,1,0,1,3,2,1,2,1]]", expectedOutput: "6", isHidden: false },
      { input: "[[4,2,0,3,2,5]]", expectedOutput: "9", isHidden: false },
      // Monotonic slopes trap nothing at all.
      { input: "[[1,2,3,4,5]]", expectedOutput: "0", isHidden: true },
      { input: "[[5,4,3,2,1]]", expectedOutput: "0", isHidden: true },
      { input: "[[3,0,3]]", expectedOutput: "3", isHidden: true },
    ],
  },
];

export default problems;

// Only seeds when run directly, so `verify.ts` can import the data without
// touching the database.
if (require.main === module) {
  runSeed(() => seedProblems("Two Pointers & Sliding Window", problems));
}
