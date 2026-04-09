import { Difficulty, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const contestTitles = [
  "Weekly Coding Challenge",
  "Spring Coding Marathon",
  "Summer Algorithm Contest",
  "Autumn Programming Battle",
  "Winter Code Sprint",
  "New Year Coding Extravaganza",
  "International Code Olympiad",
  "Tech Giants Coding Challenge",
  "Startup Hackathon Contest",
  "University Programming Competition",
  "Open Source Code Fest",
  "Mobile Development Contest",
  "Web Development Challenge",
  "Data Science Competition",
  "AI/ML Programming Contest",
  "Cybersecurity Coding Challenge",
  "Game Development Contest",
  "Blockchain Development Challenge",
  "DevOps Engineering Contest",
  "Full Stack Development Challenge",
];

const contestDescriptions = [
  "Test your coding skills in this challenging contest featuring problems from beginner to advanced levels.",
  "Join thousands of developers in this exciting programming competition.",
  "Solve algorithmic problems and showcase your problem-solving abilities.",
  "Compete against top programmers from around the world.",
  "A comprehensive contest covering multiple domains of computer science.",
  "Challenge yourself with problems designed by industry experts.",
  "Perfect opportunity to improve your coding skills and compete with peers.",
  "Features problems from various domains including data structures, algorithms, and system design.",
  "Real-world problems that test both your coding and problem-solving skills.",
  "A competitive programming contest with prizes for top performers.",
];

// --- MCQ pool (reused across contests) ---
const mcqQuestions = [
  { questionText: "What is the time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correctOptionIndex: 1, points: 10 },
  { questionText: "Which data structure follows LIFO principle?", options: ["Queue", "Stack", "Array", "Linked List"], correctOptionIndex: 1, points: 5 },
  { questionText: "What is the worst-case time complexity of quicksort?", options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], correctOptionIndex: 2, points: 10 },
  { questionText: "Which sorting algorithm has best average time complexity?", options: ["Bubble Sort", "Insertion Sort", "Merge Sort", "Selection Sort"], correctOptionIndex: 2, points: 10 },
  { questionText: "What does BST stand for?", options: ["Binary Search Tree", "Binary Sort Tree", "Balanced Search Tree", "Best Search Tree"], correctOptionIndex: 0, points: 5 },
  { questionText: "What is the space complexity of merge sort?", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], correctOptionIndex: 2, points: 10 },
  { questionText: "Which algorithm is used for finding shortest path in a graph?", options: ["BFS", "DFS", "Dijkstra's Algorithm", "All of the above"], correctOptionIndex: 3, points: 10 },
  { questionText: "What is the time complexity of accessing an element in an array by index?", options: ["O(n)", "O(log n)", "O(1)", "O(n log n)"], correctOptionIndex: 2, points: 5 },
  { questionText: "Which data structure is used for implementing recursion?", options: ["Queue", "Stack", "Heap", "Tree"], correctOptionIndex: 1, points: 5 },
  { questionText: "What is the time complexity of inserting an element at the beginning of a linked list?", options: ["O(n)", "O(log n)", "O(1)", "O(n²)"], correctOptionIndex: 2, points: 10 },
];

/** Normalize seed signature to BoilerplateSignature format (parameters, className, useClassWrapper) */
function toSignature(sig: {
  functionName: string;
  params: Array<{ name: string; type: string }>;
  returnType: string;
  className?: string;
  useClassWrapper?: boolean;
}) {
  return {
    functionName: sig.functionName,
    returnType: sig.returnType,
    parameters: sig.params,
    className: sig.className ?? "Solution",
    useClassWrapper: sig.useClassWrapper ?? true,
  };
}

