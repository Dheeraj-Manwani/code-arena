import { seedLearnPath, runSeed, type PathSeed } from "./shared";

/**
 * Learn path 2 of 2 — "Thinking in Subproblems".
 *
 * The follow-on to "Patterns That Repeat", and deliberately organised around a
 * question rather than a data structure: *when does a locally-best choice give
 * a globally-best answer?* Greedy and DP are taught side by side for that
 * reason — separately, students learn to pattern-match the wrong one.
 */
const path: PathSeed = {
  slug: "thinking-in-subproblems",
  title: "Thinking in Subproblems",
  description:
    "Greedy, dynamic programming and monotonic stacks — and, more usefully, how to tell which one a problem actually wants.",
  isFeatured: true,
  order: 2,
  unlockThreshold: 0.5,

  mcqs: {
    "greedy-vs-dp": {
      questionText:
        "What has to be true for a greedy algorithm to be CORRECT, rather than merely plausible?",
      options: [
        "The input must be sorted",
        "Taking the locally-best choice must never rule out a globally-optimal solution",
        "The problem must have no negative values",
        "It must run in O(n)",
      ],
      correctOptionIndex: 1,
    },
    "house-robber-greedy": {
      questionText:
        "Why does 'always rob the largest remaining house' fail on House Robber? Consider [2,1,1,2].",
      options: [
        "It does not fail; it is optimal",
        "Taking a 2 first blocks its neighbour, and the optimal answer takes both 2s at the ends for 4",
        "It fails only when values repeat",
        "Because the array length is even",
      ],
      correctOptionIndex: 1,
    },
    "dp-state": {
      questionText:
        "In House Robber the state is 'best total considering the first i houses'. What makes that a valid DP state?",
      options: [
        "It is the smallest possible amount of information",
        "Everything after house i depends on the past ONLY through that value — the earlier choices no longer matter",
        "It uses O(1) memory",
        "It can be computed greedily",
      ],
      correctOptionIndex: 1,
    },
    "coin-loop-order": {
      questionText:
        "In coin change, iterating coins outside and amounts inside counts COMBINATIONS. What does swapping the loops count?",
      options: [
        "The same thing, just slower",
        "Permutations — 1+2 and 2+1 are then counted separately",
        "Nothing; it produces zero",
        "Only combinations using the first coin",
      ],
      correctOptionIndex: 1,
    },
    "monotonic-stack": {
      questionText:
        "A monotonic stack solves Daily Temperatures in O(n). What is the amortised argument for that bound?",
      options: [
        "The stack never exceeds a constant size",
        "Each index is pushed at most once and popped at most once, so total stack work is O(n) across the whole scan",
        "The temperatures are bounded between 30 and 100",
        "Because the input is sorted",
      ],
      correctOptionIndex: 1,
    },
    "gas-station-insight": {
      questionText:
        "In Gas Station, if you run out of fuel travelling from station `start` to station `i`, what can you conclude?",
      options: [
        "Only that `start` fails; every other station must be retried",
        "That no station between `start` and `i` can be a valid start either, so the search resumes at i+1",
        "That the circuit is impossible",
        "That you should start from the station with the most gas",
      ],
      correctOptionIndex: 1,
    },
    "histogram-limit": {
      questionText:
        "In Largest Rectangle in a Histogram, what limits the height of a rectangle spanning a range of bars?",
      options: [
        "The tallest bar in the range",
        "The shortest bar in the range",
        "The average bar height",
        "The first bar in the range",
      ],
      correctOptionIndex: 1,
    },
  },

  curriculum: [
    {
      slug: "greedy-that-works",
      title: "Greedy That Actually Works",
      summary:
        "Three problems where the locally-best choice is provably the globally-best one — and the argument for why.",
      lessons: [
        {
          slug: "reachability",
          title: "Tracking the Best So Far",
          body: `The simplest greedy shape: sweep once, maintain the best thing seen so far, and
never reconsider.

Jump Game is the cleanest example. You do not need to know *how* you would reach
an index, only whether it is reachable — so a single "furthest reachable"
number is enough state, and the answer falls out of one pass.

The habit to build: before writing a greedy loop, say out loud why not
reconsidering is safe.`,
          questions: [
            { kind: "problem", problemSlug: "jump-game" },
            { kind: "mcq", mcqKey: "greedy-vs-dp" },
          ],
        },
        {
          slug: "discarding-ranges",
          title: "Discarding Whole Ranges at Once",
          body: `A stronger greedy argument: failing at one point tells you something about
*every* candidate you skipped over.

In Gas Station, running dry between \`start\` and \`i\` rules out not just
\`start\` but every station in between — because each of them would have set off
with no more fuel than you had. That single observation collapses an O(n²)
search into one pass.`,
          questions: [
            { kind: "problem", problemSlug: "gas-station-circuit" },
            { kind: "mcq", mcqKey: "gas-station-insight" },
            { kind: "problem", problemSlug: "h-index", note: "Sort, then sweep — greedy in disguise." },
          ],
        },
      ],
    },

    {
      slug: "where-greedy-breaks",
      title: "Where Greedy Breaks",
      summary:
        "The same instinct, applied one problem over, quietly produces wrong answers. This is the transition to DP.",
      lessons: [
        {
          slug: "counterexamples",
          title: "Finding the Counterexample",
          body: `House Robber looks greedy. Two plausible strategies — "take every other
house" and "always take the largest" — are both wrong, and the array
\`[2,1,1,2]\` defeats both: the optimal answer takes the two 2s at the ends for 4.

Learning to *reach for a small counterexample* before trusting a greedy idea is
worth more than any single algorithm in this path.

When greedy fails, the reason is always the same: a locally-best choice removed
an option that the globally-best answer needed.`,
          questions: [
            { kind: "problem", problemSlug: "house-robber", note: "Try greedy first, then find the counterexample." },
            { kind: "mcq", mcqKey: "house-robber-greedy" },
          ],
        },
        {
          slug: "state-and-recurrence",
          title: "State, and the Recurrence",
          body: `Dynamic programming is two decisions, and the first is the hard one.

**What is the state?** A summary of the past that is *sufficient* — everything
in the future depends on the past only through it. In House Robber it is "best
total considering the first i houses".

**What is the recurrence?** How the state at i follows from earlier states. Here:
either rob house i and add the best from i-2, or skip it and keep the best from
i-1.

Once both are written down, the code is mechanical. Notice too that only the
last two values matter, so the table collapses to two variables.`,
          questions: [
            { kind: "problem", problemSlug: "min-cost-climbing-stairs", note: "The same recurrence, one step simpler." },
            { kind: "mcq", mcqKey: "dp-state" },
          ],
        },
      ],
    },

    {
      slug: "counting-dp",
      title: "Counting With DP",
      summary:
        "When the answer is 'how many ways', the loop order stops being an implementation detail.",
      lessons: [
        {
          slug: "paths-and-grids",
          title: "Counting Paths",
          body: `The gentlest counting DP: each cell's count is the sum of the cells that can
reach it. No optimisation, no choice — just addition.

Unique Paths is also a good reminder that DP is not always the only route. The
same answer is a binomial coefficient, because every path is a fixed number of
rights and downs in some order.`,
          questions: [
            { kind: "problem", problemSlug: "unique-paths-grid" },
          ],
        },
        {
          slug: "combinations-vs-permutations",
          title: "Combinations, Not Permutations",
          body: `Coin change is where loop order becomes load-bearing rather than stylistic.

Coins on the outside, amounts on the inside, counts **combinations** — each coin
is considered once, so \`1+2\` and \`2+1\` collapse into one.

Swap the loops and you count **permutations** instead, because every amount
reconsiders every coin and orderings are counted separately.

Same table, same recurrence, different answer. Reading the loop order off the
problem statement is the skill.`,
          questions: [
            { kind: "problem", problemSlug: "coin-change-combinations" },
            { kind: "mcq", mcqKey: "coin-loop-order" },
          ],
        },
      ],
    },

    {
      slug: "monotonic-stacks",
      title: "Monotonic Stacks",
      summary:
        "One structure that answers 'what is the next larger element?' for every position in a single pass.",
      lessons: [
        {
          slug: "next-greater",
          title: "The Next Greater Element",
          body: `A whole family of problems asks the same thing: for each position, where is the
next element bigger (or smaller) than it?

The naive answer re-scans forward from every index. The linear answer keeps a
stack of positions still waiting for their answer, kept in decreasing order —
so a new, larger value resolves everything on the stack it beats.

Each index is pushed once and popped once, which is the whole complexity
argument.`,
          questions: [
            { kind: "problem", problemSlug: "daily-temperatures" },
            { kind: "mcq", mcqKey: "monotonic-stack" },
          ],
        },
        {
          slug: "spans-and-areas",
          title: "From Next-Greater to Spans",
          body: `The harder use: instead of asking *where* the next smaller element is, ask how
far a bar can extend in both directions before hitting one.

That span, multiplied by the bar's height, is the largest rectangle with that
bar as its limiting height — and the answer is the best over all bars.

Largest Rectangle in a Histogram is a genuinely hard problem, and it is the last
one here on purpose. Take the time; the sentinel trick at the end of the scan is
worth understanding rather than copying.`,
          questions: [
            { kind: "mcq", mcqKey: "histogram-limit" },
            { kind: "problem", problemSlug: "largest-rectangle-histogram", note: "The hardest problem in either path. Expect to reread it." },
            { kind: "problem", problemSlug: "trapping-rain-water", note: "Revisited — it also yields to a monotonic stack." },
          ],
        },
      ],
    },
  ],
};

runSeed(() => seedLearnPath(path));
