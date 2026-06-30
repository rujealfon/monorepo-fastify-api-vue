import process from 'node:process'
import { buildApp } from './app.js'
import { initTelemetry, shutdownTelemetry } from './telemetry.js'

initTelemetry(process.env.OTEL_ENDPOINT ?? '')

async function start() {
  const app = await buildApp()
  try {
    const address = await app.listen({
      port: app.config.PORT,
      host: app.config.HOST,
    })
    app.log.info(`Server listening at ${address}`)

    const shutdown = async (signal: string) => {
      app.log.info(`Received ${signal}, shutting down gracefully`)
      await app.close()
      await shutdownTelemetry()
      process.exit(0)
    }

    process.once('SIGINT', () => shutdown('SIGINT'))
    process.once('SIGTERM', () => shutdown('SIGTERM'))
  }
  catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
