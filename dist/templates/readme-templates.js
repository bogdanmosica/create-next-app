export const actionsReadmeTemplate = `## Example of action 

> File name example \`./user.ts\`; we will take user as example, it can be anything, post, to do, article.
\`\`\`typescript
'use server'
import { db } from '@/lib/db' // Your database client

import { UserModel } from '@/types' // Your types folder
 
export async function createUser(data: UserModel) {
  const user = await db.user.create({ data })
  return user
}
\`\`\`


\`\`\`typescript
'use server'
import { db } from '@/lib/db'
 
export async function fetchUsers() {
  const users = await db.user.findMany()
  return users
}
\`\`\` 
> and how to use it:
\`\`\`jsx
'use client'
import { fetchUsers } from '@/actions';
import { Button } from '@/components/ui/button';
 
export default function MyButton() {
  return <Button onClick={() => fetchUsers()}>Fetch Users</Button>
}
\`\`\``;
export const componentsReadmeTemplate = `## Example use of a Shadcn component:

\`\`\`jsx
"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ObjectType = {
  Age: "age",
  Sex: "sex",
  Country: "country",
} as const;

const selectOptions = [
  { label: "Age", value: ObjectType.Age },
  { label: "Sex", value: ObjectType.Sex },
  { label: "Country", value: ObjectType.Country },
];

export function SelectExample() {
  const [selected, setSelected] = useState("");

  return (
    <Select value={selected} onValueChange={setSelected}>
      <SelectTrigger>
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        {selectOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
\`\`\`
> **IMPORTANT** if a constant like \`ObjectType\` in this example is used across all the other components it should be saved under \`lib/constants/object-type.ts\` in our case, that goes for any other constants.`;
export const libReadmeTemplate = `## Lib folder structure

This folder contains utility functions, constants, and configurations.

### Constants
Store shared constants in \`lib/constants/\` folder. For example:
- \`lib/constants/object-type.ts\` - Object type enums
- \`lib/constants/api-endpoints.ts\` - API endpoint constants

### Database
- \`lib/db/\` - Database configuration and schema files
- \`lib/db/schema.ts\` - Drizzle schema definitions
- \`lib/db/migrations/\` - Database migration files

### Utils
- \`lib/utils.ts\` - Utility functions (created by shadcn)
- \`lib/validations.ts\` - Validation schemas (Zod recommended)`;
export const libDbReadmeTemplate = `> The folder structure and code split I expect.
📂 db
    └ 📂 schema
      ├ 📜 users.sql.ts
      ├ 📜 common.sql.ts
      ├ 📜 cities.sql.ts
      ├ 📜 products.sql.ts
      ├ 📜 clients.sql.ts
      └ 📜 schema.ts

## Common timestamps example (common.sql.ts)

\`\`\`typescript
export const timestamps = {
  updated_at: timestamp(),
  created_at: timestamp().defaultNow().notNull(),
  deleted_at: timestamp(),
}
\`\`\`

> and to use:

\`\`\`typescript
// users.sql.ts
export const users = pgTable('users', {
  id: integer(),
  ...timestamps
})
\`\`\``;
//# sourceMappingURL=readme-templates.js.map