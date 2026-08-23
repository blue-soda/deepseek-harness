# @deepseek-ai/dsh-attachment-android

Android embedded attachment backend for DeepSeek Harness. It mounts `ctx.attachments` without `sharp`/libvips and stores PNG, JPEG, and WebP images as verified content-addressed objects under `DSH_HOME`.

This backend is intended for the embedded Android runtime where native image-processing packages are either unavailable or too large. It validates image headers and dimensions, persists original encoded bytes, and serves model-request images only when the stored image already fits the route budget. Oversized request projections fail closed with `IMAGE_TOO_LARGE`; Android/Kotlin-side resizing can be layered behind this package later without changing the DSH attachment API.
