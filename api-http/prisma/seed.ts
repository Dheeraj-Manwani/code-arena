import { PrismaClient } from "@prisma/client";
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

const mcqQuestions = [
  {
    questionText: "What is the time complexity of binary search?",
    options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    correctOptionIndex: 1,
    points: 10,
  },
  {
    questionText: "Which data structure follows LIFO principle?",
    options: ["Queue", "Stack", "Array", "Linked List"],
    correctOptionIndex: 1,
    points: 5,
  },
  {
    questionText: "What is the worst-case time complexity of quicksort?",
    options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
    correctOptionIndex: 2,
    points: 10,
  },
  {
    questionText: "Which sorting algorithm has best average time complexity?",
    options: ["Bubble Sort", "Insertion Sort", "Merge Sort", "Selection Sort"],
    correctOptionIndex: 2,
    points: 10,
  },
  {
    questionText: "What does BST stand for?",
    options: ["Binary Search Tree", "Binary Sort Tree", "Balanced Search Tree", "Best Search Tree"],
    correctOptionIndex: 0,
    points: 5,
  },
  {
    questionText: "What is the space complexity of merge sort?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correctOptionIndex: 2,
    points: 10,
  },
  {
    questionText: "Which algorithm is used for finding shortest path in a graph?",
    options: ["BFS", "DFS", "Dijkstra's Algorithm", "All of the above"],
    correctOptionIndex: 3,
    points: 10,
  },
  {
    questionText: "What is the time complexity of accessing an element in an array by index?",
    options: ["O(n)", "O(log n)", "O(1)", "O(n log n)"],
    correctOptionIndex: 2,
    points: 5,
  },
  {
    questionText: "Which data structure is used for implementing recursion?",
    options: ["Queue", "Stack", "Heap", "Tree"],
    correctOptionIndex: 1,
    points: 5,
  },
  {
    questionText: "What is the time complexity of inserting an element at the beginning of a linked list?",
    options: ["O(n)", "O(log n)", "O(1)", "O(n²)"],
    correctOptionIndex: 2,
    points: 10,
  },
];

const dsaProblems = [
  {
    title: "Two Sum",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    tags: ["Array", "Hash Table"],
    points: 100,
    timeLimit: 2000,
    memoryLimit: 256,
    difficulty: "easy" as const,
    testCases: [
      {
        input: "[2,7,11,15]\n9",
        expectedOutput: "[0,1]",
        isHidden: false,
      },
      {
        input: "[3,2,4]\n6",
        expectedOutput: "[1,2]",
        isHidden: false,
      },
    ],
  },
  {
    title: "Reverse Linked List",
    description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
    tags: ["Linked List", "Recursion"],
    points: 150,
    timeLimit: 3000,
    memoryLimit: 256,
    difficulty: "easy" as const,
    testCases: [
      {
        input: "[1,2,3,4,5]",
        expectedOutput: "[5,4,3,2,1]",
        isHidden: false,
      },
    ],
  },
  {
    title: "Merge Two Sorted Lists",
    description: "Merge two sorted linked lists and return it as a sorted list.",
    tags: ["Linked List", "Recursion"],
    points: 150,
    timeLimit: 2000,
    memoryLimit: 256,
    difficulty: "easy" as const,
    testCases: [
      {
        input: "[1,2,4]\n[1,3,4]",
        expectedOutput: "[1,1,2,3,4,4]",
        isHidden: false,
      },
    ],
  },
  {
    title: "Valid Parentheses",
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    tags: ["String", "Stack"],
    points: 100,
    timeLimit: 2000,
    memoryLimit: 256,
    difficulty: "easy" as const,
    testCases: [
      {
        input: "()",
        expectedOutput: "true",
        isHidden: false,
      },
      {
        input: "()[]{}",
        expectedOutput: "true",
        isHidden: false,
      },
      {
        input: "(]",
        expectedOutput: "false",
        isHidden: false,
      },
    ],
  },
  {
    title: "Longest Substring Without Repeating Characters",
    description: "Given a string s, find the length of the longest substring without repeating characters.",
    tags: ["String", "Sliding Window", "Hash Table"],
    points: 200,
    timeLimit: 3000,
    memoryLimit: 256,
    difficulty: "medium" as const,
    testCases: [
      {
        input: "abcabcbb",
        expectedOutput: "3",
        isHidden: false,
      },
      {
        input: "bbbbb",
        expectedOutput: "1",
        isHidden: false,
      },
    ],
  },
  {
    title: "Binary Tree Level Order Traversal",
    description: "Given the root of a binary tree, return the level order traversal of its nodes' values.",
    tags: ["Tree", "BFS"],
    points: 200,
    timeLimit: 2000,
    memoryLimit: 256,
    difficulty: "medium" as const,
    testCases: [
      {
        input: "[3,9,20,null,null,15,7]",
        expectedOutput: "[[3],[9,20],[15,7]]",
        isHidden: false,
      },
    ],
  },
  {
    title: "Maximum Subarray",
    description: "Find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.",
    tags: ["Array", "Dynamic Programming"],
    points: 200,
    timeLimit: 2000,
    memoryLimit: 256,
    difficulty: "medium" as const,
    testCases: [
      {
        input: "[-2,1,-3,4,-1,2,1,-5,4]",
        expectedOutput: "6",
        isHidden: false,
      },
    ],
  },
  {
    title: "Best Time to Buy and Sell Stock",
    description: "You are given an array prices where prices[i] is the price of a given stock on the ith day. Find the maximum profit you can achieve.",
    tags: ["Array", "Dynamic Programming"],
    points: 150,
    timeLimit: 2000,
    memoryLimit: 256,
    difficulty: "easy" as const,
    testCases: [
      {
        input: "[7,1,5,3,6,4]",
        expectedOutput: "5",
        isHidden: false,
      },
    ],
  },
  {
    title: "Climbing Stairs",
    description: "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    tags: ["Math", "Dynamic Programming", "Memoization"],
    points: 150,
    timeLimit: 2000,
    memoryLimit: 256,
    difficulty: "easy" as const,
    testCases: [
      {
        input: "2",
        expectedOutput: "2",
        isHidden: false,
      },
      {
        input: "3",
        expectedOutput: "3",
        isHidden: false,
      },
    ],
  },
  {
    title: "Container With Most Water",
    description: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    tags: ["Array", "Two Pointers", "Greedy"],
    points: 250,
    timeLimit: 3000,
    memoryLimit: 256,
    difficulty: "medium" as const,
    testCases: [
      {
        input: "[1,8,6,2,5,4,8,3,7]",
        expectedOutput: "49",
        isHidden: false,
      },
    ],
  },
];

