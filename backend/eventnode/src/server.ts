import express from "express"
import { postgraphile } from "postgraphile"
import PgSimplifyInflectorPlugin from "@graphile-contrib/pg-simplify-inflector"
import ConnectionFilterPlugin from "postgraphile-plugin-connection-filter"

export const runServer = () => {
  // graphql server running
  const app = express()

  app.use(
    postgraphile(
      {
        host: process.env.AWS_RDS_DB_HOST,
        port: Number(process.env.AWS_RDS_DB_PORT) || 5432,
        user: process.env.AWS_RDS_DB_USER,
        password: process.env.AWS_RDS_DB_PASSWORD,
        database: process.env.AWS_RDS_DB_NAME,
        ssl: { rejectUnauthorized: false },
      },
      "public",
      {
        appendPlugins: [
          PgSimplifyInflectorPlugin,
          ConnectionFilterPlugin,
        ],
        watchPg: true,
        graphiql: true,
        enhanceGraphiql: true,
      }
    )
  )

  app.listen(process.env.PORT || 3111)
}