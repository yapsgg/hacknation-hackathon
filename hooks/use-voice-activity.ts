"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { isSpeakingRms } from "@/lib/live-capture"

export type VoiceActivityStatus = "idle" | "requesting" | "listening" | "error"

interface UseVoiceActivityOptions {
  /** Called about 10 times a second while the expert is speaking. */
  onSpeech: () => void
}

/**
 * Local voice-activity detection from the microphone level. The audio is only
 * measured in an AnalyserNode: it is never recorded, stored, or sent anywhere.
 * The only output is a boolean "speaking now" signal for the Question Governor.
 */
export function useVoiceActivity({ onSpeech }: UseVoiceActivityOptions) {
  const [status, setStatus] = useState<VoiceActivityStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [level, setLevel] = useState(0)
  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onSpeechRef = useRef(onSpeech)

  useEffect(() => {
    onSpeechRef.current = onSpeech
  }, [onSpeech])

  const stop = useCallback(() => {
    if (timerRef.current !== null) clearInterval(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    void contextRef.current?.close().catch(() => undefined)
    contextRef.current = null
    setLevel(0)
    setStatus("idle")
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error")
      setError("Microphone access is not supported in this browser.")
      return false
    }
    setStatus("requesting")
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false },
      })
      const context = new AudioContext()
      // Browsers can create the context suspended, which would read as permanent silence.
      // Not awaited: resume() stays pending until the browser allows audio, which must not block start.
      if (context.state === "suspended") void context.resume().catch(() => undefined)
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      const samples = new Float32Array(analyser.fftSize)
      let noiseFloor = 0.005

      streamRef.current = stream
      contextRef.current = context
      timerRef.current = setInterval(() => {
        analyser.getFloatTimeDomainData(samples)
        let sum = 0
        for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i]
        const rms = Math.sqrt(sum / samples.length)
        const speaking = isSpeakingRms(rms, noiseFloor)
        // Track the room's quiet level slowly, and only while nobody speaks.
        if (!speaking) noiseFloor = noiseFloor * 0.98 + rms * 0.02
        setLevel(Math.min(1, rms * 12))
        if (speaking) onSpeechRef.current()
      }, 100)
      setStatus("listening")
      return true
    } catch (err) {
      setStatus("error")
      setError(
        err instanceof Error ? err.message : "Microphone access was refused."
      )
      return false
    }
  }, [])

  useEffect(() => stop, [stop])

  return { status, error, level, start, stop }
}
