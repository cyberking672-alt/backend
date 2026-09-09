# Project Debugging Rules

You are responsible for debugging and fixing this entire codebase.

IMPORTANT:
Never stop after identifying an error.
When an error is found, trace it to the root cause and fix it.

For every bug:

1. Inspect the relevant frontend code.
2. Inspect the API/backend route.
3. Inspect Firebase/Firestore integration.
4. Inspect authentication and user data flow.
5. Inspect request payload and response.
6. Run the application.
7. Reproduce the problem.
8. Read terminal/server logs.
9. Fix the root cause.
10. Run tests/build/type-check/lint where available.
11. Reproduce the original action again.
12. Confirm that the error is actually gone.

Never:
- hide errors
- suppress console errors
- return fake success responses
- disable validation just to make a request pass
- hardcode IDs to bypass bugs
- replace Firebase persistence with localStorage
- modify unrelated features

For HTTP errors:
- 400: inspect request payload and server validation.
- 401/403: inspect authentication/authorization.
- 404: inspect route, document path, collection and IDs.
- 409: inspect conflicts/duplicates/state.
- 500: inspect server logs and the underlying exception.

For Firebase/Firestore errors:
- verify Firebase configuration
- verify project/database
- verify collection/document paths
- verify authenticated UID
- verify Firestore rules
- verify field names and types
- verify that the document actually exists

For every fix, report:
- root cause
- files changed
- what was fixed
- tests performed
- final result

Do not claim a bug is fixed unless it has been tested.
