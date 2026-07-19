# Battery Operations Grafana App Plugin

This plugin adds an industrial battery operations page to Grafana. It reuses the existing FastAPI battery API and keeps Grafana focused on the operational interface.

## Source Layout

```text
src/
  module.tsx                    # Grafana app entry point
  pages/BatteryOperationsPage   # Operational monitoring page
  services/batteryApi.ts        # FastAPI request boundary
  plugin.json                   # Plugin identity and navigation
provisioning/plugins/           # Grafana app enablement configuration
dist/                           # Generated production bundle - do not edit
```

## Development

```bash
npm run typecheck
npm run build
```

The production bundle is installed in WSL at:

```text
/var/lib/grafana/plugins/chenq-batteryops-app
```

Grafana enables the local unsigned plugin through:

```text
/etc/grafana/grafana.ini
/etc/grafana/provisioning/plugins/battery-ops.yaml
```
