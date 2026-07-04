import process, { loadEnvFile } from 'node:process'

import { buildApp } from './app.js'
import { initTelemetry, shutdownTelemetry } from './telemetry.js'

try {
  loadEnvFile()
}
catch (err) {
  if ((err as NodeJS.ErrnoException).code !== 'ENOENT')
    throw err
}

initTelemetry(process.env.OTEL_ENDPOINT ?? '')

async function start() {
  const app = await buildApp()
  try {
    const address = await app.listen({
      port: app.config.PORT,
      host: app.config.HOST
    })
    app.log.info(`Server listening at ${address}`)

    let shuttingDown = false
    const shutdown = async (signal: string) => {
      if (shuttingDown)
        return
      shuttingDown = true
      app.log.info(`Received ${signal}, shutting down gracefully`)
      const forceExit = setTimeout(() => {
        app.log.error('Graceful shutdown timed out, forcing exit')
        process.exit(1)
      }, 10_000)
      forceExit.unref()
      try {
        await app.close()
        await shutdownTelemetry()
        process.exit(0)
      }
      catch (err) {
        app.log.error(err, 'Error during shutdown')
        process.exit(1)
      }
    }

    process.once('SIGINT', () => shutdown('SIGINT'))
    process.once('SIGTERM', () => shutdown('SIGTERM'))
    process.once('uncaughtException', (err) => {
      app.log.error(err, 'Uncaught exception')
      shutdown('uncaughtException')
    })
    process.once('unhandledRejection', (err) => {
      app.log.error(err, 'Unhandled rejection')
      shutdown('unhandledRejection')
    })
  }
  catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
