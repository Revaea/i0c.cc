# External Runtime plugin fixture

This private package simulates an independently authored Runtime platform plugin. It exposes the standard manifest, runtime, and installation entrypoints and proves that `apps/runtime` can build the adapter from a build-time installation config without platform-specific source changes.

It is a test fixture under the plugin subsystem, not a deployable supported platform. The package uses the repository Apache-2.0 license.
