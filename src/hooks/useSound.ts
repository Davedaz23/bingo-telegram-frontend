'use client'

import { useCallback, useRef } from 'react'

let audioCtx: AudioContext | null = null

function getCtx() {
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = new Ctor()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15, delay = 0) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    const startTime = ctx.currentTime + delay
    osc.frequency.setValueAtTime(frequency, startTime)
    gain.gain.setValueAtTime(volume, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(startTime)
    osc.stop(startTime + duration)
  } catch {
    // Audio not supported
  }
}

function playNumberChime(num: number) {
  // Bell-like chime that scales with the number
  const colIndex = Math.floor((num - 1) / 15)
  const colPitch = [0, 2, 4, 6, 8][colIndex] || 0
  const baseFreq = 330 + colPitch * 55 + (num % 15) * 8

  // Strike (louder)
  playTone(baseFreq, 0.25, 'sine', 0.2)
  // Harmonic
  playTone(baseFreq * 2, 0.2, 'sine', 0.1, 0.05)
  // Decay tail
  playTone(baseFreq * 1.5, 0.35, 'triangle', 0.08, 0.12)
}

function playWinFanfare() {
  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    playTone(freq, 0.35, 'sine', 0.2, i * 160 / 1000)
    playTone(freq * 2, 0.2, 'sine', 0.08, i * 160 / 1000 + 0.05)
  })
}

function playCountdownBeep() {
  playTone(880, 0.12, 'square', 0.1)
}

function playCardPurchase() {
  playTone(660, 0.1, 'sine', 0.15)
  playTone(880, 0.18, 'sine', 0.15, 0.1)
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
