export function stripPrepublishSentences(description: string) {
  return description
    .split(/(?<=。)/)
    .filter((sentence) => !sentence.includes("掲載時"))
    .join("")
    .trim();
}
