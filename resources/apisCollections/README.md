# resources/apisCollections/

The harness looks here first for a team's Postman collection before it writes an API call. Toolshop
has no such collection, so the folder holds only this note.

Endpoints come from the application's own API documentation: Swagger at `/api/documentation` on each
API host (for example <http://localhost:8091/api/documentation> on the local stack). They live as
`readonly <operation>_serviceName` fields on the `Apis<Domain>` classes in `src/apis/`, sent through
`ApiActions` (`src/utils/ApiActions.ts`). Where the two builds differ, the class picks the form with
`byBuild()` ([app versions, B](../../docs/app-versions.md#b-real-changes-between-the-builds)).

If a team collection is added later, put it here and list it in a table below; the `service-classes`
skill describes how it is imported and derived from.
