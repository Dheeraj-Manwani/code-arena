import { seedProblems, runSeed, type SeedProblem } from "./shared";

/**
 * 1/5 — Array and string fundamentals.
 *
 * The entry point of the catalogue: one idea per problem, no composite
 * techniques. Everything here is solvable with a single pass and a couple of
 * variables, which is the point — these are what the later scripts assume you
 * can already do.
 *
 * Descriptions are written from scratch. They describe well-known exercises,
 * but the prose, the framing and the examples are ours rather than lifted from
 * a problem site.
 */
const problems: SeedProblem[] = [
  {
    slug: "running-sum",
    title: "Running Sum",
    description: `Given an array of integers, build its **running sum**: the value at each
position is the total of every element up to and including that position.

Formally, \`result[i] = nums[0] + nums[1] + ... + nums[i]\`.

The obvious solution builds each total from scratch and costs O(n²). There is a
one-pass O(n) version — find it.`,
    tags: ["Array", "Prefix Sum"],
    difficulty: "easy",
    points: 80,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `nums`.",
    outputFormat: "An integer array of the same length holding the running totals.",
    constraints: [
      "1 <= nums.length <= 1000",
      "-1000 <= nums[i] <= 1000",
      "The running total always fits in a 32-bit signed integer",
    ],
    functionName: "runningSum",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int[]",
    testCases: [
      { input: "[[1,2,3,4]]", expectedOutput: "[1,3,6,10]", isHidden: false },
      { input: "[[1,1,1,1,1]]", expectedOutput: "[1,2,3,4,5]", isHidden: false },
      { input: "[[3,1,2,10,1]]", expectedOutput: "[3,4,6,16,17]", isHidden: true },
      // Single element, and negatives that pull the total back down.
      { input: "[[7]]", expectedOutput: "[7]", isHidden: true },
      { input: "[[-2,5,-3,4]]", expectedOutput: "[-2,3,0,4]", isHidden: true },
    ],
  },

  {
    slug: "sorted-squares",
    title: "Squares of a Sorted Array",
    description: `You are given an integer array sorted in **non-decreasing** order. Return an
array of the squares of each number, also sorted in non-decreasing order.

Sorting the squares afterwards works and costs O(n log n). The interesting
solution is O(n): the largest square is always at one end or the other, so you
can fill the result from the back using two pointers.`,
    tags: ["Array", "Two Pointers", "Sorting"],
    difficulty: "easy",
    points: 100,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `nums`, sorted in non-decreasing order.",
    outputFormat: "The squares of those numbers, sorted in non-decreasing order.",
    constraints: [
      "1 <= nums.length <= 10^4",
      "-10^4 <= nums[i] <= 10^4",
      "nums is sorted in non-decreasing order",
    ],
    functionName: "sortedSquares",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int[]",
    testCases: [
      { input: "[[-4,-1,0,3,10]]", expectedOutput: "[0,1,9,16,100]", isHidden: false },
      { input: "[[-7,-3,2,3,11]]", expectedOutput: "[4,9,9,49,121]", isHidden: false },
      // All negative: the output is the reverse of the squared input.
      { input: "[[-5,-3,-2,-1]]", expectedOutput: "[1,4,9,25]", isHidden: true },
      { input: "[[0]]", expectedOutput: "[0]", isHidden: true },
      { input: "[[1,2,3]]", expectedOutput: "[1,4,9]", isHidden: true },
    ],
  },

  {
    slug: "single-number-xor",
    title: "The Number That Appears Once",
    description: `Every value in the array appears **exactly twice**, except for one that appears
only once. Return that one.

You are expected to do it in linear time using constant extra space, which rules
out a hash set. There is an arithmetic property of XOR that makes this fall out
in a single pass.`,
    tags: ["Array", "Bit Manipulation"],
    difficulty: "easy",
    points: 110,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `nums` where every element but one appears twice.",
    outputFormat: "The single integer that appears only once.",
    constraints: [
      "1 <= nums.length <= 3 * 10^4",
      "nums.length is odd",
      "-3 * 10^4 <= nums[i] <= 3 * 10^4",
      "Exactly one element appears once; every other element appears exactly twice",
    ],
    functionName: "singleNumber",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    testCases: [
      { input: "[[4,1,2,1,2]]", expectedOutput: "4", isHidden: false },
      { input: "[[2,2,1]]", expectedOutput: "1", isHidden: false },
      { input: "[[1]]", expectedOutput: "1", isHidden: true },
      // The lone value is negative, which breaks a sum-based shortcut.
      { input: "[[-3,5,5]]", expectedOutput: "-3", isHidden: true },
      { input: "[[7,3,7,3,9,11,11]]", expectedOutput: "9", isHidden: true },
    ],
  },

  {
    slug: "plus-one-digits",
    title: "Plus One",
    description: `A non-negative integer is given as an array of digits, most significant digit
first. Add one to it and return the resulting digits.

The whole problem is the carry. Most inputs never carry past the last position;
the ones that do — \`[9]\`, \`[9,9]\` — are where solutions break, because the
result is *longer* than the input.`,
    tags: ["Array", "Math"],
    difficulty: "easy",
    points: 100,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `digits`, each element in 0..9, most significant first.",
    outputFormat: "The digits of the incremented number, most significant first.",
    constraints: [
      "1 <= digits.length <= 100",
      "0 <= digits[i] <= 9",
      "digits has no leading zero, except for the number 0 itself",
    ],
    functionName: "plusOne",
    params: [{ name: "digits", type: "int[]" }],
    returnType: "int[]",
    testCases: [
      { input: "[[1,2,3]]", expectedOutput: "[1,2,4]", isHidden: false },
      { input: "[[4,3,2,9]]", expectedOutput: "[4,3,3,0]", isHidden: false },
      // The two cases that grow the array.
      { input: "[[9]]", expectedOutput: "[1,0]", isHidden: true },
      { input: "[[9,9,9]]", expectedOutput: "[1,0,0,0]", isHidden: true },
      { input: "[[0]]", expectedOutput: "[1]", isHidden: true },
    ],
  },

  {
    slug: "max-consecutive-ones",
    title: "Longest Run of Ones",
    description: `Given a binary array, return the length of the longest unbroken run of \`1\`s.

Keep a current run and a best-so-far. The detail that catches people is the end
of the array: a run that reaches the final element still has to be counted.`,
    tags: ["Array"],
    difficulty: "easy",
    points: 90,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An integer array `nums` containing only 0 and 1.",
    outputFormat: "The length of the longest consecutive run of ones.",
    constraints: ["1 <= nums.length <= 10^5", "nums[i] is either 0 or 1"],
    functionName: "findMaxConsecutiveOnes",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    testCases: [
      { input: "[[1,1,0,1,1,1]]", expectedOutput: "3", isHidden: false },
      { input: "[[1,0,1,1,0,1]]", expectedOutput: "2", isHidden: false },
      // The run ends at the last index — a loop that only records on a 0 misses it.
      { input: "[[0,0,1,1,1,1]]", expectedOutput: "4", isHidden: true },
      { input: "[[0]]", expectedOutput: "0", isHidden: true },
      { input: "[[1]]", expectedOutput: "1", isHidden: true },
    ],
  },

  {
    slug: "longest-common-prefix",
    title: "Longest Common Prefix",
    description: `Return the longest string that every input string starts with. If there is no
common prefix, return the empty string \`""\`.

Comparing column by column across all the strings is the cleanest formulation —
stop as soon as one string is exhausted or a character disagrees.`,
    tags: ["String"],
    difficulty: "easy",
    points: 110,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "An array of lowercase strings `strs`.",
    outputFormat: "The longest common prefix, or an empty string if there is none.",
    constraints: [
      "1 <= strs.length <= 200",
      "0 <= strs[i].length <= 200",
      "strs[i] consists of lowercase English letters",
    ],
    functionName: "longestCommonPrefix",
    params: [{ name: "strs", type: "string[]" }],
    returnType: "string",
    testCases: [
      { input: '[["flower","flow","flight"]]', expectedOutput: '"fl"', isHidden: false },
      { input: '[["dog","racecar","car"]]', expectedOutput: '""', isHidden: false },
      // One string is itself the prefix, and an empty string kills it entirely.
      { input: '[["interspecies","interstellar","interstate"]]', expectedOutput: '"inters"', isHidden: true },
      { input: '[["abc"]]', expectedOutput: '"abc"', isHidden: true },
      { input: '[["abc",""]]', expectedOutput: '""', isHidden: true },
    ],
  },

  {
    slug: "valid-palindrome-alphanumeric",
    title: "Palindrome, Ignoring Punctuation",
    description: `A phrase is a palindrome if, after lowercasing it and discarding everything that
is not a letter or digit, it reads the same forwards and backwards.

Return whether the given string is one.

Building the cleaned string first is fine. Doing it with two pointers and no
extra allocation is better, and is what the follow-up asks for.`,
    tags: ["String", "Two Pointers"],
    difficulty: "easy",
    points: 110,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "A string `s`, which may contain letters, digits, spaces and punctuation.",
    outputFormat: "`true` if it is a palindrome under the rule above, otherwise `false`.",
    constraints: [
      "1 <= s.length <= 2 * 10^5",
      "s consists of printable ASCII characters",
    ],
    functionName: "isPalindrome",
    params: [{ name: "s", type: "string" }],
    returnType: "boolean",
    testCases: [
      { input: '["A man, a plan, a canal: Panama"]', expectedOutput: "true", isHidden: false },
      { input: '["race a car"]', expectedOutput: "false", isHidden: false },
      // Strips to nothing, which is vacuously a palindrome.
      { input: '[" "]', expectedOutput: "true", isHidden: true },
      { input: '["0P"]', expectedOutput: "false", isHidden: true },
      { input: '["ab_a"]', expectedOutput: "true", isHidden: true },
    ],
  },

  {
    slug: "reverse-words-in-string",
    title: "Reverse the Word Order",
    description: `Given a string of words separated by spaces, return a string with the words in
the opposite order.

The input may have leading spaces, trailing spaces, or several spaces between
words. The output must have **exactly one** space between words and none at
either end.

Example: \`"  the sky   is blue "\` becomes \`"blue is sky the"\`.`,
    tags: ["String", "Two Pointers"],
    difficulty: "medium",
    points: 140,
    timeLimit: 2000,
    memoryLimit: 256,
    inputFormat: "A string `s` of words separated by one or more spaces.",
    outputFormat: "The words in reverse order, single-spaced, with no leading or trailing space.",
    constraints: [
      "1 <= s.length <= 10^4",
      "s contains English letters, digits and spaces",
      "s contains at least one word",
    ],
    functionName: "reverseWords",
    params: [{ name: "s", type: "string" }],
    returnType: "string",
    testCases: [
      { input: '["the sky is blue"]', expectedOutput: '"blue is sky the"', isHidden: false },
      { input: '["  hello world  "]', expectedOutput: '"world hello"', isHidden: false },
      // Runs of interior spaces must collapse to one.
      { input: '["a good   example"]', expectedOutput: '"example good a"', isHidden: true },
      { input: '["single"]', expectedOutput: '"single"', isHidden: true },
      { input: '["  lots   of    space  "]', expectedOutput: '"space of lots"', isHidden: true },
    ],
  },
];

export default problems;

// Only seeds when run directly, so `verify.ts` can import the data without
// touching the database.
if (require.main === module) {
  runSeed(() => seedProblems("Arrays & Strings", problems));
}
