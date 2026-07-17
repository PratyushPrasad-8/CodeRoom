import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";

const runners = {
  javascript: {
    file: "main.js",
    command: "node",
    args: (file) => [file]
  },
  python: {
    file: "main.py",
    command: process.platform === "win32" ? "python" : "python3",
    args: (file) => [file]
  },
  java: {
    file: "Main.java",
    command: process.platform === "win32" ? "powershell" : "sh",
    args: (file, dir) =>
      process.platform === "win32"
        ? ["-NoProfile", "-Command", `javac "${file}"; if ($LASTEXITCODE -eq 0) { java -cp "${dir}" Main }`]
        : ["-lc", `javac "${file}" && java -cp "${dir}" Main`]
  }
};

function normalize(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function runProgram({ language, code, input }) {
  const runner = runners[language];
  if (!runner) {
    return Promise.resolve({
      stdout: "",
      stderr: `Unsupported language: ${language}`,
      timedOut: false
    });
  }

  const dir = mkdtempSync(join(tmpdir(), "coder-room-"));
  const file = join(dir, runner.file);
  writeFileSync(file, code);

  return new Promise((resolve) => {
    const child = execFile(
      runner.command,
      runner.args(file, dir),
      { timeout: 3000, maxBuffer: 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        rmSync(dir, { recursive: true, force: true });
        resolve({
          stdout,
          stderr: stderr || error?.message || "",
          timedOut: error?.killed || error?.signal === "SIGTERM"
        });
      }
    );
    child.stdin?.end(input);
  });
}

export async function judge(problem, language, code, visibleOnly = false) {
  const selectedTests = visibleOnly
    ? problem.tests.filter((test) => test.visible)
    : problem.tests;
  const tests = [];

  for (const test of selectedTests) {
    const started = Date.now();
    const output = await runProgram({ language, code, input: test.input });
    const actual = normalize(output.stdout);
    const expected = normalize(test.expected);
    tests.push({
      input: test.input,
      expected: test.expected,
      actual,
      passed: actual === expected && !output.stderr && !output.timedOut,
      stderr: output.stderr,
      timedOut: output.timedOut,
      durationMs: Date.now() - started,
      visible: test.visible
    });
  }

  return {
    tests,
    passed: tests.filter((test) => test.passed).length,
    total: tests.length
  };
}