// --- DSA pool (reused across contests) ---
export const dsaProblems = [
  {
    title: "Two Sum",
    description: "Return indices of two numbers such that they add up to the target.",
    tags: ["Array", "Hash Table"],
    difficulty: "easy",
    points: 100,
    timeLimit: 2000,
    memoryLimit: 256,
    signature: toSignature({
      functionName: "twoSum",
      params: [
        { name: "nums", type: "int[]" },
        { name: "target", type: "int" }
      ],
      returnType: "int[]"
    }),
    testCases: [
      { input: "[[2,7,11,15],9]", expectedOutput: "[0,1]", isHidden: false },
      { input: "[[3,3],6]", expectedOutput: "[0,1]", isHidden: true }
    ]
  },

  {
    title: "Maximum Subarray",
    description: "Find the contiguous subarray with the maximum sum.",
    tags: ["Array", "DP"],
    difficulty: "easy",
    points: 120,
    timeLimit: 2000,
    memoryLimit: 256,
    signature: toSignature({
      functionName: "maxSubArray",
      params: [{ name: "nums", type: "int[]" }],
      returnType: "int"
    }),
    testCases: [
      { input: "[[-2,1,-3,4,-1,2,1,-5,4]]", expectedOutput: "6", isHidden: false }
    ]
  },

  {
    title: "Rotate Array",
    description: "Rotate array to the right by k steps.",
    tags: ["Array"],
    difficulty: "easy",
    points: 100,
    timeLimit: 2000,
    memoryLimit: 256,
    signature: toSignature({
      functionName: "rotate",
      params: [
        { name: "nums", type: "int[]" },
        { name: "k", type: "int" }
      ],
      returnType: "void"
    }),
    testCases: [
      { input: "[[1,2,3,4,5,6,7],3]", expectedOutput: "[5,6,7,1,2,3,4]", isHidden: false }
    ]
  },

  {
    title: "Valid Parentheses",
    description: "Check if parentheses are valid.",
    tags: ["Stack", "String"],
    difficulty: "easy",
    points: 90,
    timeLimit: 2000,
    memoryLimit: 256,
    signature: toSignature({
      functionName: "isValid",
      params: [{ name: "s", type: "string" }],
      returnType: "boolean"
    }),
    testCases: [
      { input: "[\"()[]{}\"]", expectedOutput: "true", isHidden: false },
      { input: "[\"(]\"]", expectedOutput: "false", isHidden: true }
    ]
  },

  {
    title: "Longest Substring Without Repeating Characters",
    description: "Return length of longest substring without repeating characters.",
    tags: ["String", "Sliding Window"],
    difficulty: "medium",
    points: 180,
    timeLimit: 3000,
    memoryLimit: 256,
    signature: toSignature({
      functionName: "lengthOfLongestSubstring",
      params: [{ name: "s", type: "string" }],
      returnType: "int"
    }),
    testCases: [
      { input: "[\"abcabcbb\"]", expectedOutput: "3", isHidden: false }
    ]
  },

  {
    title: "Reverse Linked List",
    description: "Reverse a singly linked list.",
    tags: ["Linked List"],
    difficulty: "easy",
    points: 120,
    timeLimit: 2000,
    memoryLimit: 256,
    signature: toSignature({
      functionName: "reverseList",
      params: [{ name: "head", type: "ListNode" }],
      returnType: "ListNode"
    }),
    testCases: [
      { input: "[[1,2,3,4,5]]", expectedOutput: "[5,4,3,2,1]", isHidden: false }
    ]
  },

  {
    title: "Detect Cycle in Linked List",
    description: "Detect if a linked list has a cycle.",
    tags: ["Linked List", "Two Pointers"],
    difficulty: "medium",
    points: 180,
    timeLimit: 2000,
    memoryLimit: 256,
    signature: toSignature({
      functionName: "hasCycle",
      params: [{ name: "head", type: "ListNode" }],
      returnType: "boolean"
    }),
    testCases: [
      { input: "[[3,2,0,-4],1]", expectedOutput: "true", isHidden: false }
    ]
  },

  {
    title: "Binary Tree Level Order Traversal",
    description: "Return level order traversal of a binary tree.",
    tags: ["Tree", "BFS"],
    difficulty: "medium",
    points: 180,
    timeLimit: 2000,
    memoryLimit: 256,
    signature: toSignature({
      functionName: "levelOrder",
      params: [{ name: "root", type: "TreeNode" }],
      returnType: "int[][]"
    }),
    testCases: [
      { input: "[[3,9,20,null,null,15,7]]", expectedOutput: "[[3],[9,20],[15,7]]", isHidden: false }
    ]
  },

  {
    title: "Lowest Common Ancestor of BST",
    description: "Find LCA of two nodes in BST.",
    tags: ["Tree", "BST"],
    difficulty: "medium",
    points: 160,
    timeLimit: 2000,
    memoryLimit: 256,
    signature: toSignature({
      functionName: "lowestCommonAncestor",
      params: [
        { name: "root", type: "TreeNode" },
        { name: "p", type: "TreeNode" },
        { name: "q", type: "TreeNode" }
      ],
      returnType: "TreeNode"
    }),
    testCases: [
      { input: "[[6,2,8,0,4,7,9],2,8]", expectedOutput: "6", isHidden: false }
    ]
  },

  {
    title: "Number of Islands",
    description: "Count number of islands in a grid.",
    tags: ["DFS", "Graph"],
    difficulty: "medium",
    points: 200,
    timeLimit: 3000,
    memoryLimit: 256,
    signature: toSignature({
      functionName: "numIslands",
      params: [{ name: "grid", type: "int[][]" }], // char[][] not supported; use int[][] for 0/1 grid
      returnType: "int"
    }),
    testCases: [
      { input: "[[[1,1,0],[0,1,0],[1,0,1]]]", expectedOutput: "3", isHidden: false }
    ]
  },

  {
    title: "Climbing Stairs",
    description: "Return number of distinct ways to climb stairs.",
    tags: ["DP"],
    difficulty: "easy",
    points: 100,
    timeLimit: 2000,
    memoryLimit: 256,
    signature: toSignature({
      functionName: "climbStairs",
      params: [{ name: "n", type: "int" }],
      returnType: "int"
    }),
    testCases: [
      { input: "[5]", expectedOutput: "8", isHidden: false }
    ]
  },

  {
    title: "Coin Change",
    description: "Find minimum coins needed for amount.",
    tags: ["DP"],
    difficulty: "medium",
    points: 180,
    timeLimit: 3000,
    memoryLimit: 256,
    signature: toSignature({
      functionName: "coinChange",
      params: [
        { name: "coins", type: "int[]" },
        { name: "amount", type: "int" }
      ],
      returnType: "int"
    }),
    testCases: [
      { input: "[[1,2,5],11]", expectedOutput: "3", isHidden: false }
    ]
  },

  {
    title: "Longest Increasing Subsequence",
    description: "Return length of LIS.",
    tags: ["DP", "Binary Search"],
    difficulty: "medium",
    points: 200,
    timeLimit: 3000,
    memoryLimit: 256,
    signature: toSignature({
      functionName: "lengthOfLIS",
      params: [{ name: "nums", type: "int[]" }],
      returnType: "int"
    }),
    testCases: [
      { input: "[[10,9,2,5,3,7,101,18]]", expectedOutput: "4", isHidden: false }
    ]
  },

  {
    title: "Edit Distance",
    description: "Return minimum operations to convert word1 to word2.",
    tags: ["DP", "String"],
    difficulty: "hard",
    points: 320,
    timeLimit: 4000,
    memoryLimit: 512,
    signature: toSignature({
      functionName: "minDistance",
      params: [
        { name: "word1", type: "string" },
        { name: "word2", type: "string" }
      ],
      returnType: "int"
    }),
    testCases: [
      { input: "[\"horse\",\"ros\"]", expectedOutput: "3", isHidden: false }
    ]
  },

  {
    title: "LRU Cache",
    description: "Design LRU Cache.",
    tags: ["Design", "Hash Table"],
    difficulty: "hard",
    points: 350,
    timeLimit: 4000,
    memoryLimit: 512,
    signature: toSignature({
      functionName: "LRUCache",
      params: [{ name: "capacity", type: "int" }],
      returnType: "object",
      className: "LRUCache",
      useClassWrapper: true,
    }),
    testCases: [
      { input: "[2]", expectedOutput: "1", isHidden: false }
    ]
  }
];

