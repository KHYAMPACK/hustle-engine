import type { UIMessage } from "ai";

export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export const WELCOME_MESSAGE_TEXT =
  "Welcome, Founder. Tell me the vague, high-level summary of the idea you want to build.";
