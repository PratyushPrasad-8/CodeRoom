import { accessSync, constants, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
    args: (file, dir, commands) =>
      process.platform === "win32"
        ? ["-NoProfile", "-Command", `& "${commands.javac}" "${file}"; if ($LASTEXITCODE -eq 0) { & "${commands.java}" -cp "${dir}" Main }`]
        : ["-lc", `"${commands.javac}" "${file}" && "${commands.java}" -cp "${dir}" Main`]
  }
};

function findExecutable(command) {
  const candidates = [];

  if (process.platform === "win32") {
    const suffix = command.endsWith(".exe") ? "" : ".exe";
    const names = [command, `${command}${suffix}`];
    const javaRoots = [process.env.JAVA_HOME, process.env.JDK_HOME, process.env["ProgramFiles"], process.env["ProgramFiles(x86)"]].filter(Boolean);
    for (const root of javaRoots) {
      for (const name of names) {
        candidates.push(join(root, "bin", name));
      }
    }
  }

  candidates.push(command);

  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

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

  if (language === "java") {
    const javac = findExecutable("javac");
    const java = findExecutable("java");
    if (!javac || !java) {
      return Promise.resolve({
        stdout: "",
        stderr: "Java JDK is not installed or not available on PATH. Install the JDK and restart the app, or set JAVA_HOME to the JDK installation directory.",
        timedOut: false
      });
    }
  }

  const dir = mkdtempSync(join(tmpdir(), "coder-room-"));
  const file = join(dir, runner.file);
  writeFileSync(file, code);

  const commands = language === "java"
    ? { javac: findExecutable("javac"), java: findExecutable("java") }
    : {};

  return new Promise((resolve) => {
    const child = execFile(
      runner.command,
      runner.args(file, dir, commands),
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
