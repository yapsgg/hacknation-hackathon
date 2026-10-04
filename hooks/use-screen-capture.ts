"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type CaptureStatus = "idle" | "requesting" | "active" | "error"

export interface CapturedFrame {
  id: string
  t: number
  diff: number
  dataUrl: string | null
}

interface UseScreenCaptureOptions {
  fps?: number
  diffThreshold?: number
  onFrame?: (frame: CapturedFrame) => void
}

interface UseScreenCaptureResult {
  status: CaptureStatus
  error: string | null
  frameCount: number
  changedCount: number
  start: () => Promise<void>
  stop: () => void
}

const SAMPLE_WIDTH = 48
const SAMPLE_HEIGHT = 27
const OUTPUT_WIDTH = 960
const MAX_ENCODED_LENGTH = 320_000

function encodeReadableJpeg(canvas: HTMLCanvasElement): string {
  let encoded = canvas.toDataURL("image/jpeg", 0.55)
  if (encoded.length <= MAX_ENCODED_LENGTH) return encoded
  encoded = canvas.toDataURL("image/jpeg", 0.35)
  if (encoded.length <= MAX_ENCODED_LENGTH) return encoded

  const smaller = document.createElement("canvas")
  smaller.width = 720
  smaller.height = Math.max(1, Math.round((canvas.height / canvas.width) * 720))
  smaller
    .getContext("2d")
    ?.drawImage(canvas, 0, 0, smaller.width, smaller.height)
  return smaller.toDataURL("image/jpeg", 0.35)
}

export function useScreenCapture({
  fps = 1,
  diffThreshold = 0.02,
  onFrame,
}: UseScreenCaptureOptions = {}): UseScreenCaptureResult {
  const [status, setStatus] = useState<CaptureStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [frameCount, setFrameCount] = useState(0)
  const [changedCount, setChangedCount] = useState(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevGrayRef = useRef<Uint8Array | null>(null)
  const frameSeqRef = useRef(0)
  const onFrameRef = useRef(onFrame)

  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current = null
    }
    prevGrayRef.current = null
    setStatus("idle")
  }, [])

  const captureTick = useCallback(() => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return

    let canvas = canvasRef.current
    if (!canvas) {
      canvas = document.createElement("canvas")
      canvasRef.current = canvas
    }
    canvas.width = SAMPLE_WIDTH
    canvas.height = SAMPLE_HEIGHT
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT)

    const { data } = ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT)
    const gray = new Uint8Array(SAMPLE_WIDTH * SAMPLE_HEIGHT)
    for (let i = 0; i < gray.length; i += 1) {
      const o = i * 4
      gray[i] =
        (data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114) | 0
    }

    let diff = 1
    const prev = prevGrayRef.current
    if (prev) {
      let sum = 0
      for (let i = 0; i < gray.length; i += 1)
        sum += Math.abs(gray[i] - prev[i])
      diff = sum / gray.length / 255
    }
    prevGrayRef.current = gray
    frameSeqRef.current += 1

    setFrameCount((count) => count + 1)

    if (diff >= diffThreshold) {
      setChangedCount((count) => count + 1)
      let outputCanvas = outputCanvasRef.current
      if (!outputCanvas) {
        outputCanvas = document.createElement("canvas")
        outputCanvasRef.current = outputCanvas
      }
      const ratio =
        video.videoWidth > 0 ? video.videoHeight / video.videoWidth : 9 / 16
      outputCanvas.width = OUTPUT_WIDTH
      outputCanvas.height = Math.max(1, Math.round(OUTPUT_WIDTH * ratio))
      outputCanvas
        .getContext("2d")
        ?.drawImage(video, 0, 0, outputCanvas.width, outputCanvas.height)
      onFrameRef.current?.({
        id: `f_${String(frameSeqRef.current).padStart(4, "0")}`,
        t: Number((performance.now() / 1000).toFixed(2)),
        diff,
        dataUrl: encodeReadableJpeg(outputCanvas),
      })
    }
  }, [diffThreshold])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatus("error")
      setError("Screen capture is not supported in this browser.")
      return
    }
    setStatus("requesting")
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: fps },
        audio: false,
      })
      streamRef.current = stream
      const track = stream.getVideoTracks()[0]
      track?.addEventListener("ended", () => stop())

      const video = document.createElement("video")
      video.muted = true
      video.playsInline = true
      video.srcObject = stream
      videoRef.current = video
      await video.play().catch(() => undefined)

      prevGrayRef.current = null
      setStatus("active")
      timerRef.current = setInterval(captureTick, Math.max(250, 1000 / fps))
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "Screen capture failed.")
    }
  }, [captureTick, fps, stop])

  useEffect(() => {
    return () => stop()
  }, [stop])

  return {
    status,
    error,
    frameCount,
    changedCount,
    start,
    stop,
  }
}
