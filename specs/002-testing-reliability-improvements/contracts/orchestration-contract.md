# API Contract: Orchestration Logic

## Endpoint: /orchestrate
- **Method**: POST
- **Request Body**:
  - steps: array of orchestration steps
  - context: object (state, errorContext)
- **Response**:
  - status: success | failure
  - result: orchestration result object
  - error: error details (if failure)

## Rollback
- **Endpoint**: /orchestrate/rollback
- **Method**: POST
- **Request Body**:
  - operations: array of operations to roll back
  - strategy: atomic | partial
- **Response**:
  - status: success | failure
  - log: audit log of rollback actions
  - error: error details (if failure)

## Audit Log
- **Endpoint**: /orchestrate/audit
- **Method**: GET
- **Response**:
  - log: array of audit entries
