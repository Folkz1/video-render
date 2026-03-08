# Render Farm

This folder turns `video-5min` into a real distributed Remotion farm instead of a single remote render box.

## What changed

- `worker.mjs`: long-running HTTP worker that accepts a bundled project, renders frame ranges, and exposes chunk artifacts.
- `coordinator.mjs`: bundles the project once, uploads it to all healthy workers, shards the timeline, retries failed chunks, and joins the final video automatically.
- `validate-easypanel.mjs`: validates whether an EasyPanel `render` service is actually deployable.
- `deploy-easypanel.mjs`: configures an EasyPanel `render` service from GitHub or a Docker image, deploys it, and waits for `/health`.
- `nodes.json`: inventory of Contabo, EasyPanel nodes, and GitHub burst capacity.

## Why the previous setup failed

The old scripts only rendered a whole composition inside one remote container. That is outsourcing, not a farm.

The `wordpress/render` EasyPanel service was validated as broken: the service exists, but it has no source/image and no ingress, so it cannot participate in any hub today.

## Usage

Start a worker locally:

```bash
npm run farm:worker
```

Render with the coordinator:

```bash
npm run farm:render -- --composition Video7-WhatsApp
```

Render only part of a composition:

```bash
npm run farm:render -- --composition Video1-NVIDIA --range 0-299 --frames-per-chunk 60
```

Validate an EasyPanel service:

```bash
set EASYPANEL_URL=http://95.111.249.160:3000
set EASYPANEL_PROJECT=wordpress
set EASYPANEL_SERVICE=render
set EASYPANEL_API_KEY=...
npm run farm:validate:easypanel
```

Deploy a worker into EasyPanel from the public GitHub repo:

```bash
set EASYPANEL_URL=http://95.111.249.160:3000
set EASYPANEL_PROJECT=wordpress
set EASYPANEL_SERVICE=render
set EASYPANEL_API_KEY=...
set RENDER_FARM_DOMAIN_HOST=render-wordpress.jz9bd8.easypanel.host
npm run farm:deploy:easypanel
```
