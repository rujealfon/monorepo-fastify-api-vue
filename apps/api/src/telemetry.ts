import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { NodeSDK } from '@opentelemetry/sdk-node'

let sdk: NodeSDK | undefined

export function initTelemetry(endpoint: string) {
  if (!endpoint)
    return

  sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    instrumentations: [getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    })],
  })

  sdk.start()
}

export async function shutdownTelemetry() {
  await sdk?.shutdown()
}
