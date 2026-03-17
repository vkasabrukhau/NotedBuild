import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('postgres://3ff98103f71c2a3c654ddbb8a84f886c9182294b7bd418a74bc8d9ef05836f2f:sk_l6OExXEYET7wrPoG7ma78@db.prisma.io:5432/postgres?sslmode=require'),
  },
})
        