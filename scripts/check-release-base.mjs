// Refuses an upload that would roll back what production already serves.
// Several sessions deploy from different branches and copies; on 2026-10-15 production
// ran a branch that main did not contain, so a deploy from main would have dropped it.
import { execFileSync } from "node:child_process";

const override = process.env.RELEASE_BASE_UNVERIFIED_OK === "1";
const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();
const fail = (lines) => {
  console.error(["deployを中止しました:", ...lines].join("\n"));
  if (override) return console.error("RELEASE_BASE_UNVERIFIED_OK=1 のため続行します");
  console.error("確認したうえで続行する場合のみ RELEASE_BASE_UNVERIFIED_OK=1 を付けて再実行してください");
  process.exit(1);
};

// The upload is tagged with HEAD, so the tree must be exactly HEAD.
const dirty = run("git", ["status", "--porcelain", "--untracked-files=all"])
  .split("\n")
  .filter((line) => line && !/^\?\? (output|tmp|docs)\//.test(line));
if (dirty.length)
  fail([
    "コミットされていない変更があります。タグ(HEAD)と配信内容が食い違うため、コミットしてから配信してください",
    ...dirty.slice(0, 10).map((line) => `  ${line}`),
  ]);

const deployment = JSON.parse(run("npx", ["wrangler", "deployments", "status", "--json"]));
for (const { version_id: versionId, percentage } of deployment.versions ?? []) {
  if (!percentage) continue;
  const version = JSON.parse(run("npx", ["wrangler", "versions", "view", versionId, "--json"]));
  const tag = version.annotations?.["workers/tag"] ?? "";
  let commit = "";
  try {
    if (/^[0-9a-f]{7,40}$/.test(tag)) commit = run("git", ["rev-parse", "--verify", `${tag}^{commit}`]);
  } catch {
    /* handled below */
  }
  if (!commit) {
    fail([`本番の版 ${versionId}(${percentage}%) のtag "${tag}" に対応するコミットが手元にありません`]);
    continue;
  }
  // "+" lines are production commits with no equivalent patch in HEAD (cherry-picks count as present).
  const missing = run("git", ["cherry", "-v", "HEAD", commit])
    .split("\n")
    .filter((line) => line.startsWith("+"));
  if (missing.length)
    fail([
      `本番の版 ${versionId}(${percentage}%, tag ${tag}) に入っていて、このHEADに無いコミットがあります。`,
      "このまま配信すると本番から消えます。先にHEADへ取り込んでください(例: git merge <そのブランチ>)",
      ...missing.map((line) => `  ${line}`),
    ]);
  else console.log(`本番の版 ${versionId}(${percentage}%, tag ${tag}) の内容はHEADに含まれています`);
}
