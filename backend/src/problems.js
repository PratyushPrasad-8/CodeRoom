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

const defaultStarter = {
  javascript: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\n",
  python: "# Read from standard input and print the answer\n",
  java: "import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n  }\n}\n"
};

function bankProblem(id, title, difficulty, prompt, topics, input, output, example, tests) {
  return { id, title, difficulty, prompt, topics, input, output, example, starter: defaultStarter, tests };
}

problems.push(
  // Five easy problems
  bankProblem("even-or-odd", "Even or Odd", "easy", "Read one integer and print EVEN if it is divisible by 2, otherwise print ODD.", ["conditionals", "modulo"], "One integer N.", "EVEN or ODD.", "Input: 7\nOutput: ODD", [{ input: "7", expected: "ODD", visible: true }, { input: "-12", expected: "EVEN", visible: false }]),
  bankProblem("digit-sum", "Digit Sum", "easy", "Read an integer and print the sum of its decimal digits. Ignore a leading minus sign.", ["math", "loops"], "One integer N.", "The sum of digits.", "Input: 123\nOutput: 6", [{ input: "123", expected: "6", visible: true }, { input: "-909", expected: "18", visible: false }]),
  bankProblem("factorial", "Factorial", "easy", "Read a non-negative integer N and print N factorial.", ["loops", "math"], "0 <= N <= 20.", "N!", "Input: 5\nOutput: 120", [{ input: "5", expected: "120", visible: true }, { input: "0", expected: "1", visible: false }]),
  bankProblem("count-vowels", "Count Vowels", "easy", "Read one line and print the number of English vowels (a, e, i, o, u), ignoring case.", ["strings", "loops"], "One line of text.", "Vowel count.", "Input: OpenAI\nOutput: 4", [{ input: "OpenAI", expected: "4", visible: true }, { input: "rhythm", expected: "0", visible: false }]),
  bankProblem("greatest-common-divisor", "Greatest Common Divisor", "easy", "Read two positive integers and print their greatest common divisor.", ["math", "euclidean-algorithm"], "Two positive integers A and B.", "Their GCD.", "Input: 12 18\nOutput: 6", [{ input: "12 18", expected: "6", visible: true }, { input: "17 13", expected: "1", visible: false }]),

  // Ten medium problems
  bankProblem("second-largest", "Second Largest Distinct", "medium", "Read N integers and print the second largest distinct value.", ["arrays", "sorting"], "N followed by N integers; at least two distinct values exist.", "Second largest distinct integer.", "Input: 5\n2 8 4 8 3\nOutput: 4", [{ input: "5\n2 8 4 8 3", expected: "4", visible: true }, { input: "4\n-1 -9 -3 -1", expected: "-3", visible: false }]),
  bankProblem("binary-search-index", "Binary Search Index", "medium", "Read N, target X, and a sorted array. Print the zero-based index of X, or -1 if it is absent.", ["arrays", "binary-search"], "N and X, then N sorted integers.", "Index or -1.", "Input: 5 7\n1 3 7 9 10\nOutput: 2", [{ input: "5 7\n1 3 7 9 10", expected: "2", visible: true }, { input: "4 6\n1 2 4 8", expected: "-1", visible: false }]),
  bankProblem("rotate-array-right", "Rotate Array Right", "medium", "Rotate an array right by K positions and print the result separated by spaces.", ["arrays", "modulo"], "N and K, then N integers.", "Rotated array.", "Input: 5 2\n1 2 3 4 5\nOutput: 4 5 1 2 3", [{ input: "5 2\n1 2 3 4 5", expected: "4 5 1 2 3", visible: true }, { input: "3 4\n7 8 9", expected: "9 7 8", visible: false }]),
  bankProblem("valid-anagram", "Valid Anagram", "medium", "Read two lowercase strings and print YES if they are anagrams, otherwise NO.", ["strings", "hashing", "sorting"], "Two lowercase strings on separate lines.", "YES or NO.", "Input: listen\nsilent\nOutput: YES", [{ input: "listen\nsilent", expected: "YES", visible: true }, { input: "apple\napply", expected: "NO", visible: false }]),
  bankProblem("balanced-brackets", "Balanced Brackets", "medium", "Read a string containing (), [], and {}. Print YES if brackets are balanced and properly nested, otherwise NO.", ["stacks", "strings"], "One bracket string.", "YES or NO.", "Input: {[()]}\nOutput: YES", [{ input: "{[()]}", expected: "YES", visible: true }, { input: "([)]", expected: "NO", visible: false }]),
  bankProblem("primary-diagonal-sum", "Primary Diagonal Sum", "medium", "Read an N x N matrix and print the sum of its primary diagonal.", ["matrices", "loops"], "N followed by N matrix rows.", "Diagonal sum.", "Input: 3\n1 2 3\n4 5 6\n7 8 9\nOutput: 15", [{ input: "3\n1 2 3\n4 5 6\n7 8 9", expected: "15", visible: true }, { input: "2\n-1 4\n8 -3", expected: "-4", visible: false }]),
  bankProblem("count-primes", "Count Primes", "medium", "Read N and print how many prime numbers are less than or equal to N.", ["math", "sieve"], "0 <= N <= 100000.", "Number of primes <= N.", "Input: 10\nOutput: 4", [{ input: "10", expected: "4", visible: true }, { input: "1", expected: "0", visible: false }]),
  bankProblem("two-sum-indices", "Two Sum Indices", "medium", "Read N, target X, and N integers. Print the zero-based indices of the first valid pair i j with i < j whose values sum to X.", ["arrays", "hashing"], "N and X, then N integers. Exactly one answer exists.", "Two indices separated by a space.", "Input: 4 9\n2 7 11 15\nOutput: 0 1", [{ input: "4 9\n2 7 11 15", expected: "0 1", visible: true }, { input: "3 6\n3 2 4", expected: "1 2", visible: false }]),
  bankProblem("maximum-subarray", "Maximum Subarray Sum", "medium", "Read N integers and print the largest sum of any non-empty contiguous subarray.", ["arrays", "dynamic-programming"], "N followed by N integers.", "Maximum subarray sum.", "Input: 5\n-2 1 -3 4 -1\nOutput: 4", [{ input: "5\n-2 1 -3 4 -1", expected: "4", visible: true }, { input: "3\n-5 -2 -8", expected: "-2", visible: false }]),
  bankProblem("frequency-mode", "Most Frequent Number", "medium", "Read N integers and print the value with highest frequency. If tied, print the smaller value.", ["arrays", "hashing"], "N followed by N integers.", "The mode.", "Input: 6\n4 1 4 2 2 2\nOutput: 2", [{ input: "6\n4 1 4 2 2 2", expected: "2", visible: true }, { input: "4\n5 5 3 3", expected: "3", visible: false }]),

  // Five hard problems
  bankProblem("longest-increasing-subsequence", "Longest Increasing Subsequence", "hard", "Read N integers and print the length of their longest strictly increasing subsequence.", ["dynamic-programming", "binary-search"], "N followed by N integers.", "LIS length.", "Input: 8\n10 9 2 5 3 7 101 18\nOutput: 4", [{ input: "8\n10 9 2 5 3 7 101 18", expected: "4", visible: true }, { input: "4\n4 3 2 1", expected: "1", visible: false }]),
  bankProblem("minimum-coin-change", "Minimum Coin Change", "hard", "Read N coin denominations and target X. Print the minimum number of coins needed to make X, or -1 if impossible.", ["dynamic-programming", "coin-change"], "N and X, then N positive denominations.", "Minimum coins or -1.", "Input: 3 11\n1 2 5\nOutput: 3", [{ input: "3 11\n1 2 5", expected: "3", visible: true }, { input: "2 3\n2 4", expected: "-1", visible: false }]),
  bankProblem("grid-minimum-path", "Grid Minimum Path", "hard", "Read an N x M grid of non-negative costs. Starting at top-left, reach bottom-right moving only right or down and print the minimum path sum.", ["dynamic-programming", "grids"], "N M followed by N rows of M costs.", "Minimum path sum.", "Input: 3 3\n1 3 1\n1 5 1\n4 2 1\nOutput: 7", [{ input: "3 3\n1 3 1\n1 5 1\n4 2 1", expected: "7", visible: true }, { input: "2 2\n5 1\n2 1", expected: "7", visible: false }]),
  bankProblem("zero-one-knapsack", "0/1 Knapsack", "hard", "Read N, capacity W, then N weights and N values. Print the maximum total value using each item at most once.", ["dynamic-programming", "knapsack"], "N W, weights row, values row.", "Maximum value.", "Input: 3 4\n2 3 1\n4 5 3\nOutput: 7", [{ input: "3 4\n2 3 1\n4 5 3", expected: "7", visible: true }, { input: "2 3\n2 4\n3 10", expected: "3", visible: false }]),
  bankProblem("shortest-path-dijkstra", "Shortest Path in Weighted Graph", "hard", "Read N, M, source S, destination D, followed by M undirected weighted edges u v w. Print the shortest distance from S to D.", ["graphs", "dijkstra", "priority-queue"], "Vertices are 0 to N-1. All weights are non-negative.", "Shortest distance.", "Input: 4 4 0 3\n0 1 1\n1 3 4\n0 2 5\n2 3 1\nOutput: 5", [{ input: "4 4 0 3\n0 1 1\n1 3 4\n0 2 5\n2 3 1", expected: "5", visible: true }, { input: "3 3 0 2\n0 1 2\n1 2 2\n0 2 9", expected: "4", visible: false }])
);
