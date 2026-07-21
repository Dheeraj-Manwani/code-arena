import { seedProblems, runSeed, type SeedProblem } from "./shared";

/**
 * 3/5 — Hashing, counting and prefix sums.
 *
 * The unifying idea: trade memory for a lookup you would otherwise pay a scan
 * for. Several of these have a deliberately tempting sorted-or-nested solution
 * that passes the visible cases and times out on the hidden ones.
 *
 * Where a problem would naturally return "any valid answer", the statement pins
 * an order — the judge compares exactly, so an unpinned answer would fail
 * correct solutions that happen to choose differently.
 */
const problems: SeedProblem[] = [
  {
    slug: "contains-duplicate",
    title: "Contains a Duplicate",
    description: `Return \`true\` if any value appears at least twice in the array, and \`false\` if
every value is distinct.

Sorting first gets you there in O(n log n). A hash set answers it in O(n), and
can stop the moment it sees a repeat rather than finishing the pass.`,
    tags: ["Array", "Hash Table", "Sorting"],
    difficulty: "easy",
    points: 80,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `nums`.",
    outputFormat: "`true` if some value occurs more than once, otherwise `false`.",
    constraints: ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
    functionName: "containsDuplicate",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "boolean",
    testCases: [
      { input: "[[1,2,3,1]]", expectedOutput: "true", isHidden: false },
      { input: "[[1,2,3,4]]", expectedOutput: "false", isHidden: false },
      { input: "[[1,1,1,3,3,4,3,2,4,2]]", expectedOutput: "true", isHidden: true },
      { input: "[[7]]", expectedOutput: "false", isHidden: true },
      // The duplicate pair is negative and non-adjacent.
      { input: "[[-5,3,9,-5]]", expectedOutput: "true", isHidden: true },
    ],
  },

  {
    slug: "valid-anagram",
    title: "Valid Anagram",
    description: `Return \`true\` if \`t\` is a rearrangement of \`s\` — same characters, same counts,
possibly different order.

Counting 26 letters is O(n) and needs no sorting. Note that two strings of
different lengths can never be anagrams, which is a one-line early exit.`,
    tags: ["String", "Hash Table", "Sorting"],
    difficulty: "easy",
    points: 90,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "Two lowercase strings `s` and `t`.",
    outputFormat: "`true` if t is an anagram of s, otherwise `false`.",
    constraints: [
      "1 <= s.length, t.length <= 5 * 10^4",
      "s and t consist of lowercase English letters",
    ],
    functionName: "isAnagram",
    params: [
      { name: "s", type: "string" },
      { name: "t", type: "string" },
    ],
    returnType: "boolean",
    testCases: [
      { input: '["anagram","nagaram"]', expectedOutput: "true", isHidden: false },
      { input: '["rat","car"]', expectedOutput: "false", isHidden: false },
      // Same letters, different counts — a set-based solution says true here.
      { input: '["aacc","ccac"]', expectedOutput: "false", isHidden: true },
      { input: '["a","ab"]', expectedOutput: "false", isHidden: true },
      { input: '["listen","silent"]', expectedOutput: "true", isHidden: true },
    ],
  },

  {
    slug: "first-unique-character",
    title: "First Non-Repeating Character",
    description: `Return the index of the first character in the string that appears exactly once.
If every character repeats, return \`-1\`.

Two passes are the clean answer: count every character, then walk the string
again and return the first index whose count is 1. Note that "first" means
first *by position*, not the first one you happen to find in the count table.`,
    tags: ["String", "Hash Table", "Counting"],
    difficulty: "easy",
    points: 110,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "A string `s` of lowercase English letters.",
    outputFormat: "The index of the first non-repeating character, or -1.",
    constraints: ["1 <= s.length <= 10^5", "s consists of lowercase English letters"],
    functionName: "firstUniqChar",
    params: [{ name: "s", type: "string" }],
    returnType: "int",
    testCases: [
      { input: '["leetcode"]', expectedOutput: "0", isHidden: false },
      { input: '["loveleetcode"]', expectedOutput: "2", isHidden: false },
      { input: '["aabb"]', expectedOutput: "-1", isHidden: true },
      // The unique character is the very last one.
      { input: '["aabbc"]', expectedOutput: "4", isHidden: true },
      { input: '["z"]', expectedOutput: "0", isHidden: true },
    ],
  },

  {
    slug: "majority-element",
    title: "Majority Element",
    description: `One value occupies **more than half** the array. Return it.

A hash map counting occurrences is O(n) time and O(n) space. The Boyer–Moore
voting algorithm does it in O(n) time and O(1) space, and is short enough to be
worth learning once and remembering.`,
    tags: ["Array", "Hash Table", "Greedy"],
    difficulty: "easy",
    points: 120,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `nums` in which one value appears more than n/2 times.",
    outputFormat: "The majority value.",
    constraints: [
      "1 <= nums.length <= 5 * 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "A majority element always exists",
    ],
    functionName: "majorityElement",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    testCases: [
      { input: "[[3,2,3]]", expectedOutput: "3", isHidden: false },
      { input: "[[2,2,1,1,1,2,2]]", expectedOutput: "2", isHidden: false },
      { input: "[[1]]", expectedOutput: "1", isHidden: true },
      // The majority value never appears first, and is negative.
      { input: "[[5,-1,-1,-1,-1]]", expectedOutput: "-1", isHidden: true },
      { input: "[[6,6,6,7,7]]", expectedOutput: "6", isHidden: true },
    ],
  },

  {
    slug: "subarray-sum-equals-k",
    title: "Subarrays Summing to K",
    description: `Return how many contiguous subarrays sum to exactly \`k\`.

Values may be negative, so a sliding window does **not** work here — growing a
window can lower the sum.

The technique is prefix sums with a count table: if \`prefix[j] - prefix[i] = k\`,
then the subarray between them sums to k, so at each position you ask how many
earlier prefixes equal \`prefix[j] - k\`. Remember to seed the table with a
prefix of 0, or you miss every subarray that starts at index 0.`,
    tags: ["Array", "Hash Table", "Prefix Sum"],
    difficulty: "medium",
    points: 180,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `nums`, and an integer `k`.",
    outputFormat: "The number of contiguous subarrays whose sum is exactly k.",
    constraints: [
      "1 <= nums.length <= 2 * 10^4",
      "-1000 <= nums[i] <= 1000",
      "-10^7 <= k <= 10^7",
    ],
    functionName: "subarraySum",
    params: [
      { name: "nums", type: "int[]" },
      { name: "k", type: "int" },
    ],
    returnType: "int",
    testCases: [
      { input: "[[1,1,1],2]", expectedOutput: "2", isHidden: false },
      { input: "[[1,2,3],3]", expectedOutput: "2", isHidden: false },
      // Negatives, and subarrays that begin at index 0.
      { input: "[[1,-1,0],0]", expectedOutput: "3", isHidden: true },
      { input: "[[3,4,7,2,-3,1,4,2],7]", expectedOutput: "4", isHidden: true },
      { input: "[[1],0]", expectedOutput: "0", isHidden: true },
    ],
  },

  {
    slug: "pivot-index",
    title: "Pivot Index",
    description: `Find the leftmost index where the sum of everything strictly to its left equals
the sum of everything strictly to its right. Return \`-1\` if no such index
exists.

The sum of an empty side is \`0\`, so index 0 can qualify.

One pass to total the array, then one pass tracking the running left sum, is
enough — the right sum is \`total - left - nums[i]\`.`,
    tags: ["Array", "Prefix Sum"],
    difficulty: "easy",
    points: 120,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `nums`.",
    outputFormat: "The leftmost pivot index, or -1 if there is none.",
    constraints: ["1 <= nums.length <= 10^4", "-1000 <= nums[i] <= 1000"],
    functionName: "pivotIndex",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    testCases: [
      { input: "[[1,7,3,6,5,6]]", expectedOutput: "3", isHidden: false },
      { input: "[[1,2,3]]", expectedOutput: "-1", isHidden: false },
      // Index 0 wins because the left side is empty.
      { input: "[[2,1,-1]]", expectedOutput: "0", isHidden: true },
      { input: "[[-1,-1,-1,-1,-1,0]]", expectedOutput: "2", isHidden: true },
      { input: "[[0]]", expectedOutput: "0", isHidden: true },
    ],
  },

  {
    slug: "longest-consecutive-sequence",
    title: "Longest Consecutive Run",
    description: `Return the length of the longest run of consecutive integers present in the
array. The values need not be adjacent in the array, and duplicates do not
extend a run.

Example: \`[100, 4, 200, 1, 3, 2]\` contains \`1, 2, 3, 4\`, so the answer is 4.

Sorting solves it in O(n log n). The O(n) solution puts everything in a set and
only starts counting from values that have no predecessor in the set — without
that check it degrades back to quadratic.`,
    tags: ["Array", "Hash Table", "Union Find"],
    difficulty: "medium",
    points: 190,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `nums`.",
    outputFormat: "The length of the longest consecutive run of values.",
    constraints: ["0 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
    functionName: "longestConsecutive",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    testCases: [
      { input: "[[100,4,200,1,3,2]]", expectedOutput: "4", isHidden: false },
      { input: "[[0,3,7,2,5,8,4,6,0,1]]", expectedOutput: "9", isHidden: false },
      // Duplicates must not inflate the run length.
      { input: "[[1,1,1,1]]", expectedOutput: "1", isHidden: true },
      { input: "[[9,1,4,7,3,-1,0,5,8,-1,6]]", expectedOutput: "7", isHidden: true },
      { input: "[[]]", expectedOutput: "0", isHidden: true },
    ],
  },

  {
    slug: "sorted-intersection",
    title: "Intersection of Two Arrays",
    description: `Return the values that appear in **both** arrays, each value listed once, sorted
in ascending order.

The sort is part of the specification rather than an afterthought — it makes the
answer unique, so any correct solution produces exactly the same array.`,
    tags: ["Array", "Hash Table", "Sorting"],
    difficulty: "easy",
    points: 110,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "Two integer arrays `nums1` and `nums2`.",
    outputFormat: "The distinct shared values, sorted ascending. Empty if there are none.",
    constraints: [
      "1 <= nums1.length, nums2.length <= 1000",
      "-10^5 <= nums1[i], nums2[i] <= 10^5",
    ],
    functionName: "intersection",
    params: [
      { name: "nums1", type: "int[]" },
      { name: "nums2", type: "int[]" },
    ],
    returnType: "int[]",
    testCases: [
      { input: "[[1,2,2,1],[2,2]]", expectedOutput: "[2]", isHidden: false },
      { input: "[[4,9,5],[9,4,9,8,4]]", expectedOutput: "[4,9]", isHidden: false },
      { input: "[[1,2,3],[4,5,6]]", expectedOutput: "[]", isHidden: true },
      // Negatives sort before positives.
      { input: "[[-3,0,7,-3],[7,-3,-3]]", expectedOutput: "[-3,7]", isHidden: true },
      { input: "[[5],[5]]", expectedOutput: "[5]", isHidden: true },
    ],
  },
];

export default problems;

// Only seeds when run directly, so `verify.ts` can import the data without
// touching the database.
if (require.main === module) {
  runSeed(() => seedProblems("Hashing & Counting", problems));
}
