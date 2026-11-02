# The Split Import

## Product context

The supplier directory imports small spreadsheets correctly, but some larger exports are rejected even though they open normally in a spreadsheet app. Retrying the same file does not help. The team needs every contact and its notes preserved, not skipped.

## How to reproduce

1. Open **Supplier directory** in Live Preview.
2. Save the following example as a UTF-8 file named `contacts.csv`. The line break inside the quoted notes belongs to the same contact:

```csv
email,name,company,notes
maya@example.com,Maya,Atlas,"Dock 3
Ask for Sam after 10"
leo@example.com,Leo,Beacon,First floor
```

3. Choose it with **Spreadsheet export**, then click **Import contacts**.
4. Observe the rejection. A successful import should show two contacts and preserve Maya's complete two-line note.
5. After fixing the behavior, import an updated note for the same email; it should update the existing contact rather than duplicate it.

## Expected behavior

- `POST /api/imports` accepts one multipart `file` with a `.csv` filename and a maximum size of 1 MiB.
- The exact columns are `email,name,company,notes`, in that order. Accept 1–2000 contacts, including quoted commas, escaped quotes, optional UTF-8 BOM, and quoted multiline notes.
- Email, name, and company are required. Emails are normalized to lowercase; names/companies are trimmed. Notes retain their text and embedded line breaks.
- Success returns `201` with an import-batch record: `_id: string`, `filename: string`, `rows: integer`, `created: integer`, `updated: integer`, and timestamps.
- Existing emails are updated, not inserted again.
- `GET /api/contacts` returns `200 { contacts: [...] }`, ordered by name. Each contact includes `email`, `name`, `company`, and `notes` strings plus record metadata.
- `GET /api/imports` returns `200 { batches: [...] }`, newest first, up to ten batches.
- Empty/missing files, invalid uploads/rows/headers, or duplicate emails within one file return `422 { error: string, requestId: string }`. Invalid files must not partially write contacts or create a batch.
- This practice app has no separate login or ownership model; BrokenRepo controls sandbox access.

## Constraints

Preserve the existing upload form, routes, size/record limits, normalization, and update behavior. Do not skip malformed records silently, discard note text, or accept only a simplified CSV subset. Do not add dependencies or change the database model.

## Success criteria

1. Ordinary records and quoted commas import with correct batch counts and complete HTTP contact read-back.
2. Valid multiline notes, escaped quotes, and line-ending variants preserve every complete record.
3. Reimporting a normalized email updates its fields without creating a duplicate contact.
4. A file containing invalid rows is rejected without partial writes or a batch record.
5. Empty, missing, or disallowed uploads produce useful `422` responses and leave stored contacts/batches unchanged.
