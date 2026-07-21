import { seedLearnPath, runSeed, type PathSeed } from "./shared";

/**
 * Learn path 1 of 2 — "Patterns That Repeat".
 *
 * Ordered the way the widely-taught progression runs: arrays and strings first,
 * then the two-index techniques, then hashing, then binary search. Each module
 * assumes only the ones before it.
 *
 * Every problem referenced here comes from the five problem seeds, which is the
 * point — a path is *curation* over the same public catalogue `/problems`
 * serves, not a private set of questions.
 */
const path: PathSeed = {
  slug: "patterns-that-repeat",
  title: "Patterns That Repeat",
  description:
    "The handful of techniques that account for most array and string problems. Learn each one on a problem where it is obvious, then on one where it is not.",
  isFeatured: true,
  order: 1,
  unlockThreshold: 0.6,

  mcqs: {
    "prefix-why": {
      questionText:
        "A prefix-sum array lets you answer range-sum queries in O(1). What does it cost?",
      options: [
        "Nothing — it is strictly better than scanning",
        "O(n) extra space, and O(n) to rebuild whenever the array changes",
        "O(log n) per query",
        "It only works on sorted arrays",
      ],
      correctOptionIndex: 1,
    },
    "two-pointer-safety": {
      questionText:
        "In Container With Most Water you always move the pointer at the SHORTER line. Why is discarding the other one safe?",
      options: [
        "The taller line is always part of the answer",
        "Any pair using the shorter line is limited by it, and every remaining pair with it is narrower — so none can beat the area just measured",
        "Because the array is sorted",
        "It is not safe; it is a heuristic that usually works",
      ],
      correctOptionIndex: 1,
    },
    "window-precondition": {
      questionText:
        "The sliding window in 'shortest subarray with sum >= target' relies on one property of the input. Which?",
      options: [
        "The array is sorted",
        "All values are positive, so extending the window can only increase the sum",
        "The target is smaller than the total",
        "The array has no duplicates",
      ],
      correctOptionIndex: 1,
    },
    "hash-vs-sort": {
      questionText:
        "You need to know whether an array contains a duplicate. When is sorting the BETTER choice over a hash set?",
      options: [
        "Never — hashing is always faster",
        "When memory is constrained, since sorting can be done in place while a hash set costs O(n) extra",
        "When the array is very large",
        "When the values are negative",
      ],
      correctOptionIndex: 1,
    },
    "prefix-seed-zero": {
      questionText:
        "In 'subarrays summing to k', the prefix-count table is seeded with {0: 1} before the scan. What breaks if you omit it?",
      options: [
        "Nothing; it is a micro-optimisation",
        "Subarrays that start at index 0 are never counted",
        "The result is doubled",
        "It infinite-loops on negative values",
      ],
      correctOptionIndex: 1,
    },
    "binary-search-midpoint": {
      questionText:
        "Why is the midpoint written as `low + (high - low) / 2` rather than `(low + high) / 2`?",
      options: [
        "It is faster",
        "`low + high` can overflow a fixed-width integer when both are large",
        "It handles empty ranges",
        "The two are identical; it is a style preference",
      ],
      correctOptionIndex: 1,
    },
    "answer-space-search": {
      questionText:
        "Koko's minimum eating speed is found by binary search, but the array is never searched. What is being searched instead?",
      options: [
        "The array, after sorting it",
        "The space of possible answers (speeds 1..max pile), which works because 'finishes in time' is monotonic in speed",
        "The indices of the piles",
        "Nothing — it is a greedy algorithm",
      ],
      correctOptionIndex: 1,
    },
  },

  curriculum: [
    {
      slug: "reading-arrays",
      title: "Reading an Array Once",
      summary:
        "Single-pass thinking: carry a little state, and never look at the same element twice.",
      lessons: [
        {
          slug: "running-state",
          title: "Carrying State Forward",
          body: `Most "easy" array problems are the same problem: walk the array once, and
carry just enough state to answer at the end.

The skill is deciding what that state is. For a running total it is the total so
far. For the longest run of ones it is *two* numbers — the current run and the
best run — and forgetting the second is the usual bug.

A useful check: if your inner loop re-reads elements you have already seen, ask
what you would have had to remember to avoid it.`,
          questions: [
            { kind: "problem", problemSlug: "running-sum" },
            { kind: "problem", problemSlug: "max-consecutive-ones", note: "Two pieces of state, not one." },
            { kind: "mcq", mcqKey: "prefix-why" },
          ],
        },
        {
          slug: "edges-that-bite",
          title: "The Edges That Bite",
          body: `These two are here for their edge cases rather than their algorithms.

**Plus One** is trivial until the carry runs off the front — \`[9,9]\` produces a
*longer* array than it received, and a solution that writes into the input in
place cannot express that.

**Squares of a Sorted Array** is trivial if you sort afterwards. The O(n) version
asks you to notice that the largest square is at one end or the other, never in
the middle.`,
          questions: [
            { kind: "problem", problemSlug: "plus-one-digits" },
            { kind: "problem", problemSlug: "sorted-squares", note: "Try it without sorting." },
            { kind: "problem", problemSlug: "single-number-xor", note: "Constant space — no set allowed." },
          ],
        },
      ],
    },

    {
      slug: "two-pointers",
      title: "Two Pointers",
      summary:
        "One index is a loop. Two indices, moved with intent, turn many O(n²) scans into O(n).",
      lessons: [
        {
          slug: "converging",
          title: "Closing In From Both Ends",
          body: `Start one pointer at each end and move them toward each other. The question
that defines the technique is: **which pointer do I move, and how do I know
discarding the other option is safe?**

For a sorted two-sum, the sum tells you: too small, move the left pointer up;
too large, move the right one down.

For Container With Most Water the argument is subtler and worth working through
properly — it is the reason the greedy move is provably correct rather than
merely plausible.`,
          questions: [
            { kind: "problem", problemSlug: "two-sum-sorted" },
            { kind: "problem", problemSlug: "container-with-most-water" },
            { kind: "mcq", mcqKey: "two-pointer-safety" },
          ],
        },
        {
          slug: "same-direction",
          title: "Both Pointers Moving Forward",
          body: `The other shape: both pointers move left to right, one leading and one
trailing. The trailing pointer usually marks "the boundary of the answer so far".

Palindrome checks are the cleanest example — and the "at most one deletion"
variant is a nice lesson in branching: at the first mismatch there are exactly
two possible repairs, and you check both.`,
          questions: [
            { kind: "problem", problemSlug: "valid-palindrome-alphanumeric" },
            { kind: "problem", problemSlug: "valid-palindrome-one-deletion", note: "Two candidate repairs, not one." },
            { kind: "problem", problemSlug: "remove-duplicates-sorted" },
          ],
        },
        {
          slug: "hard-two-pointer",
          title: "When It Gets Hard",
          body: `Trapping Rain Water is the canonical hard two-pointer problem, and it is worth
attempting three times: once with nested loops, once with prefix/suffix maximum
arrays, and once with two pointers and O(1) space.

Doing it in that order is the fastest way to understand *why* the two-pointer
version is correct, rather than memorising it.`,
          questions: [
            { kind: "problem", problemSlug: "trapping-rain-water", note: "Try the O(n) space version first." },
          ],
        },
      ],
    },

    {
      slug: "sliding-window",
      title: "Sliding Windows",
      summary:
        "A window with a moving left and right edge — and a precondition most people never state out loud.",
      lessons: [
        {
          slug: "fixed-window",
          title: "Fixed-Width Windows",
          body: `The easy case: the window never changes size. Add the entering element,
subtract the leaving one, and every window costs O(1) instead of O(k).

Once you have written it once, the pattern is unmistakable.`,
          questions: [
            { kind: "problem", problemSlug: "max-average-subarray" },
          ],
        },
        {
          slug: "variable-window",
          title: "Windows That Grow and Shrink",
          body: `Now the window resizes: grow the right edge until some condition holds, then
pull the left edge in as far as it can go while it still holds.

There is a precondition hiding in that description. Growing the window must move
the quantity you care about in a predictable direction — which for sums means
**all values must be positive**. With negatives in the array the technique is
simply wrong, and you reach for prefix sums instead.`,
          questions: [
            { kind: "problem", problemSlug: "min-size-subarray-sum" },
            { kind: "mcq", mcqKey: "window-precondition" },
          ],
        },
      ],
    },

    {
      slug: "hashing",
      title: "Hashing and Counting",
      summary:
        "Spend memory to buy a lookup. The trade is almost always worth it — but it is a trade.",
      lessons: [
        {
          slug: "membership",
          title: "Have I Seen This Before?",
          body: `The simplest use of a hash set: constant-time membership. It turns "scan the
rest of the array looking for x" into "ask the set", and an O(n²) algorithm into
an O(n) one.

The cost is O(n) memory, which is worth stating rather than assuming — sorting
in place is sometimes the better engineering answer.`,
          questions: [
            { kind: "problem", problemSlug: "contains-duplicate" },
            { kind: "problem", problemSlug: "sorted-intersection" },
            { kind: "mcq", mcqKey: "hash-vs-sort" },
          ],
        },
        {
          slug: "counting",
          title: "Counting Things",
          body: `A map from value to count answers a surprising number of questions: anagrams,
first-unique, majority.

Two habits worth forming here. First, when the alphabet is small and fixed
(26 lowercase letters), an array beats a hash map. Second, "first" almost always
means first *by position*, which usually means a second pass over the original
input rather than over the count table.`,
          questions: [
            { kind: "problem", problemSlug: "valid-anagram" },
            { kind: "problem", problemSlug: "first-unique-character", note: "Two passes: count, then scan." },
            { kind: "problem", problemSlug: "majority-element", note: "Then look up Boyer–Moore voting." },
          ],
        },
        {
          slug: "prefix-sums",
          title: "Prefix Sums and Hashing Together",
          body: `The combination that handles subarray-sum questions with negative values —
exactly where sliding windows fail.

The idea: if you know the total up to \`i\` and the total up to \`j\`, you know the
sum between them. Store the prefix totals you have seen in a count table, and
each new position becomes a single lookup.

The detail that catches everyone is seeding the table with a prefix of zero.`,
          questions: [
            { kind: "problem", problemSlug: "pivot-index", note: "Warm-up: no hashing needed yet." },
            { kind: "problem", problemSlug: "subarray-sum-equals-k" },
            { kind: "mcq", mcqKey: "prefix-seed-zero" },
            { kind: "problem", problemSlug: "longest-consecutive-sequence", note: "Hashing, but the trick is where you START counting." },
          ],
        },
      ],
    },

    {
      slug: "binary-search",
      title: "Binary Search",
      summary:
        "Write it once, correctly. Then learn the version that searches an answer instead of an array.",
      lessons: [
        {
          slug: "the-template",
          title: "Getting the Template Right",
          body: `Binary search is short and famously easy to get subtly wrong. Settle on one
template and reuse it.

Two details worth fixing in your memory: compute the midpoint as
\`low + (high - low) / 2\`, and be deliberate about whether \`high\` is an
inclusive index or a one-past-the-end bound. Mixing the two conventions is the
source of most off-by-one bugs here.`,
          questions: [
            { kind: "problem", problemSlug: "classic-binary-search" },
            { kind: "problem", problemSlug: "search-insert-position", note: "The lower-bound variant." },
            { kind: "mcq", mcqKey: "binary-search-midpoint" },
          ],
        },
        {
          slug: "modified-search",
          title: "When the Array Is Not Quite Sorted",
          body: `A rotated sorted array is not sorted, but it is *made of* two sorted runs — and
at any midpoint, at least one side is a clean sorted range.

Work out which side that is, decide whether the target lies inside it, and
discard the other half. Same O(log n), one extra comparison.`,
          questions: [
            { kind: "problem", problemSlug: "find-minimum-rotated" },
            { kind: "problem", problemSlug: "search-rotated-sorted-array" },
          ],
        },
        {
          slug: "search-the-answer",
          title: "Searching the Answer, Not the Array",
          body: `The step that unlocks a whole category of "minimum X such that Y" problems.

You are not searching the input at all. You are searching the range of possible
answers, and the only thing you need is a predicate — "does speed k finish in
time?" — that is **monotonic**: once it becomes true it stays true.

Find the boundary where the predicate flips, and that boundary is your answer.`,
          questions: [
            { kind: "problem", problemSlug: "integer-square-root", note: "The gentlest possible version." },
            { kind: "problem", problemSlug: "koko-eating-bananas" },
            { kind: "mcq", mcqKey: "answer-space-search" },
          ],
        },
      ],
    },
  ],
};

runSeed(() => seedLearnPath(path));
