# Firestore rules scope

The application currently reads and writes `users`, `resources`, and user-owned
`notes`, `quizzes`, and `screenshots`. Admin also lists `users` and `resources`.
Public resource queries require `published == true`; some additionally filter by
`type` or `course` and order by `createdAt`.

This CMS increment adds `games`, `categories`, and append-only `auditLogs`.
Public game reads must constrain `status == "published"`, `visibility == "public"`,
and `deleted == false`. All CMS writes and audit reads are admin-only. `auditLogs`
are create-only and record the authenticated actor UID, action, target, and a
small before/after map.
