const { graphql } = require("graphql")
const { makeExecutableSchema } = require("graphql-tools")

function logError(errorLogger, error, context) {
  if (errorLogger) {
    errorLogger(error, context)
  } else {
    console.error(error)
  }
}

function createHandler(props) {
  const {
    cors,
    log,
    typeDefs,
    resolvers,
    directives,
    operationName,
    errorLogger,
  } = props

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
    directiveResolvers: directives,
  })

  return async (req, res) => {
    const { query, variables } = req.body
    const { method, query, body, headers, url } = req
    const errorContext = {
      gql: { query, variables, operationName },
      req: { method, query, body, headers, url },
    }
    try {
      if (log) {
        console.log()
        console.log("GRAPHQL")
        console.log(query)
        if (variables) console.log("variables: ", JSON.stringify(variables))
      }

      const context = {
        ...(props.context && (await props.context(req))),
        req,
        res,
      }
      const body = await graphql(
        schema,
        query,
        {},
        context,
        variables,
        operationName
      )

      res.setHeader("Content-Type", "application/json")
      if (cors) {
        const { origin = "*", headers = "*", optionsSuccessStatus = 204 } = cors

        res.setHeader("Access-Control-Allow-Origin", origin)
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
        res.setHeader("Access-Control-Allow-Headers", headers)

        if (req.method === "OPTIONS") {
          return res.status(optionsSuccessStatus).send("")
        }
      }

      if (body.errors && body.errors.length > 0) {
        logError(errorLogger, body.errors[0], errorContext)
      }
      res.status(200).send(JSON.stringify(body))
    } catch (err) {
      logError(errorLogger, err, errorContext)
      res.status(401).send(
        JSON.stringify({
          errors: [err.message],
        })
      )
    }
  }
}

module.exports = {
  createHandler,
}
