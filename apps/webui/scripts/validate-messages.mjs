import { readdir, readFile } from "node:fs/promises";

const messagesDirectory = new URL("../messages/", import.meta.url);
const referenceLocale = "en";
const translatedLocales = ["zh-CN"];

function flattenMessages(value, path = "", flattened = new Map()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected a message object at ${path || "(root)"}`);
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      flattenMessages(child, childPath, flattened);
      continue;
    }

    if (typeof child !== "string") {
      throw new Error(`Expected a string message at ${childPath}`);
    }

    flattened.set(childPath, child);
  }

  return flattened;
}

function extractPlaceholders(message) {
  return [...message.matchAll(/\{([A-Za-z0-9_]+)(?:,|\})/g)]
    .map((match) => match[1])
    .sort();
}

async function readMessageFile(locale, filename) {
  const content = await readFile(
    new URL(`./${locale}/${filename}`, messagesDirectory),
    "utf8",
  );
  return flattenMessages(JSON.parse(content));
}

function compareMessages(filename, locale, reference, translation) {
  const issues = [];

  for (const key of reference.keys()) {
    if (!translation.has(key)) {
      issues.push(`${locale}/${filename} is missing ${key}`);
      continue;
    }

    const referencePlaceholders = extractPlaceholders(reference.get(key));
    const translatedPlaceholders = extractPlaceholders(translation.get(key));
    if (referencePlaceholders.join("\0") !== translatedPlaceholders.join("\0")) {
      issues.push(
        `${locale}/${filename} has different placeholders for ${key}`,
      );
    }
  }

  for (const key of translation.keys()) {
    if (!reference.has(key)) {
      issues.push(`${locale}/${filename} has an extra key ${key}`);
    }
  }

  return issues;
}

const referenceFilenames = (await readdir(new URL(`./${referenceLocale}/`, messagesDirectory)))
  .filter((filename) => filename.endsWith(".json"))
  .sort();
const issues = [];

for (const locale of translatedLocales) {
  const translatedFilenames = (await readdir(new URL(`./${locale}/`, messagesDirectory)))
    .filter((filename) => filename.endsWith(".json"))
    .sort();

  for (const filename of referenceFilenames) {
    if (!translatedFilenames.includes(filename)) {
      issues.push(`${locale} is missing ${filename}`);
    }
  }
  for (const filename of translatedFilenames) {
    if (!referenceFilenames.includes(filename)) {
      issues.push(`${locale} has an extra file ${filename}`);
    }
  }

  for (const filename of referenceFilenames) {
    if (!translatedFilenames.includes(filename)) {
      continue;
    }

    const reference = await readMessageFile(referenceLocale, filename);
    const translation = await readMessageFile(locale, filename);
    issues.push(...compareMessages(filename, locale, reference, translation));
  }
}

if (issues.length > 0) {
  throw new Error(`Message validation failed:\n- ${issues.join("\n- ")}`);
}

console.log(
  `Validated ${referenceFilenames.length} message files across ${1 + translatedLocales.length} locales`,
);
