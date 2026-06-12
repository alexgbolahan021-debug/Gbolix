---
name: Gbolix Orval Hook Naming
description: Generated hook and query-key names follow Orval's conventions and differ from intuitive names; always grep before importing.
---

Orval generates hook names based on the OpenAPI `operationId`, not from our mental model.

**Why:** Writing `useGetAdminProjects` or `useGetAdminInsights` fails — those don't exist. The real names are derived from the operationId in the spec.

**Correct admin hook names (as of current spec):**
- Users list: `useAdminListUsers`, key: `getAdminListUsersQueryKey`
- Projects list: `useAdminListProjects`, key: `getAdminListProjectsQueryKey`
- Update project: `useAdminUpdateProject`
- Start conversation: `useAdminStartConversation`
- Insights: `useGetInsights`, key: `getGetInsightsQueryKey`

**How to apply:** Before writing any import from `@workspace/api-client-react`, grep `lib/api-client-react/src/generated/api.ts` for the actual export names.

```bash
grep "^export (const|function) use" lib/api-client-react/src/generated/api.ts
```
