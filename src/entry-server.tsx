import React from 'react'
import { getManifest } from '@tanstack/react-start/server'
import { StartServer, transformStreamWithRouter } from '@tanstack/react-start/server'
import { createRouter } from './router'

export async function render(
  url: string,
  response: (status: number, headers: Record<string, string>, body: string) => void,
) {
  const router = createRouter()
  router.update({
    location: new URL(url).pathname,
  })

  const manifest = getManifest()
  const html = await transformStreamWithRouter(
    router,
    manifest,
    () => <StartServer router={router} />,
  )

  response(200, { 'Content-Type': 'text/html' }, html)
}
