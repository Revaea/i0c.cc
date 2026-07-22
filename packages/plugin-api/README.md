# Plugin API

`@i0c/plugin-api` defines the stable compile-time protocol shared by i0c.cc hosts and plugins.

It owns plugin manifests, host and slot declarations, capabilities, configuration metadata, secret requirements, initialization services, health checks, migration contracts, and the typed extension boundaries used by Runtime and WebUI.

The package contains no provider SDK, database driver, React component, or dynamic plugin loader. Plugins are explicit workspace or package dependencies selected by a host at build time.
