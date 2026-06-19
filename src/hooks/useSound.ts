'use client'

import { useCallback, useRef } from 'react'

let audioCtx: AudioContext | null = null

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioCtx
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Audio not supported
  }
}

function playNumberChime(num: number) {
  // Higher numbers = higher pitch
  const baseFreq = 220 + (num / 75) * 440
  playTone(baseFreq, 0.15, 'sine', 0.12)
  setTimeout(() => playTone(baseFreq * 1.5, 0.12, 'sine', 0.08), 80)
}

function playWinFanfare() {
  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, 'sine', 0.15), i * 150)
  })
}

function playCountdownBeep() {
  playTone(880, 0.1, 'square', 0.08)
}

function playCardPurchase() {
  playTone(660, 0.1, 'sine', 0.1)
  setTimeout(() => playTone(880, 0.15, 'sine', 0.1), 100)
}

export function useSound() {
  const enabledRef = useRef(true)

  const numberDrawn = useCallback((num: number) => {
    if (!enabledRef.current) return
    playNumberChime(num)
  }, [])

  const win = useCallback(() => {
    if (!enabledRef.current) return
    playWinFanfare()
  }, [])

  const countdown = useCallback(() => {
    if (!enabledRef.current) return
    playCountdownBeep()
  }, [])

  const cardPurchased = useCallback(() => {
    if (!enabledRef.current) return
    playCardPurchase()
  }, [])

  const setEnabled = useCallback((val: boolean) => {
    enabledRef.current = val
  }, [])

  return { numberDrawn, win, countdown, cardPurchased, setEnabled }
}