const statuses: Array<"draft" | "published" | "cancelled"> = ["draft", "published", "cancelled"];
const types: Array<"competitive" | "practice"> = ["competitive", "practice"];

/** Build start/end and maxDurationMs for a contest from type and status. Aligns with contest.schema and Prisma. */
function contestSchedule(
  type: "competitive" | "practice",
  status: "draft" | "published" | "cancelled",
  index: number
): { startTime: Date | null; endTime: Date | null; maxDurationMs: number | null } {
  const now = new Date();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (type === "practice") {
    // Practice: startTime/endTime = null; maxDurationMs required (>= 1 min)
    return {
      startTime: null,
      endTime: null,
      maxDurationMs: index % 2 === 0 ? 3600000 : 7200000, // 1h or 2h
    };
  }

  // Competitive: maxDurationMs = null; startTime and endTime required
  switch (status) {
    case "draft":
      return { startTime: new Date(now.getTime() + 7 * day), endTime: new Date(now.getTime() + 10 * day), maxDurationMs: null };
    case "published":
      return { startTime: new Date(now.getTime() + 1 * day + index * hour), endTime: new Date(now.getTime() + 4 * day + index * hour), maxDurationMs: null };
    case "cancelled":
      return { startTime: new Date(now.getTime() - 10 * day), endTime: new Date(now.getTime() - 7 * day), maxDurationMs: null };
    default:
      return { startTime: null, endTime: null, maxDurationMs: null };
  }
}

