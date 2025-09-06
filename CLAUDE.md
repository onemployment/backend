# Project Context

## High Level Context

This is a Node.js API project created for a coding assignment interview process. The project demonstrates a basic Express.js server setup with TypeScript integration, serving as a foundation for building more complex API functionality with Redis integration as required by the assignment.

## Technologies Used

- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework for Node.js
- **TypeScript** - Typed superset of JavaScript for enhanced development experience
- **ts-node** - TypeScript execution environment for Node.js development
- **npm** - Package manager for dependency management

## Validation Steps

After any change in the code logic, the validation steps are these sequence:

1. lint
2. build
3. unit tests
4. integration tests
5. formatter

Each step comes after passing of the previous step.

## Commit Message Rules

### Format

```
<imperative title>

- <concise bullet point describing important change and brief why>
- <concise bullet point describing important change and brief why>
- <concise bullet point describing important change and brief why>
```

### Guidelines

- Commit title should be imperative and concise (50 characters or less)
- Use bullet points in description to list important changes
- Explain what changed and briefly why
- No emojis, Claude collaboration lines, or extra text
- Keep bullet points concise and focused

### Example

```
Add user authentication flow

- Implement login/logout functionality to secure user access
- Add JWT token management for session handling
- Create protected route wrapper for authenticated pages
- Add form validation to prevent invalid submissions
```

## Commit Workflow

When preparing to commit changes, follow this standardized workflow:

1. **Review commit template**: Reference the commit message rules above
2. **Analyze local changes**: Compare current branch changes with the remote branch to understand what has been modified
3. **Prepare commit message**: Create a commit message following the Commit Template Rules with:
   - Concise imperative title summarizing the change
   - Bullet points detailing specific modifications made
4. **Execute commit and push**: Stage all changes, commit with the exact prepared message, and push to the current branch's remote

## Issue Template

### What

Describe what needs to be done or what problem needs to be solved.

### Why

Explain the business value, user need, or technical necessity behind this issue.

### How

Outline the general approach or solution strategy for addressing this issue.

### Implementation Plan

- [ ] Specific task 1
- [ ] Specific task 2
- [ ] Specific task 3
- [ ] Testing and validation
- [ ] Documentation updates

### AI Agent Prompt

**[Context]**
Provide relevant background information about the codebase, current state, and any related systems or dependencies.

**[Task]**
Clearly define the specific work that needs to be completed.

**[Expectation]**
Describe the expected outcomes, deliverables, and success criteria.

**[Constraints]**
List any limitations, requirements, or restrictions that must be considered.

**[Validation]**
Define how the completed work should be tested and verified as successful.
