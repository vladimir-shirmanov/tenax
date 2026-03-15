# API Response Contract Template

Use this template for strict API response contracts in `docs/contracts/api/`.

## File Naming
- `<feature>-<endpoint>-contract.yaml`

## Template
```yaml
contract_version: 1
feature: "<feature-name>"
endpoint:
  method: "GET"
  path: "/api/<resource>"
  owner: "Backend Developer"

request:
  path_params: []
  query_params: []
  headers: []

responses:
  success:
    status: 200
    schema:
      type: object
      required: []
      properties: {}
    example: {}

  errors:
    - status: 400
      code: "validation_error"
      schema:
        type: object
        required: ["code", "message"]
        properties:
          code: { type: string }
          message: { type: string }
          details: { type: array, items: { type: string } }
      example:
        code: "validation_error"
        message: "Invalid request"
        details: []

    - status: 404
      code: "not_found"
      schema:
        type: object
        required: ["code", "message"]
        properties:
          code: { type: string }
          message: { type: string }
      example:
        code: "not_found"
        message: "Resource not found"

frontend_contract_notes:
  query_key: "<tanstack-query-key>"
  cache_policy: "<stale/retry/invalidation expectations>"
  route_usage: "<react-router route(s)>"

compatibility_rules:
  additive_only: true
  breaking_change_process: "requires ADR update"
```
