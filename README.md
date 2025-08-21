# Impulse Focus Groups App – Take Home Submission

## Overview

This React Native app implements a “Focus Groups” feature: browse groups, join/leave, and chat (local state). It is designed with clean structure and modern UI, using [expo-router](https://docs.expo.dev/router/introduction/) for navigation.

## Features

- List of groups (with join/leave)
- Group details & chat (local-only)
- State management with React hooks
- Modern, responsive UX

## Quick Start

```sh
yarn install     # or: npm install
yarn start       # or: npm start

Open in Expo Go app, emulator, or web.
```

## Code Structure

  groups/index.tsx        # Group list screen
  groups/[id].tsx         # Group detail & chat
components/ui/GroupCard.tsx
constants/group.ts
docs/
  rds-scaling-architecture.md  # Part 2: Scaling architecture
  short-answers.md             # Part 3: Short answers

## Design Choices

Expo-router for auto navigation
Modular components (GroupCard)
Local state with useState (easily extendable)
Friendly color palette, subtle UI polish

## Customization & Extensibility

Swap mock group data for API calls
Connect chat/messages to backend
Add avatars, persistent storage, or user auth

## Documentation

- Part 2: See
docs/rds-scaling-architecture.md
 Detailed AWS/Postgres/Prisma scaling proposal, with architecture, tradeoffs, and diagram.

- Part 3: See
docs/short-answers.md
 Concise responses on scaling, CI/CD, and team workflow best practices.
