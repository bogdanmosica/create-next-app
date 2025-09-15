# Data Model: Next.js App Creation Server

## Entities

### ProjectRequest
- requestedTools: string[]
- configOptions: object
- userInfo: object

### GeneratedApplication
- folderStructure: object
- includedTools: string[]
- configFiles: object

### ErrorReport
- errorType: string
- message: string
- resolution: string

## Relationships
- ProjectRequest → GeneratedApplication (1:1)
- ProjectRequest → ErrorReport (0..*)

## Validation Rules
- requestedTools must be from supported list
- configOptions must match schema
- userInfo must include contact or team info

## State Transitions
- ProjectRequest: submitted → processing → completed/error
- GeneratedApplication: created → delivered
- ErrorReport: created → resolved