async function main() {
  console.log("🌱 Starting seed script...");

  // --- 1. Creator user ---
  let creator = await prisma.user.findFirst({ where: { role: "creator" } });
  if (!creator) {
    const hashedPassword = await bcrypt.hash("password123", 10);
    creator = await prisma.user.create({
      data: {
        name: "Seed Creator",
        email: "creator@example.com",
        password: hashedPassword,
        role: "creator",
        isVerified: true,
      },
    });
    console.log("✅ Created creator: creator@example.com");
  } else {
    console.log("✅ Using existing creator: " + creator.email);
  }
  const creatorId = creator.id;

  // --- 2. Contestee user (for attempts/leaderboard flows) ---
  let contestee = await prisma.user.findFirst({ where: { role: "contestee" } });
  if (!contestee) {
    const hashed = await bcrypt.hash("password123", 10);
    contestee = await prisma.user.create({
      data: {
        name: "Seed Contestee",
        email: "contestee@example.com",
        password: hashed,
        role: "contestee",
        isVerified: true,
      },
    });
    console.log("✅ Created contestee: contestee@example.com");
  } else {
    console.log("✅ Using existing contestee: " + contestee.email);
  }

  // --- 3. Contests (practice/competitive rules + dates aligned with status) ---
  const contestCount = 24;
  console.log(`Creating ${contestCount} contests...`);

  for (let i = 0; i < contestCount; i++) {
    const status = statuses[i % statuses.length];
    const type = types[i % 2];
    const { startTime, endTime, maxDurationMs } = contestSchedule(type, status, i);

    const title = contestTitles[i % contestTitles.length] + (i >= contestTitles.length ? ` #${Math.floor(i / contestTitles.length) + 1}` : "");
    const description = contestDescriptions[i % contestDescriptions.length];

    const contest = await prisma.contest.create({
      data: {
        title,
        description,
        status,
        type,
        creatorId,
        startTime,
        endTime,
        maxDurationMs,
      },
    });

    // Drafts: first 2 have no questions (tests empty / “questions not revealed” flows)
    const isDraftWithNoQuestions = status === "draft" && (i === 0 || i === 5);
    const numMcqs = isDraftWithNoQuestions ? 0 : Math.floor(Math.random() * 3) + 2;
    const numDsas = isDraftWithNoQuestions ? 0 : Math.floor(Math.random() * 3) + 2;

    let order = 0;

    for (let j = 0; j < numMcqs; j++) {
      const t = mcqQuestions[j % mcqQuestions.length];
      const mcq = await prisma.mcqQuestion.create({
        data: {
          questionText: `${t.questionText} (C${contest.id})`,
          options: t.options,
          correctOptionIndex: t.correctOptionIndex,
          points: t.points,
          creatorId,
        },
      });
      order += 1;
      await prisma.contestQuestion.create({
        data: { contestId: contest.id, order, mcqId: mcq.id },
      });
    }

    for (let j = 0; j < numDsas; j++) {
      const t = dsaProblems[j % dsaProblems.length];
      const dsa = await prisma.dsaProblem.create({
        data: {
          title: `${t.title} – C${contest.id}`,
          description: t.description,
          tags: t.tags,
          points: t.points,
          timeLimit: t.timeLimit,
          memoryLimit: t.memoryLimit,
          difficulty: t.difficulty as Difficulty,
          signature: t.signature as object,
          creatorId,
        },
      });
      for (const tc of t.testCases) {
        await prisma.testCase.create({
          data: { problemId: dsa.id, input: tc.input, expectedOutput: tc.expectedOutput, isHidden: tc.isHidden },
        });
      }
      order += 1;
      await prisma.contestQuestion.create({
        data: { contestId: contest.id, order, dsaId: dsa.id },
      });
    }

    if ((i + 1) % 8 === 0) console.log(`  Created ${i + 1}/${contestCount} contests`);
  }

  console.log("🎉 Seed completed.");
  console.log("  • Practice: startTime/endTime=null, maxDurationMs set (1h or 2h)");
  console.log("  • Competitive: maxDurationMs=null, start/end set; dates aligned with status (draft/scheduled/running/ended/cancelled)");
  console.log("  • 2 draft contests have 0 questions; others have 2–4 MCQs and 2–4 DSAs");
  console.log("  • Logins: creator@example.com / contestee@example.com — password: password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
