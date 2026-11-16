# resources/Queries/

The harness looks here first for a team's exported SQL knowledge before it writes a database query.
Toolshop has no such library, so the folder holds only this note.

Queries live where they are used: as `readonly <operation>_query` fields on the `Dbs<Domain>` classes in
`src/dbs/`, run through `MySqlActions` (`src/utils/MySqlActions.ts`) with named parameters
(`:email`). The database is the local stack's MariaDB (`databases.appDb`), which only the `local` and
`local-fixed` environments have. Use it only where the API offers no route, as
`DbsUserAccount` does for disabling an account.

If a team library is added later, put its exports here and list them in a table below; the
`service-classes` skill describes how queries are derived from it.
