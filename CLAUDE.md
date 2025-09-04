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

## Commit Template Rules

- all commit messages should use this following rules:

- **Title**: Concise imperative sentence describing the change
- **Description**: Bullet points using "-" without emojis or Claude collaboration lines
  - Focus on what was changed, added, or removed
  - Keep each bullet point brief and specific
  - Use present tense for actions
