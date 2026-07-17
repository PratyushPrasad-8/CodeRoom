function normalizeTopic(topic) {
  return topic
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function classifyFailure(test) {
  const stderr = String(test.stderr || "").toLowerCase();
  if (test.timedOut) return "time complexity or infinite loop";
  if (stderr.includes("syntax") || stderr.includes("indentation") || stderr.includes("compilation")) {
    return "syntax error";
  }
  if (stderr.includes("typeerror") || stderr.includes("nameerror") || stderr.includes("referenceerror")) {
    return "runtime error";
  }
  if (stderr) return "runtime error";
  if (String(test.actual || "").trim() !== String(test.expected || "").trim()) {
    return "wrong answer";
  }
  return "unknown failure";
}

function makeEmptyAnalytics(studentName, problems) {
  return {
    studentName,
    score: 0,
    summary: "No submissions yet. Start with an easy problem to unlock personalized weak-zone analytics.",
    totals: {
      submissions: 0,
      accepted: 0,
      failed: 0,
      passedTests: 0,
      totalTests: 0
    },
    weakZones: [
      {
        label: "Getting Started",
        severity: "medium",
        evidence: "No solved attempts found yet.",
        recommendation: "Solve Sum of Two Numbers first, then try Reverse a String to build input/output confidence."
      }
    ],
    recommendedProblems: problems.slice(0, 3).map((problem) => ({
      id: problem.id,
      title: problem.title,
      reason: `${normalizeTopic(problem.topics[0])} practice`
    }))
  };
}

export function analyzeCandidate({ studentName, submissions, problems }) {
  const candidateSubmissions = submissions
    .filter((submission) => submission.studentName === studentName)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (candidateSubmissions.length === 0) {
    return makeEmptyAnalytics(studentName, problems);
  }

  const topicStats = new Map();
  const failureStats = new Map();
  const attemptedProblemIds = new Set();
  let passedTests = 0;
  let totalTests = 0;
  let accepted = 0;

  for (const submission of candidateSubmissions) {
    const problem = problems.find((item) => item.id === submission.problemId);
    const topics = problem?.topics || ["implementation"];
    attemptedProblemIds.add(submission.problemId);
    if (submission.status === "accepted") accepted += 1;
    passedTests += submission.passed || 0;
    totalTests += submission.total || 0;

    for (const topic of topics) {
      const current = topicStats.get(topic) || { attempts: 0, failed: 0 };
      current.attempts += 1;
      if (submission.status !== "accepted") current.failed += 1;
      topicStats.set(topic, current);
    }

    for (const test of submission.result?.tests || []) {
      if (test.passed) continue;
      const label = classifyFailure(test);
      failureStats.set(label, (failureStats.get(label) || 0) + 1);
    }
  }

  const failed = candidateSubmissions.length - accepted;
  const score = totalTests === 0 ? 0 : Math.round((passedTests / totalTests) * 100);
  const weakZones = [];

  for (const [label, count] of [...failureStats.entries()].sort((a, b) => b[1] - a[1])) {
    const recommendationByFailure = {
      "syntax error": "Slow down on language syntax, brackets, indentation, and required class/function structure before submitting.",
      "runtime error": "Practice tracing variables and input parsing with small custom cases before running hidden tests.",
      "wrong answer": "Compare expected output line by line and add edge cases around empty, negative, duplicate, or boundary inputs.",
      "time complexity or infinite loop": "Review loop exits and estimate the number of operations before coding the final solution."
    };
    weakZones.push({
      label: normalizeTopic(label),
      severity: count >= 3 ? "high" : "medium",
      evidence: `${count} failed test${count === 1 ? "" : "s"} matched this pattern.`,
      recommendation: recommendationByFailure[label] || "Review the failing test output and reduce the solution to a smaller reproducible case."
    });
  }

  for (const [topic, stat] of [...topicStats.entries()].sort((a, b) => b[1].failed - a[1].failed)) {
    if (stat.failed === 0) continue;
    weakZones.push({
      label: normalizeTopic(topic),
      severity: stat.failed / stat.attempts >= 0.5 ? "high" : "medium",
      evidence: `${stat.failed}/${stat.attempts} attempt${stat.attempts === 1 ? "" : "s"} struggled on this topic.`,
      recommendation: `Practice two focused ${normalizeTopic(topic).toLowerCase()} problems before moving to harder mixed-topic tasks.`
    });
  }

  if (weakZones.length === 0) {
    weakZones.push({
      label: "Next Difficulty Step",
      severity: "low",
      evidence: "Recent submissions are passing cleanly.",
      recommendation: "Move from easy implementation tasks to medium array, loop, and edge-case problems."
    });
  }

  const recommendedProblems = problems
    .filter((problem) => !attemptedProblemIds.has(problem.id))
    .slice(0, 3)
    .map((problem) => ({
      id: problem.id,
      title: problem.title,
      reason: `${problem.difficulty} - ${problem.topics.map(normalizeTopic).join(", ")}`
    }));

  return {
    studentName,
    score,
    summary:
      score >= 85
        ? "Strong progress. Your accepted rate is high, so the next step is harder mixed-topic practice."
        : score >= 50
          ? "Good base. The analytics found a few repeat patterns to clean up before increasing difficulty."
          : "Focus mode recommended. Start by fixing the highest-severity weak zone and rerun visible tests carefully.",
    totals: {
      submissions: candidateSubmissions.length,
      accepted,
      failed,
      passedTests,
      totalTests
    },
    weakZones: weakZones.slice(0, 4),
    recommendedProblems
  };
}