async function main() {
  console.log("🌱 Starting seed script...");

  // Find or create a user (assuming there's at least one creator user)
  let user = await prisma.user.findFirst({
    where: { role: "creator" },
  });

  if (!user) {
    console.log("Creating a creator user...");
    const hashedPassword = await bcrypt.hash("password123", 10);
    user = await prisma.user.create({
      data: {
        name: "Seed User",
        email: `seed${Date.now()}@example.com`,
        password: hashedPassword,
        role: "creator",
        isVerified: true,
      },
    });
    console.log(`✅ Created user: ${user.email}`);
  } else {
    console.log(`✅ Using existing user: ${user.email}`);
  }

  const creatorId = user.id;

  // Create 100 contests
  console.log("Creating 100 contests with questions...");
  const statuses: Array<"draft" | "scheduled" | "running" | "ended" | "cancelled"> = [
    "draft",
    "scheduled",
    "running",
    "ended",
    "cancelled",
  ];
  const types: Array<"competitive" | "practice"> = ["competitive", "practice"];

  for (let i = 0; i < 100; i++) {
    const title =
      contestTitles[i % contestTitles.length] + ` #${Math.floor(i / contestTitles.length) + 1}`;
    const description = contestDescriptions[i % contestDescriptions.length];
    const status = statuses[i % statuses.length];
    const type = types[i % 2];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + i);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 3);

    const contest = await prisma.contest.create({
      data: {
        title,
        description,
        status,
        type,
        creatorId,
        startTime: type === "competitive" ? startDate : null,
        endTime: type === "competitive" ? endDate : null,
        maxDurationMs: i % 3 === 0 ? 7200000 : null, // 2 hours
      },
    });

    // Create and link MCQ questions (2-4 per contest)
    const numMcqs = Math.floor(Math.random() * 3) + 2; // 2-4 MCQs
    for (let j = 0; j < numMcqs; j++) {
      const mcqTemplate = mcqQuestions[j % mcqQuestions.length];
      const mcq = await prisma.mcqQuestion.create({
        data: {
          questionText: `${mcqTemplate.questionText} (Contest ${i + 1})`,
          options: mcqTemplate.options,
          correctOptionIndex: mcqTemplate.correctOptionIndex,
          points: mcqTemplate.points,
          creatorId,
        },
      });

      await prisma.contestQuestion.create({
        data: {
          contestId: contest.id,
          mcqId: mcq.id,
          order: j + 1,
        },
      });
    }

    // Create and link DSA problems (2-4 per contest)
    const numDsas = Math.floor(Math.random() * 3) + 2; // 2-4 DSAs
    const startOrder = numMcqs + 1;
    for (let j = 0; j < numDsas; j++) {
      const dsaTemplate = dsaProblems[j % dsaProblems.length];
      const dsa = await prisma.dsaProblem.create({
        data: {
          title: `${dsaTemplate.title} - Contest ${i + 1}`,
          description: dsaTemplate.description,
          tags: dsaTemplate.tags,
          points: dsaTemplate.points,
          timeLimit: dsaTemplate.timeLimit,
          memoryLimit: dsaTemplate.memoryLimit,
          difficulty: dsaTemplate.difficulty,
          creatorId,
        },
      });

      // Create test cases
      for (const testCase of dsaTemplate.testCases) {
        await prisma.testCase.create({
          data: {
            problemId: dsa.id,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            isHidden: testCase.isHidden,
          },
        });
      }

      await prisma.contestQuestion.create({
        data: {
          contestId: contest.id,
          dsaId: dsa.id,
          order: startOrder + j,
        },
      });
    }

    if ((i + 1) % 10 === 0) {
      console.log(`✅ Created ${i + 1}/100 contests`);
    }
  }

  console.log("🎉 Seed script completed successfully!");
  console.log(`Created 100 contests with both MCQ and DSA questions`);
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
