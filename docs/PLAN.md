# Global Chat UI Formatting & Thinking Dropdown

The Global AI Chat (`/dashboard/chat`) currently renders AI responses as plain text. We will implement the `react-markdown` formatting and the `<think>` block expandable dropdown that is already present in the `AiChatPanel` component.

## User Review Required
Please review this plan. Once approved, I will orchestrate the implementation using the `frontend-specialist`.

## Proposed Changes

### Frontend Components
#### `src/app/dashboard/chat/page.tsx`
- Add imports for `ReactMarkdown`, `remarkGfm`, `Brain`, and `ChevronRight`.
- Port the `renderMessageContent(textContent: string)` function from `ai-chat-panel.tsx`.
  - This function parses `<think>` and `</think>` tags.
  - Returns an expandable `<details>` element for the thought process.
  - Returns a `<ReactMarkdown>` component for the main content.
- Update the message rendering loop to use `renderMessageContent(msg.content)` for assistant messages.
- Add styling classes to ensure the markdown renders identically to the job result chat panel (`prose prose-sm dark:prose-invert max-w-none`).
