export const problems = [
  {
    id: "sum-two-numbers",
    title: "Sum of Two Numbers",
    difficulty: "easy",
    prompt:
      "Given two integers A and B on a single line separated by space, output their sum.",
    topics: ["input-output", "arithmetic", "implementation"],
    input: "Two integers A and B (-10^9 <= A,B <= 10^9).",
    output: "A single integer - the sum A+B.",
    example: "Input: 3 5\nOutput: 8",
    starter: {
      javascript: "// Read input and print output\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\n",
      python: "# Read input and print output\n",
      java: "import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n  }\n}\n"
    },
    tests: [
      { input: "3 5", expected: "8", visible: true },
      { input: "10 20", expected: "30", visible: true },
      { input: "-4 9", expected: "5", visible: false },
      { input: "1000000000 1000000000", expected: "2000000000", visible: false }
    ]
  },
  {
    id: "reverse-string",
    title: "Reverse a String",
    difficulty: "easy",
    prompt: "Read a string from input and print it reversed.",
    topics: ["strings", "input-output", "implementation"],
    input: "A single line containing a string.",
    output: "The reversed string.",
    example: "Input: coder\nOutput: redoc",
    starter: {
      javascript: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trimEnd();\n",
      python: "s = input()\n",
      java: "import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n  }\n}\n"
    },
    tests: [
      { input: "coder", expected: "redoc", visible: true },
      { input: "hello", expected: "olleh", visible: true },
      { input: "racecar", expected: "racecar", visible: false }
    ]
  },
  {
    id: "fizzbuzz",
    title: "FizzBuzz",
    difficulty: "easy",
    prompt:
      "Read an integer N. For each i from 1 to N, print FizzBuzz if i is divisible by both 3 and 5, Fizz if divisible by 3, Buzz if divisible by 5, otherwise print i.",
    topics: ["conditionals", "loops", "modulo"],
    input: "One integer N.",
    output: "N lines following the FizzBuzz rules.",
    example: "Input: 5\nOutput:\n1\n2\nFizz\n4\nBuzz",
    starter: {
      javascript: "const fs = require('fs');\nconst n = Number(fs.readFileSync(0, 'utf8').trim());\n",
      python: "n = int(input())\n",
      java: "import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n  }\n}\n"
    },
    tests: [
      { input: "5", expected: "1\n2\nFizz\n4\nBuzz", visible: true },
      { input: "15", expected: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", visible: false }
    ]
  },
  {
    id: "maximum-array",
    title: "Maximum in Array",
    difficulty: "medium",
    prompt:
      "First line contains N. Second line contains N space-separated integers. Print the maximum value.",
    topics: ["arrays", "loops", "edge-cases"],
    input: "N followed by N integers.",
    output: "The maximum integer.",
    example: "Input:\n5\n1 9 3 2 7\nOutput: 9",
    starter: {
      javascript: "const fs = require('fs');\nconst data = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\n",
      python: "n = int(input())\narr = list(map(int, input().split()))\n",
      java: "import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n  }\n}\n"
    },
    tests: [
      { input: "5\n1 9 3 2 7", expected: "9", visible: true },
      { input: "4\n-10 -5 -20 -1", expected: "-1", visible: false }
    ]
  }
];
