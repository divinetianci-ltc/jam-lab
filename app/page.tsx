"use client";

import { Download, Drum, Link2, Music2, Pause, Play, RefreshCw, Repeat2, RotateCcw, Sparkles, Volume2, VolumeX, WandSparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

type LaneId = "crash" | "hat" | "rack" | "snare" | "floor" | "kick";
type DrumData = Record<LaneId, number[]>;
type DoubleData = Record<LaneId, boolean[]>;
type PracticeMode = "full" | "backing" | "alternate";
type Mixer = Record<"drums" | "bass" | "keys" | "guitar", boolean>;
type Style = { id: string; label: string; bpm: [number, number]; progression: number[]; swing: number; keySound: "piano" | "ep" | "organ" | "pad"; guitarSound: "clean" | "muted" | "acoustic" | "drive" };
type Mood = { id: string; label: string; energy: number; valence: number; tension: number };
type Section = { name: string; bars: number; start: number; tone: string };
type Arrangement = { id: number; style: Style; mood: Mood; bpm: number; mode: "major" | "minor"; keyName: string; rootMidi: number; progression: number[]; totalBars: number; totalSeconds: number; sections: Section[]; summary: string; sourceDrums: DrumData };
type StyleBuses = { signature: string; drums: GainNode; bass: GainNode; keys: GainNode; guitar: GainNode; nodes: AudioNode[] };
type InstrumentMix = { drums: number; bass: number; keys: number; guitar: number };
type StyleFx = { drumThreshold: number; drumRatio: number; bassCutoff: number; bassQ: number; bassDrive: number; bassRatio: number; keysCutoff: number; keysDrive: number; keysRatio: number; keysRoom: number; keysDelay: number; guitarDrive: number; guitarCab: number; guitarRatio: number; guitarRoom: number; guitarDelay: number; roomSeconds: number; roomDecay: number; roomWet: number; delayBeat: number; delayWet: number; feedback: number };
type MoodFx = { brightness: number; drive: number; room: number; delay: number; compression: number };
type EqCurve = { drums: [number, number, number]; bass: [number, number, number]; keys: [number, number, number]; guitar: [number, number, number] };

const LANES: { id: LaneId; name: string; short: string; color: string }[] = [
  { id: "crash", name: "Crash", short: "CR", color: "#ffb45c" },
  { id: "hat", name: "踩镲", short: "HH", color: "#c8f45a" },
  { id: "rack", name: "高音嗵鼓", short: "HT", color: "#69d9d0" },
  { id: "snare", name: "军鼓", short: "SN", color: "#ff7c5c" },
  { id: "floor", name: "落地嗵鼓", short: "FT", color: "#a78bfa" },
  { id: "kick", name: "底鼓", short: "BD", color: "#f2f4ef" },
];

const STYLES: Style[] = [
  { id: "pop", label: "Pop", bpm: [88, 122], progression: [0, 4, 5, 3], swing: 0, keySound: "piano", guitarSound: "clean" },
  { id: "rock", label: "Rock", bpm: [92, 142], progression: [0, 5, 3, 4], swing: 0, keySound: "organ", guitarSound: "drive" },
  { id: "hard-rock", label: "Hard Rock", bpm: [104, 156], progression: [0, 5, 6, 4], swing: 0, keySound: "organ", guitarSound: "drive" },
  { id: "metal", label: "Metal", bpm: [118, 185], progression: [0, 5, 1, 6], swing: 0, keySound: "pad", guitarSound: "drive" },
  { id: "funk", label: "Funk", bpm: [88, 118], progression: [0, 3, 4, 3], swing: 0.03, keySound: "ep", guitarSound: "muted" },
  { id: "soul", label: "Soul", bpm: [70, 104], progression: [0, 5, 1, 4], swing: 0.04, keySound: "ep", guitarSound: "clean" },
  { id: "rnb", label: "R&B", bpm: [68, 100], progression: [0, 2, 5, 4], swing: 0.02, keySound: "ep", guitarSound: "clean" },
  { id: "neo-soul", label: "Neo-Soul", bpm: [72, 102], progression: [0, 3, 2, 4], swing: 0.06, keySound: "ep", guitarSound: "muted" },
  { id: "country", label: "Country", bpm: [92, 138], progression: [0, 3, 4, 0], swing: 0, keySound: "piano", guitarSound: "acoustic" },
  { id: "blues", label: "Blues", bpm: [72, 126], progression: [0, 0, 3, 0, 4, 3], swing: 0.12, keySound: "organ", guitarSound: "clean" },
  { id: "jazz", label: "Jazz Swing", bpm: [92, 168], progression: [1, 4, 0, 5], swing: 0.17, keySound: "piano", guitarSound: "clean" },
  { id: "bossa", label: "Bossa Nova", bpm: [92, 132], progression: [0, 5, 1, 4], swing: 0, keySound: "piano", guitarSound: "acoustic" },
  { id: "reggae", label: "Reggae", bpm: [70, 102], progression: [0, 4, 5, 4], swing: 0.02, keySound: "organ", guitarSound: "muted" },
  { id: "disco", label: "Disco", bpm: [112, 128], progression: [0, 5, 3, 4], swing: 0, keySound: "ep", guitarSound: "muted" },
  { id: "hiphop", label: "Hip-Hop", bpm: [72, 98], progression: [0, 5, 3, 4], swing: 0.06, keySound: "pad", guitarSound: "clean" },
  { id: "dance", label: "Dance", bpm: [118, 132], progression: [0, 5, 3, 4], swing: 0, keySound: "pad", guitarSound: "muted" },
];

const STYLE_MIXES: Record<string, InstrumentMix> = {
  pop: { drums: 0.94, bass: 0.9, keys: 0.88, guitar: 0.8 },
  rock: { drums: 1.02, bass: 0.9, keys: 0.62, guitar: 1.04 },
  "hard-rock": { drums: 1.04, bass: 0.92, keys: 0.54, guitar: 1.08 },
  metal: { drums: 1.06, bass: 0.94, keys: 0.46, guitar: 1.12 },
  funk: { drums: 0.9, bass: 1.04, keys: 0.92, guitar: 1 },
  soul: { drums: 0.8, bass: 0.94, keys: 1, guitar: 0.78 },
  rnb: { drums: 0.78, bass: 1.04, keys: 0.98, guitar: 0.68 },
  "neo-soul": { drums: 0.78, bass: 1, keys: 1.04, guitar: 0.8 },
  country: { drums: 0.88, bass: 0.84, keys: 0.82, guitar: 1.06 },
  blues: { drums: 0.84, bass: 0.9, keys: 0.88, guitar: 1 },
  jazz: { drums: 0.72, bass: 0.98, keys: 1.04, guitar: 0.7 },
  bossa: { drums: 0.7, bass: 0.88, keys: 0.96, guitar: 1.02 },
  reggae: { drums: 0.84, bass: 1.08, keys: 0.84, guitar: 0.98 },
  disco: { drums: 1, bass: 0.92, keys: 0.86, guitar: 1 },
  hiphop: { drums: 1.04, bass: 1.1, keys: 0.76, guitar: 0.56 },
  dance: { drums: 1.04, bass: 1.02, keys: 1, guitar: 0.62 },
};

const STYLE_FX: Record<string, StyleFx> = {
  pop: { drumThreshold: -18, drumRatio: 4, bassCutoff: 850, bassQ: 1.2, bassDrive: 0.025, bassRatio: 3.5, keysCutoff: 6500, keysDrive: 0.008, keysRatio: 3, keysRoom: 0.24, keysDelay: 0.08, guitarDrive: 0.014, guitarCab: 6500, guitarRatio: 3, guitarRoom: 0.18, guitarDelay: 0.14, roomSeconds: 1.25, roomDecay: 3, roomWet: 0.13, delayBeat: 0.375, delayWet: 0.12, feedback: 0.2 },
  rock: { drumThreshold: -24, drumRatio: 7, bassCutoff: 1050, bassQ: 1.1, bassDrive: 0.075, bassRatio: 5.5, keysCutoff: 5200, keysDrive: 0.04, keysRatio: 4.5, keysRoom: 0.1, keysDelay: 0.035, guitarDrive: 0.5, guitarCab: 4700, guitarRatio: 6.5, guitarRoom: 0.08, guitarDelay: 0.055, roomSeconds: 0.75, roomDecay: 3.7, roomWet: 0.075, delayBeat: 0.375, delayWet: 0.08, feedback: 0.14 },
  "hard-rock": { drumThreshold: -26, drumRatio: 8.5, bassCutoff: 1200, bassQ: 1.2, bassDrive: 0.1, bassRatio: 6, keysCutoff: 4700, keysDrive: 0.065, keysRatio: 5, keysRoom: 0.075, keysDelay: 0.025, guitarDrive: 0.72, guitarCab: 4300, guitarRatio: 8, guitarRoom: 0.055, guitarDelay: 0.04, roomSeconds: 0.62, roomDecay: 4.2, roomWet: 0.055, delayBeat: 0.375, delayWet: 0.065, feedback: 0.11 },
  metal: { drumThreshold: -29, drumRatio: 10, bassCutoff: 1350, bassQ: 1.4, bassDrive: 0.14, bassRatio: 7.5, keysCutoff: 3400, keysDrive: 0.035, keysRatio: 5.5, keysRoom: 0.12, keysDelay: 0.04, guitarDrive: 1.05, guitarCab: 3850, guitarRatio: 10, guitarRoom: 0.035, guitarDelay: 0.025, roomSeconds: 0.5, roomDecay: 4.8, roomWet: 0.04, delayBeat: 0.25, delayWet: 0.045, feedback: 0.08 },
  funk: { drumThreshold: -20, drumRatio: 5.5, bassCutoff: 1450, bassQ: 3.2, bassDrive: 0.06, bassRatio: 6.5, keysCutoff: 4700, keysDrive: 0.055, keysRatio: 4.5, keysRoom: 0.1, keysDelay: 0.12, guitarDrive: 0.045, guitarCab: 3900, guitarRatio: 5, guitarRoom: 0.075, guitarDelay: 0.16, roomSeconds: 0.65, roomDecay: 4.1, roomWet: 0.065, delayBeat: 0.5, delayWet: 0.11, feedback: 0.18 },
  soul: { drumThreshold: -16, drumRatio: 3.2, bassCutoff: 720, bassQ: 0.9, bassDrive: 0.02, bassRatio: 3, keysCutoff: 4100, keysDrive: 0.035, keysRatio: 3.5, keysRoom: 0.45, keysDelay: 0.09, guitarDrive: 0.018, guitarCab: 5700, guitarRatio: 2.8, guitarRoom: 0.34, guitarDelay: 0.09, roomSeconds: 2.15, roomDecay: 2.3, roomWet: 0.22, delayBeat: 0.5, delayWet: 0.1, feedback: 0.18 },
  rnb: { drumThreshold: -19, drumRatio: 4.2, bassCutoff: 590, bassQ: 1.1, bassDrive: 0.018, bassRatio: 4.5, keysCutoff: 3600, keysDrive: 0.03, keysRatio: 4, keysRoom: 0.52, keysDelay: 0.15, guitarDrive: 0.012, guitarCab: 5200, guitarRatio: 3.2, guitarRoom: 0.38, guitarDelay: 0.15, roomSeconds: 2.35, roomDecay: 2.15, roomWet: 0.24, delayBeat: 0.5, delayWet: 0.14, feedback: 0.24 },
  "neo-soul": { drumThreshold: -18, drumRatio: 3.8, bassCutoff: 680, bassQ: 1.3, bassDrive: 0.028, bassRatio: 4, keysCutoff: 3900, keysDrive: 0.052, keysRatio: 4.2, keysRoom: 0.72, keysDelay: 0.28, guitarDrive: 0.038, guitarCab: 4800, guitarRatio: 3.5, guitarRoom: 0.58, guitarDelay: 0.32, roomSeconds: 2.9, roomDecay: 1.9, roomWet: 0.31, delayBeat: 0.5, delayWet: 0.2, feedback: 0.35 },
  country: { drumThreshold: -16, drumRatio: 3.4, bassCutoff: 930, bassQ: 0.8, bassDrive: 0.022, bassRatio: 3.5, keysCutoff: 7200, keysDrive: 0.006, keysRatio: 2.8, keysRoom: 0.2, keysDelay: 0.04, guitarDrive: 0.008, guitarCab: 7600, guitarRatio: 2.5, guitarRoom: 0.22, guitarDelay: 0.075, roomSeconds: 1.15, roomDecay: 3.1, roomWet: 0.12, delayBeat: 0.375, delayWet: 0.085, feedback: 0.15 },
  blues: { drumThreshold: -16, drumRatio: 3.2, bassCutoff: 760, bassQ: 1, bassDrive: 0.035, bassRatio: 3.2, keysCutoff: 5100, keysDrive: 0.045, keysRatio: 3.4, keysRoom: 0.28, keysDelay: 0.08, guitarDrive: 0.095, guitarCab: 5600, guitarRatio: 3.8, guitarRoom: 0.3, guitarDelay: 0.13, roomSeconds: 1.65, roomDecay: 2.7, roomWet: 0.17, delayBeat: 0.5, delayWet: 0.12, feedback: 0.2 },
  jazz: { drumThreshold: -11, drumRatio: 2.1, bassCutoff: 630, bassQ: 0.75, bassDrive: 0.008, bassRatio: 2.2, keysCutoff: 7800, keysDrive: 0.003, keysRatio: 2.2, keysRoom: 0.48, keysDelay: 0.025, guitarDrive: 0.006, guitarCab: 6900, guitarRatio: 2.1, guitarRoom: 0.34, guitarDelay: 0.035, roomSeconds: 2.05, roomDecay: 2.25, roomWet: 0.2, delayBeat: 0.5, delayWet: 0.065, feedback: 0.1 },
  bossa: { drumThreshold: -12, drumRatio: 2.4, bassCutoff: 610, bassQ: 0.8, bassDrive: 0.01, bassRatio: 2.5, keysCutoff: 6100, keysDrive: 0.004, keysRatio: 2.4, keysRoom: 0.36, keysDelay: 0.035, guitarDrive: 0.004, guitarCab: 7200, guitarRatio: 2.2, guitarRoom: 0.42, guitarDelay: 0.055, roomSeconds: 1.8, roomDecay: 2.55, roomWet: 0.18, delayBeat: 0.5, delayWet: 0.075, feedback: 0.12 },
  reggae: { drumThreshold: -18, drumRatio: 4, bassCutoff: 540, bassQ: 1.35, bassDrive: 0.022, bassRatio: 4.2, keysCutoff: 4300, keysDrive: 0.045, keysRatio: 3.5, keysRoom: 0.3, keysDelay: 0.28, guitarDrive: 0.035, guitarCab: 4100, guitarRatio: 4, guitarRoom: 0.22, guitarDelay: 0.42, roomSeconds: 1.55, roomDecay: 2.8, roomWet: 0.16, delayBeat: 0.75, delayWet: 0.2, feedback: 0.42 },
  disco: { drumThreshold: -24, drumRatio: 7, bassCutoff: 1050, bassQ: 2.2, bassDrive: 0.045, bassRatio: 5.5, keysCutoff: 5900, keysDrive: 0.035, keysRatio: 4.5, keysRoom: 0.17, keysDelay: 0.16, guitarDrive: 0.04, guitarCab: 4700, guitarRatio: 5, guitarRoom: 0.11, guitarDelay: 0.18, roomSeconds: 0.9, roomDecay: 3.7, roomWet: 0.09, delayBeat: 0.5, delayWet: 0.14, feedback: 0.22 },
  hiphop: { drumThreshold: -25, drumRatio: 6.5, bassCutoff: 360, bassQ: 1.5, bassDrive: 0.018, bassRatio: 5, keysCutoff: 2200, keysDrive: 0.012, keysRatio: 3.2, keysRoom: 0.55, keysDelay: 0.13, guitarDrive: 0.008, guitarCab: 4700, guitarRatio: 2.8, guitarRoom: 0.3, guitarDelay: 0.12, roomSeconds: 2.25, roomDecay: 2.1, roomWet: 0.22, delayBeat: 0.75, delayWet: 0.11, feedback: 0.2 },
  dance: { drumThreshold: -27, drumRatio: 8, bassCutoff: 720, bassQ: 2.5, bassDrive: 0.055, bassRatio: 6.5, keysCutoff: 4200, keysDrive: 0.045, keysRatio: 5.5, keysRoom: 0.3, keysDelay: 0.26, guitarDrive: 0.035, guitarCab: 4400, guitarRatio: 5, guitarRoom: 0.12, guitarDelay: 0.19, roomSeconds: 1.4, roomDecay: 3, roomWet: 0.14, delayBeat: 0.5, delayWet: 0.17, feedback: 0.28 },
};

const MOOD_FX: Record<string, MoodFx> = {
  happy: { brightness: 1.08, drive: 1, room: 0.88, delay: 0.86, compression: 1 }, sad: { brightness: 0.86, drive: 0.82, room: 1.35, delay: 1.22, compression: 0.88 },
  calm: { brightness: 0.84, drive: 0.7, room: 1.25, delay: 1, compression: 0.78 }, wild: { brightness: 1.18, drive: 1.38, room: 0.68, delay: 0.72, compression: 1.3 },
  relaxed: { brightness: 0.88, drive: 0.74, room: 1.35, delay: 1.12, compression: 0.82 }, tense: { brightness: 1.08, drive: 1.3, room: 1.08, delay: 1.3, compression: 1.28 },
  warm: { brightness: 0.9, drive: 0.82, room: 1.16, delay: 0.9, compression: 0.9 }, dreamy: { brightness: 0.87, drive: 0.72, room: 1.72, delay: 1.65, compression: 0.8 },
  mystery: { brightness: 0.82, drive: 0.9, room: 1.5, delay: 1.46, compression: 0.92 }, dark: { brightness: 0.7, drive: 1.18, room: 1.24, delay: 1.2, compression: 1.12 },
  uplifting: { brightness: 1.17, drive: 1.1, room: 0.92, delay: 0.88, compression: 1.1 }, lonely: { brightness: 0.76, drive: 0.68, room: 1.58, delay: 1.34, compression: 0.74 },
  hope: { brightness: 1.04, drive: 0.9, room: 1.18, delay: 1, compression: 0.9 }, epic: { brightness: 1.1, drive: 1.28, room: 1.42, delay: 1.28, compression: 1.22 },
};

const STYLE_EQS: Record<string, EqCurve> = {
  pop: { drums: [2, -1, 2], bass: [2, -1, 0], keys: [-1, 1, 2], guitar: [-1, 1, 2] }, rock: { drums: [3, -2, 3], bass: [2, 2, 1], keys: [-2, 2, 1], guitar: [-3, 4, 2] },
  "hard-rock": { drums: [4, -2, 4], bass: [3, 3, 1], keys: [-3, 2, 0], guitar: [-4, 5, 2] }, metal: { drums: [4, -3, 5], bass: [3, 4, 2], keys: [-4, 1, -1], guitar: [-5, 6, 3] },
  funk: { drums: [1, 2, 3], bass: [3, 4, 5], keys: [-2, 3, 2], guitar: [-3, 5, 4] }, soul: { drums: [1, 1, -1], bass: [3, 2, -2], keys: [1, 3, -1], guitar: [0, 2, -1] },
  rnb: { drums: [3, -2, -2], bass: [5, 0, -3], keys: [1, 2, -2], guitar: [-1, 1, -2] }, "neo-soul": { drums: [2, 0, -2], bass: [4, 2, -2], keys: [2, 4, -3], guitar: [0, 3, -3] },
  country: { drums: [1, 1, 3], bass: [1, 1, 1], keys: [-2, 1, 4], guitar: [-2, 2, 5] }, blues: { drums: [1, 2, 0], bass: [2, 3, -1], keys: [0, 4, 0], guitar: [-1, 5, 1] },
  jazz: { drums: [-1, 1, 1], bass: [3, 2, -2], keys: [0, 2, 1], guitar: [-1, 2, 0] }, bossa: { drums: [-2, 1, -1], bass: [2, 1, -2], keys: [0, 2, 0], guitar: [1, 3, -1] },
  reggae: { drums: [2, 0, 1], bass: [5, 1, -4], keys: [-2, 4, 1], guitar: [-4, 5, 2] }, disco: { drums: [3, -1, 4], bass: [3, 2, 2], keys: [-2, 2, 4], guitar: [-3, 5, 5] },
  hiphop: { drums: [5, -3, -2], bass: [6, -2, -5], keys: [2, 0, -4], guitar: [-2, 1, -2] }, dance: { drums: [4, -2, 5], bass: [5, -1, 1], keys: [-3, 2, 4], guitar: [-4, 4, 3] },
};

const MOODS: Mood[] = [
  { id: "happy", label: "开心", energy: 0.72, valence: 0.9, tension: 0.18 }, { id: "sad", label: "悲伤", energy: 0.3, valence: 0.12, tension: 0.38 },
  { id: "calm", label: "平静", energy: 0.24, valence: 0.62, tension: 0.1 }, { id: "wild", label: "狂野", energy: 1, valence: 0.62, tension: 0.66 },
  { id: "relaxed", label: "放松", energy: 0.34, valence: 0.76, tension: 0.06 }, { id: "tense", label: "紧张", energy: 0.74, valence: 0.18, tension: 0.94 },
  { id: "warm", label: "温暖", energy: 0.44, valence: 0.82, tension: 0.12 }, { id: "dreamy", label: "梦幻", energy: 0.38, valence: 0.66, tension: 0.3 },
  { id: "mystery", label: "神秘", energy: 0.42, valence: 0.28, tension: 0.65 }, { id: "dark", label: "黑暗", energy: 0.62, valence: 0.08, tension: 0.78 },
  { id: "uplifting", label: "振奋", energy: 0.9, valence: 0.9, tension: 0.25 }, { id: "lonely", label: "孤独", energy: 0.2, valence: 0.08, tension: 0.3 },
  { id: "hope", label: "希望", energy: 0.58, valence: 0.86, tension: 0.2 }, { id: "epic", label: "史诗感", energy: 0.92, valence: 0.56, tension: 0.76 },
];

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const KEY_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const SECTION_TONES = ["#596e3a", "#526c62", "#71523d", "#53627a", "#72566f", "#7b653e", "#4d5450"];

function blankDrums(steps = 16): DrumData { return Object.fromEntries(LANES.map((lane) => [lane.id, Array(steps).fill(0)])) as DrumData }
function blankDoubles(steps = 16): DoubleData { return Object.fromEntries(LANES.map((lane) => [lane.id, Array(steps).fill(false)])) as DoubleData }
function put(data: DrumData, lane: LaneId, positions: number[], value: number, steps: number) { const q = steps / 4; positions.forEach((p) => { const i = Math.round(p * q); if (i >= 0 && i < steps) data[lane][i] = value }) }
function makePreset(name: string, steps = 16): DrumData {
  const data = blankDrums(steps), q = steps / 4, eighth = steps === 12 ? 3 : Math.max(1, Math.round(q / 2));
  if (name === "blank") return data;
  if (name === "disco") { for (let i = 0; i < steps; i += eighth) data.hat[i] = i % q === 0 ? 3 : 2; put(data, "kick", [0, 1, 2, 3], 3, steps); put(data, "snare", [1, 3], 3, steps); return data }
  if (name === "shuffle") { for (let i = 0; i < steps; i += steps === 12 ? 2 : eighth) data.hat[i] = i % q === 0 ? 3 : 2; put(data, "kick", [0, 2.67], 3, steps); put(data, "snare", [1, 3], 3, steps); return data }
  for (let i = 0; i < steps; i += name === "funk" ? Math.max(1, Math.round(q / 4)) : eighth) data.hat[i] = i % q === 0 ? 3 : 2;
  put(data, "snare", name === "halftime" ? [2] : [1, 3], 3, steps);
  if (name === "funk") { put(data, "snare", [1.75, 2.5, 3.75], 1, steps); put(data, "kick", [0, 0.75, 1.5, 2.5, 3.25], 3, steps) }
  else if (name === "halftime") { put(data, "snare", [1.5, 3.5], 1, steps); put(data, "kick", [0, 1.25, 2.75], 3, steps) }
  else put(data, "kick", [0, 2, 2.5], 3, steps);
  data.crash[0] = 3; return data;
}
function drumDensity(data: DrumData) { return Object.values(data).reduce((sum, values) => sum + values.filter(Boolean).length, 0) / (data.hat.length * LANES.length) }
function inferStyle(data: DrumData, steps: number): Style {
  if (steps === 12) return STYLES.find((s) => s.id === "jazz")!;
  const density = drumDensity(data), kicks = data.kick.filter(Boolean).length;
  if ([0, 1, 2, 3].every((beat) => data.kick[Math.round(beat * steps / 4)] > 0)) return STYLES.find((s) => s.id === "disco")!;
  if (density > 0.27 || kicks >= 5) return STYLES.find((s) => s.id === "funk")!;
  if (data.snare[Math.round(2 * steps / 4)] && !data.snare[Math.round(steps / 4)]) return STYLES.find((s) => s.id === "hiphop")!;
  return STYLES.find((s) => s.id === "pop")!;
}
function inferMood(data: DrumData): Mood { const d = drumDensity(data); return d > 0.3 ? MOODS.find((m) => m.id === "wild")! : d < 0.13 ? MOODS.find((m) => m.id === "calm")! : MOODS.find((m) => m.id === "happy")! }
function buildSections(total: number, style: Style, mood: Mood, id: number): Section[] {
  const songForms = style.id === "jazz" || style.id === "blues"
    ? [["Intro", "Head", "Solo A", "Solo B", "Head Out", "Outro"], ["Pickup", "Head", "Solo", "Trading", "Head Out", "Tag"]]
    : ["metal", "hard-rock", "rock"].includes(style.id)
      ? [["Intro", "Riff A", "Riff B", "A2", "Breakdown", "Solo", "Final", "Outro"], ["Intro", "Verse", "Chorus", "Verse 2", "Bridge", "Chorus", "Outro"]]
      : ["pop", "disco", "dance", "country"].includes(style.id)
        ? [["Intro", "Verse", "Pre", "Chorus", "Verse 2", "Chorus", "Bridge", "Final", "Outro"], ["Intro", "A", "B", "A2", "B2", "Bridge", "Final", "Outro"]]
        : [["Intro", "A", "B", "A2", "Bridge", "B2", "Outro"], ["Intro", "Theme", "Lift", "Theme 2", "Space", "Final", "Outro"]];
  const names = songForms[(id + Math.round(mood.energy * 10)) % songForms.length];
  const minimum = names.length * 4;
  let remaining = Math.max(0, total - minimum);
  const rawWeights = names.map((name, index) => name === "Intro" || name === "Outro" || name === "Tag" || name === "Pickup" ? 0.45 : name.includes("Bridge") || name.includes("Breakdown") || name === "Space" || name === "Trading" ? 0.78 : 1 + ((id + index * 3) % 4) * 0.08);
  const weightTotal = rawWeights.reduce((sum, value) => sum + value, 0);
  const bars = rawWeights.map((weight) => 4 + Math.floor((remaining * weight / weightTotal) / 4) * 4);
  remaining = total - bars.reduce((sum, value) => sum + value, 0);
  let cursor = (id * 3) % names.length;
  while (remaining >= 4) { bars[cursor] += 4; remaining -= 4; cursor = (cursor + 2) % names.length; }
  let start = 0;
  return names.map((name, index) => { const section = { name, bars: bars[index], start, tone: SECTION_TONES[(index + id) % SECTION_TONES.length] }; start += bars[index]; return section });
}
function generateArrangement(styleId: string, moodId: string, bpmValue: number, autoTempo: boolean, drums: DrumData, steps: number, id: number): Arrangement {
  const style = styleId === "auto" ? inferStyle(drums, steps) : STYLES.find((s) => s.id === styleId) ?? STYLES[0];
  const mood = moodId === "auto" ? inferMood(drums) : MOODS.find((m) => m.id === moodId) ?? MOODS[0];
  const mid = Math.round((style.bpm[0] + style.bpm[1]) / 2), suggested = Math.round(mid * (0.82 + mood.energy * 0.32));
  const bpm = autoTempo ? Math.round(Math.max(style.bpm[0], Math.min(style.bpm[1], suggested)) / 5) * 5 : Math.round(bpmValue / 5) * 5;
  const mode: "major" | "minor" = mood.valence < 0.43 || mood.tension > 0.72 ? "minor" : "major";
  const keyIndex = (id * 5 + Math.round(mood.energy * 7)) % 12, rootMidi = 48 + keyIndex, totalBars = Math.max(48, Math.round(180 / (240 / bpm) / 4) * 4);
  const voicing = style.keySound === "ep" ? "电钢琴" : style.keySound === "organ" ? "风琴" : style.keySound === "pad" ? "氛围合成器" : "钢琴";
  const guitar = style.guitarSound === "drive" ? "失真吉他" : style.guitarSound === "muted" ? "闷音吉他" : style.guitarSound === "acoustic" ? "原声吉他" : "清音吉他";
  const sourceDrums = Object.fromEntries(Object.entries(drums).map(([lane, values]) => [lane, [...values]])) as DrumData;
  return { id, style, mood, bpm, mode, keyName: `${KEY_NAMES[keyIndex]} ${mode}`, rootMidi, progression: style.progression, totalBars, totalSeconds: totalBars * 240 / bpm, sections: buildSections(totalBars, style, mood, id), summary: `${voicing}、${guitar}与 Bass 会围绕你的 Kick 和留白编排`, sourceDrums };
}
function countLabel(step: number, steps: number) { const q = steps / 4, pos = step % q, beat = Math.floor(step / q) + 1; if (pos === 0) return String(beat); if (steps === 8) return "&"; if (steps === 12) return pos === 1 ? "tri" : "plet"; if (steps === 24) return ["ta", "la", "&", "ta", "la"][pos - 1] ?? "·"; return ["e", "&", "a"][pos - 1] ?? "·" }
function formatTime(seconds: number) { const value = Math.max(0, Math.round(seconds)); return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}` }
function noteFrequency(midi: number) { return 440 * Math.pow(2, (midi - 69) / 12) }
function envelope(gain: GainNode, time: number, peak: number, attack: number, release: number) { gain.gain.setValueAtTime(0.0001, time); gain.gain.linearRampToValueAtTime(peak, time + attack); gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + release) }
function tone(context: AudioContext, output: AudioNode, midi: number, time: number, duration: number, type: OscillatorType, volume: number, cutoff = 1800) {
  const oscillator = context.createOscillator(), filter = context.createBiquadFilter(), gain = context.createGain(); oscillator.type = type; oscillator.frequency.setValueAtTime(noteFrequency(midi), time); filter.type = "lowpass"; filter.frequency.setValueAtTime(cutoff, time); envelope(gain, time, volume, Math.min(0.025, duration * 0.15), Math.max(0.05, duration)); oscillator.connect(filter).connect(gain).connect(output); oscillator.start(time); oscillator.stop(time + duration + 0.08);
}
function musicalEnvelope(gain: GainNode, time: number, peak: number, attack: number, decay: number, sustain: number, duration: number, release: number) {
  const attackEnd = time + attack, decayEnd = attackEnd + decay, sustainEnd = Math.max(decayEnd, time + duration);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(peak, attackEnd);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sustain), decayEnd);
  gain.gain.setValueAtTime(Math.max(0.0001, peak * sustain), sustainEnd);
  gain.gain.exponentialRampToValueAtTime(0.0001, sustainEnd + release);
  return sustainEnd + release;
}
function clamp(value: number, minimum: number, maximum: number) { return Math.max(minimum, Math.min(maximum, value)) }
function stereoPan(context: AudioContext, output: AudioNode, midi: number, width = 0.34) {
  const panner = context.createStereoPanner();
  panner.pan.value = clamp((midi - 64) / 22 * width, -width, width);
  panner.connect(output);
  return panner;
}
function transientNoise(context: AudioContext, output: AudioNode, time: number, duration: number, frequency: number, volume: number, type: BiquadFilterType = "bandpass") {
  const length = Math.max(8, Math.ceil(context.sampleRate * duration)), buffer = context.createBuffer(1, length, context.sampleRate), data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
  const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
  source.buffer = buffer; filter.type = type; filter.frequency.value = frequency; filter.Q.value = 1.1; gain.gain.value = volume;
  source.connect(filter).connect(gain).connect(output); source.start(time);
}
function keyVoice(context: AudioContext, output: AudioNode, midi: number, time: number, duration: number, style: Style, mood: Mood, volume: number) {
  const frequency = noteFrequency(midi), voice = context.createGain(), filter = context.createBiquadFilter(), panner = stereoPan(context, output, midi, style.keySound === "pad" ? 0.5 : 0.38);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(style.id === "dance" ? 2800 + mood.energy * 1100 : style.keySound === "pad" ? 1500 + mood.energy * 900 : style.keySound === "organ" ? 5200 : style.keySound === "ep" ? 4400 : 6500 + mood.energy * 1700, time);
  filter.Q.value = style.keySound === "ep" ? 0.7 : 0.35;
  voice.connect(filter).connect(panner);

  if (style.keySound === "piano") {
    voice.gain.value = 1;
    const brightness = clamp(1.12 - (midi - 48) * 0.006, 0.74, 1.08);
    const ratios = [1, 1.0009, 2.004, 3.011, 4.021, 5.034, 6.052, 8.086];
    const levels = [0.72, 0.34, 0.36, 0.19, 0.11, 0.065, 0.038, 0.02];
    ratios.forEach((ratio, index) => {
      const oscillator = context.createOscillator(), partial = context.createGain();
      oscillator.type = index < 2 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency * ratio, time);
      oscillator.detune.value = index === 0 ? -0.45 : index === 1 ? 0.55 : (index % 2 ? 0.7 : -0.35) * index;
      const partialDuration = Math.max(0.16, duration * (1 - index * 0.055));
      const end = musicalEnvelope(partial, time, volume * levels[index] * (index < 2 ? 1 : brightness), 0.0015 + index * 0.00045, 0.075 + index * 0.035, index < 2 ? 0.2 : 0.012, partialDuration, 0.34 + (7 - index) * 0.035);
      oscillator.connect(partial).connect(voice); oscillator.start(time); oscillator.stop(end + 0.03);
    });
    const soundboard = context.createOscillator(), soundboardGain = context.createGain();
    soundboard.type = "sine"; soundboard.frequency.value = frequency * (midi < 60 ? 0.5 : 1);
    const soundboardEnd = musicalEnvelope(soundboardGain, time, volume * 0.07, 0.008, 0.2, 0.06, duration + 0.18, 0.55);
    soundboard.connect(soundboardGain).connect(voice); soundboard.start(time); soundboard.stop(soundboardEnd + 0.03);
    transientNoise(context, filter, time, 0.026, clamp(1500 + frequency * 2.6, 1700, 4700), volume * (0.18 + mood.energy * 0.08));
    return;
  }

  if (style.keySound === "ep") {
    const carrier = context.createOscillator(), modulator = context.createOscillator(), modulation = context.createGain(), tine = context.createOscillator(), tineGain = context.createGain(), fundamental = context.createOscillator(), fundamentalGain = context.createGain();
    carrier.type = "sine"; carrier.frequency.setValueAtTime(frequency, time);
    modulator.type = "sine"; modulator.frequency.setValueAtTime(frequency * 2.002, time); modulation.gain.setValueAtTime(frequency * (0.7 + mood.energy * 0.22), time); modulation.gain.exponentialRampToValueAtTime(0.001, time + 0.38 + mood.tension * 0.18);
    tine.type = "sine"; tine.frequency.setValueAtTime(frequency * 3.995, time); fundamental.type = "triangle"; fundamental.frequency.setValueAtTime(frequency * 0.5, time);
    const end = musicalEnvelope(voice, time, volume, 0.003, 0.17, 0.32, duration, 0.38);
    musicalEnvelope(tineGain, time, volume * 0.16, 0.0015, 0.075, 0.025, Math.min(duration, 0.3), 0.18);
    musicalEnvelope(fundamentalGain, time, volume * 0.1, 0.006, 0.22, 0.18, duration, 0.3);
    modulator.connect(modulation).connect(carrier.frequency); carrier.connect(voice); tine.connect(tineGain).connect(filter); fundamental.connect(fundamentalGain).connect(filter);
    carrier.start(time); modulator.start(time); tine.start(time); fundamental.start(time); carrier.stop(end + 0.03); modulator.stop(end + 0.03); tine.stop(end + 0.03); fundamental.stop(end + 0.03); return;
  }

  const isPad = style.keySound === "pad", isOrgan = style.keySound === "organ";
  const ratios = isOrgan ? [0.5, 1, 1.498, 2, 3, 4] : [0.996, 1, 1.004];
  const levels = isOrgan ? [0.18, 0.76, 0.12, 0.31, 0.12, 0.055] : [0.32, 0.44, 0.3];
  const danceStab = style.id === "dance";
  const end = musicalEnvelope(voice, time, volume, danceStab ? 0.008 : isPad ? 0.2 : 0.012, danceStab ? 0.075 : isPad ? 0.28 : 0.055, danceStab ? 0.16 : isPad ? 0.72 : 0.86, duration, danceStab ? 0.11 : isPad ? 0.78 : 0.14);
  ratios.forEach((ratio, index) => {
    const oscillator = context.createOscillator(), partial = context.createGain();
    oscillator.type = isPad ? (index === 1 ? "triangle" : "sawtooth") : "sine";
    oscillator.frequency.setValueAtTime(frequency * ratio, time); oscillator.detune.value = isPad ? (index - 1) * 5.5 : index * 0.32;
    partial.gain.value = levels[index]; oscillator.connect(partial).connect(voice); oscillator.start(time); oscillator.stop(end + 0.03);
  });
  if (isOrgan) {
    const rotary = context.createOscillator(), rotaryDepth = context.createGain(); rotary.frequency.value = 5.2 + mood.energy * 1.3; rotaryDepth.gain.value = 0.11 + mood.energy * 0.05;
    rotary.connect(rotaryDepth).connect(panner.pan); rotary.start(time); rotary.stop(end + 0.03);
  }
}

type StringModel = "steel" | "nylon" | "clean" | "drive" | "muted" | "palm" | "upright";
type BassArticulation = "finger" | "slap" | "pop";
const stringBufferCache = new Map<string, AudioBuffer>();
function modeledStringBuffer(context: AudioContext, midi: number, model: StringModel, variant: number) {
  const key = `${context.sampleRate}:${model}:${midi}:${variant}`, cached = stringBufferCache.get(key); if (cached) return cached;
  const frequency = noteFrequency(midi), sampleRate = context.sampleRate, muted = model === "muted" || model === "palm", palm = model === "palm", upright = model === "upright";
  const seconds = palm ? 0.27 : muted ? 0.34 : upright ? 1.9 : model === "drive" ? 1.25 : 1.7, length = Math.ceil(sampleRate * seconds), exactPeriod = sampleRate / frequency, period = Math.max(2, Math.round(exactPeriod));
  const buffer = context.createBuffer(1, length, sampleRate), data = buffer.getChannelData(0);
  const pickPosition = palm ? 0.09 : model === "nylon" ? 0.24 : model === "steel" ? 0.18 : model === "drive" ? 0.12 : upright ? 0.31 : 0.2;
  const pickDelay = Math.max(1, Math.round(period * pickPosition)), damping = palm ? 0.855 : muted ? 0.885 : upright ? 0.992 : model === "nylon" ? 0.988 : model === "steel" ? 0.986 : model === "drive" ? 0.978 : 0.984;
  for (let i = 0; i < Math.min(period + pickDelay, length); i += 1) {
    const raw = Math.random() * 2 - 1, comb = i >= pickDelay ? data[i - pickDelay] * 0.72 : 0;
    data[i] = (raw - comb) * (0.82 + variant * 0.04);
  }
  for (let i = period; i < length; i += 1) {
    const average = 0.5 * (data[i - period] + data[i - period + 1]);
    const dispersion = (data[i - period] - data[i - period + 1]) * (upright ? 0.018 : model === "steel" ? 0.012 : 0.007);
    data[i] = damping * (average + dispersion);
  }
  if (stringBufferCache.size >= 96) stringBufferCache.delete(stringBufferCache.keys().next().value as string);
  stringBufferCache.set(key, buffer);
  return buffer;
}
function pluckedString(context: AudioContext, output: AudioNode, midi: number, time: number, duration: number, style: Style, mood: Mood, volume: number, variant = 0, palmMuted = false) {
  const muted = style.guitarSound === "muted" || style.id === "reggae" || palmMuted, driven = style.guitarSound === "drive";
  const model: StringModel = palmMuted ? "palm" : muted ? "muted" : driven ? "drive" : style.guitarSound === "acoustic" ? (style.id === "bossa" ? "nylon" : "steel") : "clean";
  const buffer = modeledStringBuffer(context, midi, model, variant % 2), frequency = noteFrequency(midi), exactPeriod = context.sampleRate / frequency, integerPeriod = Math.max(2, Math.round(exactPeriod));
  const source = context.createBufferSource(), highpass = context.createBiquadFilter(), bodyLow = context.createBiquadFilter(), bodyHigh = context.createBiquadFilter(), presence = context.createBiquadFilter(), gain = context.createGain(), panner = stereoPan(context, output, midi, driven ? 0.55 : 0.46);
  if (driven) panner.pan.value = variant % 2 ? 0.42 : -0.42;
  source.buffer = buffer; source.playbackRate.value = integerPeriod / exactPeriod; source.detune.value = variant % 2 ? 1.6 : -1.2;
  highpass.type = "highpass"; highpass.frequency.value = driven ? 88 : model === "nylon" ? 62 : 72;
  bodyLow.type = "peaking"; bodyLow.frequency.value = palmMuted ? 285 : model === "nylon" ? 185 : model === "steel" ? 215 : driven ? 690 : 420; bodyLow.Q.value = model === "nylon" || model === "steel" ? 1.25 : 0.78; bodyLow.gain.value = palmMuted ? 5.2 : model === "nylon" ? 4.8 : model === "steel" ? 4.2 : driven ? 1.8 : 1.4;
  bodyHigh.type = "peaking"; bodyHigh.frequency.value = palmMuted ? 920 : model === "nylon" ? 410 : model === "steel" ? 540 : driven ? 1380 : 980; bodyHigh.Q.value = 1.15; bodyHigh.gain.value = palmMuted ? 3.6 : model === "nylon" ? 2.8 : model === "steel" ? 3.2 : driven ? 2.1 : 1.2;
  presence.type = "peaking"; presence.frequency.value = palmMuted ? 1850 : driven ? 2100 : model === "steel" ? 3500 : model === "nylon" ? 2600 : 2800; presence.Q.value = 1.05; presence.gain.value = palmMuted ? 2.8 + mood.energy : muted ? -2.5 : 2.2 + mood.energy * 1.5;
  const end = musicalEnvelope(gain, time, volume * (palmMuted ? 1.12 : 1), 0.0012, palmMuted ? 0.018 : muted ? 0.022 : 0.075, palmMuted ? 0.012 : muted ? 0.025 : 0.38 + mood.valence * 0.2, duration, palmMuted ? 0.025 : muted ? 0.035 : 0.2);
  source.connect(highpass).connect(bodyLow).connect(bodyHigh).connect(presence).connect(gain).connect(panner); source.start(time); source.stop(Math.min(time + buffer.duration, end + 0.03));
  transientNoise(context, bodyHigh, time, palmMuted ? 0.013 : muted ? 0.009 : 0.016, model === "nylon" ? 1250 : palmMuted ? 2100 : driven ? 2300 : 3200, volume * (palmMuted ? 0.22 : muted ? 0.13 : 0.08));
}
function bassVoice(context: AudioContext, output: AudioNode, midi: number, time: number, duration: number, style: Style, mood: Mood, volume: number, passing: boolean, articulation: BassArticulation = "finger") {
  const upright = ["jazz", "bossa", "blues"].includes(style.id), synth = style.id === "hiphop" || style.id === "dance", slap = articulation === "slap", pop = articulation === "pop", picked = ["rock", "hard-rock", "metal", "country"].includes(style.id), frequency = noteFrequency(midi);
  const panner = stereoPan(context, output, midi, 0.08), filter = context.createBiquadFilter(), body = context.createBiquadFilter(), gain = context.createGain();
  filter.type = "lowpass"; filter.frequency.setValueAtTime(synth ? (style.id === "dance" ? 620 : 330) : pop ? 2300 : slap ? 1750 : picked ? 1050 : upright ? 680 : 760, time); filter.Q.value = slap || pop ? 3.2 : synth ? 1.4 : 0.8;
  if (slap || pop) filter.frequency.exponentialRampToValueAtTime(pop ? 720 : 580, time + 0.095);
  body.type = "peaking"; body.frequency.value = upright ? 155 : picked ? 240 : 110; body.Q.value = 0.9; body.gain.value = upright ? 4.5 : synth ? 3 : 2;
  filter.connect(body).connect(gain).connect(panner);
  if (upright) {
    const source = context.createBufferSource(), exactPeriod = context.sampleRate / frequency, integerPeriod = Math.max(2, Math.round(exactPeriod)); source.buffer = modeledStringBuffer(context, midi, "upright", passing ? 1 : 0); source.playbackRate.value = integerPeriod / exactPeriod;
    const end = musicalEnvelope(gain, time, volume * 1.16, 0.002, 0.11, 0.3, duration, 0.24); source.connect(filter); source.start(time); source.stop(Math.min(time + source.buffer.duration, end + 0.03));
    transientNoise(context, filter, time, 0.018, 780, volume * 0.08); return;
  }
  const fundamental = context.createOscillator(), color = context.createOscillator(), fundamentalGain = context.createGain(), colorGain = context.createGain();
  fundamental.type = "sine"; fundamental.frequency.setValueAtTime(frequency * (synth ? 1.012 : 1), time); if (synth) fundamental.frequency.exponentialRampToValueAtTime(frequency, time + 0.055);
  color.type = synth ? "triangle" : slap || pop || picked ? "sawtooth" : "triangle"; color.frequency.setValueAtTime(frequency * (pop ? 3 : slap ? 2 : 1), time);
  const end = musicalEnvelope(gain, time, volume * (pop ? 0.88 : 1), synth ? 0.012 : 0.003, synth ? 0.24 : pop ? 0.035 : slap ? 0.055 : 0.12, synth ? 0.72 : pop ? 0.1 : slap ? 0.2 : 0.48, duration, synth ? 0.34 : 0.16);
  fundamentalGain.gain.value = synth ? 0.94 : pop ? 0.42 : 0.74; colorGain.gain.value = synth ? 0.22 : pop ? 0.55 : slap ? 0.46 : picked ? 0.32 : 0.24;
  fundamental.connect(fundamentalGain).connect(filter); color.connect(colorGain).connect(filter); fundamental.start(time); color.start(time); fundamental.stop(end + 0.03); color.stop(end + 0.03);
  transientNoise(context, filter, time, pop ? 0.018 : slap ? 0.024 : picked ? 0.014 : 0.01, pop ? 3100 : slap ? 2200 : picked ? 1200 : 720, volume * (pop ? 0.34 : slap ? 0.28 : picked ? 0.11 : 0.055));
}
function impulseResponse(context: AudioContext, duration: number, decay: number) {
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const values = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) values[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return buffer;
}
function distortionCurve(amount: number) {
  const samples = 2048, curve = new Float32Array(samples), drive = 1 + Math.max(0, amount) * 18, normalizer = Math.tanh(drive);
  for (let i = 0; i < samples; i += 1) { const x = i * 2 / (samples - 1) - 1; curve[i] = Math.tanh(x * drive) / normalizer; }
  return curve;
}
function threeBandEq(context: AudioContext, curve: [number, number, number], frequencies: [number, number, number], moodFx: MoodFx) {
  const low = context.createBiquadFilter(), mid = context.createBiquadFilter(), high = context.createBiquadFilter();
  low.type = "lowshelf"; low.frequency.value = frequencies[0]; low.gain.value = curve[0];
  mid.type = "peaking"; mid.frequency.value = frequencies[1]; mid.Q.value = 0.9; mid.gain.value = curve[1] + Math.max(0, moodFx.drive - 1) * 2.2;
  high.type = "highshelf"; high.frequency.value = frequencies[2]; high.gain.value = curve[2] + (moodFx.brightness - 1) * 8;
  low.connect(mid).connect(high);
  return { input: low, output: high, nodes: [low, mid, high] };
}
function createStyleBuses(context: AudioContext, master: GainNode, arrangement: Arrangement): StyleBuses {
  const { style, mood } = arrangement;
  const heavy = ["rock", "hard-rock", "metal"].includes(style.id), mix = STYLE_MIXES[style.id] ?? STYLE_MIXES.pop, profile = STYLE_FX[style.id] ?? STYLE_FX.pop, moodFx = MOOD_FX[mood.id] ?? MOOD_FX.happy, eq = STYLE_EQS[style.id] ?? STYLE_EQS.pop;
  const drumIn = context.createGain(), drumEq = threeBandEq(context, eq.drums, [95, 1250, 6200], moodFx), drumComp = context.createDynamicsCompressor();
  drumIn.gain.value = mix.drums * (0.94 + mood.energy * 0.08);
  drumComp.threshold.value = profile.drumThreshold; drumComp.ratio.value = clamp(profile.drumRatio * moodFx.compression, 1.5, 12); drumComp.attack.value = heavy || style.id === "dance" ? 0.0025 : style.id === "jazz" || style.id === "bossa" ? 0.014 : 0.007; drumComp.release.value = style.id === "hiphop" ? 0.24 : style.id === "dance" ? 0.085 : 0.12;
  drumIn.connect(drumEq.input); drumEq.output.connect(drumComp).connect(master);

  const bassIn = context.createGain(), bassEq = threeBandEq(context, eq.bass, [82, 720, 2800], moodFx), bassTone = context.createBiquadFilter(), bassColor = context.createWaveShaper(), bassComp = context.createDynamicsCompressor();
  bassIn.gain.value = mix.bass;
  bassTone.type = "lowpass"; bassTone.Q.value = profile.bassQ; bassTone.frequency.value = clamp(profile.bassCutoff * moodFx.brightness, 260, 1900);
  bassColor.curve = distortionCurve(profile.bassDrive * moodFx.drive); bassColor.oversample = "2x";
  bassComp.threshold.value = -20 - Math.max(0, moodFx.compression - 1) * 5; bassComp.ratio.value = clamp(profile.bassRatio * moodFx.compression, 1.6, 10); bassComp.attack.value = style.id === "funk" ? 0.003 : heavy || style.id === "dance" ? 0.008 : 0.018; bassComp.release.value = style.id === "funk" ? 0.1 : style.id === "dance" ? 0.12 : 0.18;
  bassIn.connect(bassEq.input); bassEq.output.connect(bassTone).connect(bassColor).connect(bassComp).connect(master);

  const reverb = context.createConvolver(), reverbWet = context.createGain();
  reverb.buffer = impulseResponse(context, clamp(profile.roomSeconds + mood.tension * 0.55, 0.42, 3.7), profile.roomDecay);
  reverbWet.gain.value = clamp(profile.roomWet * moodFx.room, 0.025, 0.46);
  reverb.connect(reverbWet).connect(master);

  const keysIn = context.createGain(), keysHighpass = context.createBiquadFilter(), keysEq = threeBandEq(context, eq.keys, [190, 1350, 5100], moodFx), keysTone = context.createBiquadFilter(), keysColor = context.createWaveShaper(), keysComp = context.createDynamicsCompressor(), keysDry = context.createGain(), keysSend = context.createGain();
  keysIn.gain.value = mix.keys * (1.02 - mood.energy * 0.05);
  keysHighpass.type = "highpass"; keysHighpass.frequency.value = style.keySound === "pad" ? 105 : 72;
  keysTone.type = "lowpass"; keysTone.frequency.value = clamp(profile.keysCutoff * moodFx.brightness, 1200, 9000);
  keysColor.curve = distortionCurve(profile.keysDrive * moodFx.drive); keysColor.oversample = "2x";
  keysComp.threshold.value = -19 - Math.max(0, moodFx.compression - 1) * 6; keysComp.ratio.value = clamp(profile.keysRatio * moodFx.compression, 1.5, 9); keysComp.attack.value = style.keySound === "piano" ? 0.018 : style.id === "dance" ? 0.004 : 0.008; keysComp.release.value = style.id === "dance" ? 0.12 : style.keySound === "pad" ? 0.38 : 0.2;
  keysDry.gain.value = style.id === "neo-soul" ? 0.72 : style.id === "dance" ? 0.68 : style.keySound === "pad" ? 0.76 : 0.84; keysSend.gain.value = profile.keysRoom;
  keysIn.connect(keysHighpass).connect(keysEq.input); keysEq.output.connect(keysTone).connect(keysColor).connect(keysComp); keysComp.connect(keysDry).connect(master); keysComp.connect(keysSend).connect(reverb);

  const guitarIn = context.createGain(), guitarHighpass = context.createBiquadFilter(), guitarDrive = context.createWaveShaper(), guitarEq = threeBandEq(context, eq.guitar, [145, 1150, 4300], moodFx), guitarCab = context.createBiquadFilter(), guitarComp = context.createDynamicsCompressor(), guitarDry = context.createGain(), guitarSend = context.createGain();
  guitarIn.gain.value = mix.guitar * (0.96 + mood.energy * 0.06);
  guitarHighpass.type = "highpass"; guitarHighpass.frequency.value = heavy ? 82 : style.guitarSound === "acoustic" ? 68 : 92;
  guitarDrive.curve = distortionCurve(profile.guitarDrive * moodFx.drive); guitarDrive.oversample = "4x";
  guitarCab.type = "lowpass"; guitarCab.frequency.value = clamp(profile.guitarCab * moodFx.brightness, 2600, 8400);
  guitarCab.Q.value = heavy ? 0.72 : 0.45;
  guitarComp.threshold.value = heavy ? -27 : -19 - Math.max(0, moodFx.compression - 1) * 5; guitarComp.ratio.value = clamp(profile.guitarRatio * moodFx.compression, 1.5, 12); guitarComp.attack.value = heavy ? 0.0025 : style.id === "funk" || style.id === "dance" ? 0.006 : 0.012; guitarComp.release.value = style.id === "funk" ? 0.075 : heavy ? 0.11 : 0.2;
  guitarDry.gain.value = style.id === "metal" ? 0.72 : heavy ? 0.64 : style.id === "neo-soul" ? 0.7 : style.guitarSound === "acoustic" ? 0.88 : 0.76; guitarSend.gain.value = profile.guitarRoom;
  guitarIn.connect(guitarHighpass).connect(guitarDrive).connect(guitarEq.input); guitarEq.output.connect(guitarCab).connect(guitarComp); guitarComp.connect(guitarDry).connect(master); guitarComp.connect(guitarSend).connect(reverb);

  const delay = context.createDelay(1.5), guitarDelaySend = context.createGain(), keysDelaySend = context.createGain(), delayWet = context.createGain(), feedback = context.createGain();
  delay.delayTime.value = 60 / arrangement.bpm * profile.delayBeat;
  guitarDelaySend.gain.value = profile.guitarDelay; keysDelaySend.gain.value = profile.keysDelay;
  delayWet.gain.value = clamp(profile.delayWet * moodFx.delay, 0.025, 0.38); feedback.gain.value = clamp(profile.feedback + mood.tension * 0.08, 0.06, 0.58);
  guitarComp.connect(guitarDelaySend).connect(delay); keysComp.connect(keysDelaySend).connect(delay); delay.connect(delayWet).connect(master); delay.connect(feedback).connect(delay);
  const signature = `${style.id}:${mood.id}:${arrangement.bpm}:${arrangement.id}`;
  return { signature, drums: drumIn, bass: bassIn, keys: keysIn, guitar: guitarIn, nodes: [drumIn, ...drumEq.nodes, drumComp, bassIn, ...bassEq.nodes, bassTone, bassColor, bassComp, reverb, reverbWet, keysIn, keysHighpass, ...keysEq.nodes, keysTone, keysColor, keysComp, keysDry, keysSend, guitarIn, guitarHighpass, guitarDrive, ...guitarEq.nodes, guitarCab, guitarComp, guitarDry, guitarSend, delay, guitarDelaySend, keysDelaySend, delayWet, feedback] };
}
function chordNotes(rootMidi: number, degree: number, mode: "major" | "minor", tension: number) {
  const scale = mode === "major" ? MAJOR : MINOR, root = rootMidi + scale[degree % 7], third = rootMidi + scale[(degree + 2) % 7] + (degree + 2 >= 7 ? 12 : 0), fifth = rootMidi + scale[(degree + 4) % 7] + (degree + 4 >= 7 ? 12 : 0), notes = [root + 12, third + 12, fifth + 12];
  if (tension > 0.28) notes.push(rootMidi + scale[(degree + 6) % 7] + (degree + 6 >= 7 ? 24 : 12)); return notes;
}

type RhythmProfile = { keys: [number[], number[]]; guitar: [number[], number[]] };
const RHYTHM_PROFILES: Record<string, RhythmProfile> = {
  pop: { keys: [[0, 2, 3.5], [0, 1.5, 2.5, 3.5]], guitar: [[0.5, 1.5, 2.5, 3.5], [0.5, 1, 1.5, 2.5, 3, 3.5]] },
  rock: { keys: [[0, 2], [0, 1, 2, 3]], guitar: [[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], [0, 0.5, 1, 2, 2.5, 3, 3.5]] },
  "hard-rock": { keys: [[0, 2], [0, 3]], guitar: [[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], [0, 0.5, 0.75, 1, 1.5, 2, 2.5, 2.75, 3, 3.5]] },
  metal: { keys: [[0], [0, 2]], guitar: [[0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75], [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75]] },
  funk: { keys: [[0, 0.75, 1.5, 2.25, 3.5], [0.5, 1.25, 1.75, 2.5, 3.25, 3.75]], guitar: [[0.25, 0.5, 0.75, 1.5, 1.75, 2.5, 3.25, 3.75], [0, 0.5, 1.25, 1.5, 2.25, 2.75, 3.5, 3.75]] },
  soul: { keys: [[0, 1.5, 2.5, 3.5], [0, 1.75, 2, 3.25]], guitar: [[0.5, 1.5, 2.75, 3.5], [0.75, 1.5, 2.5, 3.25]] },
  rnb: { keys: [[0, 1.75, 2.5], [0.5, 1.5, 3.25]], guitar: [[0.75, 1.5, 3.25], [0.5, 2.25, 3.5]] },
  "neo-soul": { keys: [[0, 0.75, 1.5, 2.75, 3.5], [0.5, 1.25, 2, 2.5, 3.25]], guitar: [[0.5, 1.25, 2.5, 3.25, 3.75], [0.25, 1, 1.75, 2.75, 3.5]] },
  country: { keys: [[0, 1, 2, 3], [0, 1, 1.5, 2, 3, 3.5]], guitar: [[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]] },
  blues: { keys: [[0, 1.5, 2.67, 3.5], [0, 0.67, 2, 2.67]], guitar: [[0, 0.67, 1.67, 2.67, 3.67], [0.67, 1.33, 2, 2.67, 3.33]] },
  jazz: { keys: [[0.67, 1.5, 2.67, 3.5], [0, 1.67, 2.33, 3.67]], guitar: [[0, 1.5, 2.67, 3.5], [0.67, 1.67, 2.33, 3.67]] },
  bossa: { keys: [[0, 0.75, 1.5, 2, 2.75, 3.5], [0, 1, 1.75, 2.5, 3.25]], guitar: [[0, 0.75, 1.5, 2, 2.75, 3.5], [0, 0.5, 1.5, 2, 2.5, 3.5]] },
  reggae: { keys: [[0.5, 1.5, 2.5, 3.5], [0.5, 1.5, 2.5, 3.5]], guitar: [[0.5, 1.5, 2.5, 3.5], [0.5, 1.5, 2.5, 3.5]] },
  disco: { keys: [[0.5, 1.5, 2.5, 3.5], [0.5, 1.5, 2.5, 3.5]], guitar: [[0.25, 0.5, 0.75, 1.25, 1.5, 1.75, 2.25, 2.5, 2.75, 3.25, 3.5, 3.75], [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]] },
  hiphop: { keys: [[0, 2.5], [0.75, 2, 3.5]], guitar: [[1.5, 3.25], [0.5, 2.75]] },
  dance: { keys: [[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], [0, 0.25, 0.75, 1, 1.5, 2, 2.25, 2.75, 3, 3.5]], guitar: [[0.5, 1.5, 2.5, 3.5], [0.5, 1.25, 1.5, 2.5, 3.25, 3.5]] },
};
function rhythmMatch(step: number, steps: number, positions: number[]) { const quarter = steps / 4; return positions.some((position) => Math.min(steps - 1, Math.round(position * quarter)) === step) }

type PickerOption = { value: string; label: string; detail?: string; color?: string };
function StyledSelect({ value, onValueChange, label, options, className = "" }: { value: string; onValueChange: (value: string) => void; label: string; options: PickerOption[]; className?: string }) {
  const selected = options.find((option) => option.value === value);
  return <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger aria-label={label} className={`jam-select-trigger ${className}`}><SelectValue>{selected?.label ?? label}</SelectValue></SelectTrigger>
    <SelectContent position="popper" align="start" sideOffset={6} className="jam-select-content">
      <SelectGroup>
        <SelectLabel>{label}</SelectLabel>
        {options.map((option) => <SelectItem value={option.value} key={option.value} className="jam-select-item">
          <span className="picker-dot" style={{ backgroundColor: option.color ?? "#c8f45a" }} />
          <span className="picker-copy"><b>{option.label}</b>{option.detail && <small>{option.detail}</small>}</span>
        </SelectItem>)}
      </SelectGroup>
    </SelectContent>
  </Select>;
}

export default function Home() {
  const [steps, setSteps] = useState(16), [preset, setPreset] = useState("basic"), [drums, setDrums] = useState<DrumData>(() => makePreset("basic", 16));
  const [doubles, setDoubles] = useState<DoubleData>(() => blankDoubles(16)), [doubleMode, setDoubleMode] = useState(false);
  const [styleId, setStyleId] = useState("auto"), [moodId, setMoodId] = useState("auto"), [bpm, setBpm] = useState(100), [autoTempo, setAutoTempo] = useState(true), [seed, setSeed] = useState(1);
  const [arrangement, setArrangement] = useState<Arrangement>(() => generateArrangement("auto", "auto", 100, true, makePreset("basic", 16), 16, 1));
  const [playing, setPlaying] = useState(false), [currentStep, setCurrentStep] = useState(-1), [elapsed, setElapsed] = useState(0), [countInBeat, setCountInBeat] = useState<number | null>(null), [mode, setMode] = useState<PracticeMode>("full"), [metronome, setMetronome] = useState(false);
  const [mixer, setMixer] = useState<Mixer>({ drums: true, bass: true, keys: true, guitar: true }), [message, setMessage] = useState("点击格子切换：常规 → 重音 → 鬼音 → 关闭");
  const audioRef = useRef<AudioContext | null>(null), masterRef = useRef<GainNode | null>(null), noiseRef = useRef<AudioBuffer | null>(null), timerRef = useRef<ReturnType<typeof setInterval> | null>(null), busesRef = useRef<StyleBuses | null>(null);
  const positionRef = useRef(0), countInStepRef = useRef(steps), nextTimeRef = useRef(0), mixerRef = useRef(mixer), modeRef = useRef(mode), metroRef = useRef(metronome), drumsRef = useRef(drums), doublesRef = useRef(doubles), resumeAfterSeekRef = useRef(false);
  useEffect(() => { mixerRef.current = mixer }, [mixer]); useEffect(() => { modeRef.current = mode }, [mode]); useEffect(() => { metroRef.current = metronome }, [metronome]); useEffect(() => { drumsRef.current = drums }, [drums]); useEffect(() => { doublesRef.current = doubles }, [doubles]);
  const currentBar = currentStep < 0 ? 0 : Math.floor(currentStep / steps), currentSection = arrangement.sections.find((s) => currentBar >= s.start && currentBar < s.start + s.bars) ?? arrangement.sections[0];
  const localStep = currentStep < 0 || countInBeat !== null ? -1 : currentStep % steps;

  const stop = useCallback((reset = false) => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; countInStepRef.current = steps; setCountInBeat(null); setPlaying(false); if (reset) { positionRef.current = 0; setCurrentStep(-1); setElapsed(0) } }, [steps]);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); void audioRef.current?.close() }, []);
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("./sw.js").catch(() => undefined);
  }, []);
  useEffect(() => {
    const raw = window.location.hash.slice(1);
    if (!raw) return;
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(decodeURIComponent(escape(atob(raw))));
        if (!saved.drums || !saved.steps) return;
        setSteps(saved.steps);
        setDrums(saved.drums);
        const loadedDoubles = saved.doubles ?? blankDoubles(saved.steps); setDoubles(loadedDoubles); doublesRef.current = loadedDoubles;
        setStyleId(saved.styleId ?? "auto");
        setMoodId(saved.moodId ?? "auto");
        setBpm(saved.bpm ?? 100);
        setAutoTempo(saved.autoTempo ?? true);
        setSeed(saved.seed ?? 1);
        setArrangement(generateArrangement(saved.styleId ?? "auto", saved.moodId ?? "auto", saved.bpm ?? 100, saved.autoTempo ?? true, saved.drums, saved.steps, saved.seed ?? 1));
        setMessage("已载入分享的节奏与编曲设置");
      } catch {
        setMessage("分享链接无法读取，已使用默认节奏");
      }
    });
  }, []);
  const ensureAudio = useCallback(async () => { if (!audioRef.current) { const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext; const context = new AudioCtor(), master = context.createGain(), compressor = context.createDynamicsCompressor(); master.gain.value = 0.68; compressor.threshold.value = -12; compressor.knee.value = 18; compressor.ratio.value = 5; compressor.attack.value = 0.004; compressor.release.value = 0.18; master.connect(compressor).connect(context.destination); audioRef.current = context; masterRef.current = master } await audioRef.current.resume(); return audioRef.current }, []);
  const getNoise = useCallback((context: AudioContext) => { if (!noiseRef.current || noiseRef.current.sampleRate !== context.sampleRate) { const buffer = context.createBuffer(1, context.sampleRate * 0.5, context.sampleRate), channel = buffer.getChannelData(0); for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1; noiseRef.current = buffer } return noiseRef.current }, []);
  const drumHit = useCallback((context: AudioContext, lane: LaneId, velocity: number, time: number, active: Arrangement) => {
    const output = busesRef.current?.drums; if (!output || !velocity) return; const strength = [0, 0.14, 0.36, 0.64][velocity], heavy = ["rock", "hard-rock", "metal"].includes(active.style.id), soft = ["jazz", "bossa", "soul"].includes(active.style.id);
    if (lane === "kick") {
      const oscillator = context.createOscillator(), clickOsc = context.createOscillator(), gain = context.createGain(), clickGain = context.createGain();
      const startPitch = active.style.id === "metal" ? 185 : active.style.id === "hiphop" ? 112 : 145, endPitch = active.style.id === "hiphop" ? 37 : heavy ? 52 : 44, decay = active.style.id === "hiphop" ? 0.32 : heavy ? 0.16 : 0.23;
      oscillator.frequency.setValueAtTime(startPitch, time); oscillator.frequency.exponentialRampToValueAtTime(endPitch, time + Math.min(0.14, decay * 0.7)); envelope(gain, time, strength * (active.style.id === "hiphop" ? 1.3 : 1.08), 0.002, decay);
      clickOsc.type = "triangle"; clickOsc.frequency.value = heavy ? 2100 : 900; envelope(clickGain, time, strength * (heavy ? 0.16 : 0.05), 0.001, 0.018);
      oscillator.connect(gain).connect(output); clickOsc.connect(clickGain).connect(output); oscillator.start(time); clickOsc.start(time); oscillator.stop(time + decay + 0.04); clickOsc.stop(time + 0.03); return;
    }
    if (lane === "rack" || lane === "floor") { const tuning = heavy ? 2 : soft ? -2 : 0; tone(context, output, (lane === "rack" ? 48 : 41) + tuning, time, heavy ? 0.16 : 0.24, "sine", strength * 0.48, heavy ? 1300 : 820); return; }
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain(); source.buffer = getNoise(context); filter.type = lane === "hat" || lane === "crash" ? "highpass" : "bandpass";
    filter.frequency.value = lane === "hat" ? (soft ? 5400 : 7200) : lane === "crash" ? (heavy ? 3600 : 4600) : active.style.id === "hiphop" ? 1250 : heavy ? 2200 : soft ? 1550 : 1800;
    const duration = lane === "crash" ? (heavy ? 0.72 : 0.52) : lane === "hat" ? (soft ? 0.09 : 0.045) : (soft ? 0.2 : heavy ? 0.11 : 0.15);
    envelope(gain, time, strength * (lane === "crash" ? 0.25 : lane === "hat" ? (soft ? 0.2 : 0.28) : (soft ? 0.34 : 0.48)), 0.001, duration); source.connect(filter).connect(gain).connect(output); source.start(time); source.stop(time + duration + 0.05);
  }, [getNoise]);
  const click = useCallback((context: AudioContext, time: number, accent: boolean) => { if (masterRef.current) tone(context, masterRef.current, accent ? 84 : 78, time, 0.035, "square", accent ? 0.07 : 0.045, 5000) }, []);
  const scheduleMusicStep = useCallback((context: AudioContext, globalStep: number, baseTime: number, active: Arrangement) => {
    const buses = busesRef.current; if (!buses) return; const liveDrums = drumsRef.current, backingDrums = active.sourceDrums, bar = Math.floor(globalStep / steps), step = globalStep % steps, quarter = steps / 4, beat = step / quarter, stepDuration = 60 / active.bpm / quarter;
    const swung = step % quarter === (steps === 12 ? 2 : quarter / 2), time = baseTime + (swung ? stepDuration * active.style.swing : 0), section = active.sections.find((s) => bar >= s.start && bar < s.start + s.bars) ?? active.sections[0], sectionIndex = active.sections.indexOf(section);
    const sectionEnergy = section.name === "Intro" || section.name === "Outro" ? 0.5 : section.name === "Final" ? 1 : section.name === "Bridge" ? 0.68 : 0.82, chordDegree = active.progression[Math.floor(bar / 2) % active.progression.length], notes = chordNotes(active.rootMidi, chordDegree, active.mode, active.mood.tension), scale = active.mode === "major" ? MAJOR : MINOR, bassRoot = active.rootMidi - 12 + scale[chordDegree % 7];
    const silent = modeRef.current === "alternate" && bar % 2 === 1, drumsOn = modeRef.current === "full" || (modeRef.current === "alternate" && !silent), onBeat = step % quarter === 0;
    if (mixerRef.current.drums && drumsOn) LANES.forEach((lane) => { const velocity = liveDrums[lane.id][step]; drumHit(context, lane.id, velocity, time, active); if (velocity && doublesRef.current[lane.id]?.[step]) drumHit(context, lane.id, Math.max(1, velocity - 1), time + Math.min(0.075, stepDuration * 0.46), active) });
    if ((metroRef.current || (modeRef.current === "alternate" && silent)) && step % quarter === 0) click(context, time, step === 0);
    if (mixerRef.current.bass && (backingDrums.kick[step] > 0 || step === 0 || (active.style.id === "reggae" && beat === 2)) && !(section.name === "Intro" && bar - section.start < 2)) {
      const passing = backingDrums.kick[step] === 1 || (bar + step + active.id) % 11 === 0;
      const bassDuration = stepDuration * (active.style.id === "funk" ? 1.25 : active.style.id === "hiphop" ? 4.1 : active.style.id === "dance" ? 3.4 : ["jazz", "bossa", "blues"].includes(active.style.id) ? 2.2 : 2.7);
      const bassVolume = (active.style.id === "hiphop" ? 0.2 : active.style.id === "dance" ? 0.18 : active.style.id === "funk" ? 0.155 : ["jazz", "bossa", "blues"].includes(active.style.id) ? 0.15 : ["rock", "hard-rock", "metal"].includes(active.style.id) ? 0.125 : 0.145) * sectionEnergy;
      const bassArticulation: BassArticulation = active.style.id !== "funk" ? "finger" : passing || (bar + step + active.id) % 7 === 0 ? "pop" : onBeat || backingDrums.kick[step] > 1 ? "slap" : "finger";
      bassVoice(context, buses.bass, bassRoot + (passing ? 2 : 0), time, bassDuration, active.style, active.mood, bassVolume, passing, bassArticulation);
    }
    const barInSection = bar - section.start;
    const profile = RHYTHM_PROFILES[active.style.id] ?? RHYTHM_PROFILES.pop, lifted = section.name.includes("Chorus") || section.name === "Final" || section.name === "Solo", variant = lifted ? 1 : (bar + sectionIndex + active.id) % 2 as 0 | 1;
    const keysPattern = profile.keys[variant], guitarPattern = profile.guitar[variant], humanize = ((bar * 7 + step * 3 + active.id) % 5 - 2) * 0.0015;
    const keysTrigger = rhythmMatch(step, steps, keysPattern) && !(section.name === "Intro" && barInSection < 1) && !(section.name === "Space" && bar % 2 === 1);
    if (mixerRef.current.keys && keysTrigger) {
      const shortKeys = ["funk", "reggae", "disco", "dance"].includes(active.style.id), syncopated = !onBeat || keysPattern.length > 4;
      const keyDuration = active.style.id === "dance" ? 0.24 : active.style.keySound === "pad" ? 60 / active.bpm * (2.5 + active.mood.tension * 0.8) : shortKeys ? 0.14 : active.style.id === "neo-soul" || active.style.id === "rnb" ? 0.52 : active.style.keySound === "organ" ? 0.72 : 0.68;
      const keyVolume = (active.style.keySound === "organ" ? 0.048 : active.style.keySound === "pad" ? 0.058 : active.style.keySound === "ep" ? 0.066 : 0.06) * sectionEnergy;
      const keyNotes = active.style.keySound === "pad" || active.style.keySound === "organ" || !syncopated || ["jazz", "bossa", "neo-soul"].includes(active.style.id) ? notes : [notes[(bar + step) % Math.min(3, notes.length)], notes[(bar + step + 1) % Math.min(3, notes.length)]];
      keyNotes.forEach((note, i) => keyVoice(context, buses.keys, note, time + humanize + i * (active.style.keySound === "piano" ? 0.013 : 0.005), keyDuration, active.style, active.mood, keyVolume / Math.sqrt(keyNotes.length)));
    }
    const heavyGuitar = ["metal", "hard-rock", "rock"].includes(active.style.id), guitarTrigger = (rhythmMatch(step, steps, guitarPattern) || (heavyGuitar && backingDrums.kick[step] > 0)) && !(section.name === "Intro" && barInSection < 2) && !(section.name === "Space" && bar % 2 === 1);
    if (mixerRef.current.guitar && guitarTrigger) {
      const drive = active.style.guitarSound === "drive", muted = active.style.guitarSound === "muted" || active.style.id === "reggae", acoustic = active.style.guitarSound === "acoustic", accent = onBeat || backingDrums.kick[step] > 1;
      const palmMuted = active.style.id === "metal" ? !(lifted && onBeat && (beat === 0 || beat === 2)) : active.style.id === "hard-rock" && !accent;
      const baseVolume = (drive ? (palmMuted ? 0.108 : 0.095) : muted ? 0.067 : acoustic ? 0.082 : 0.074) * sectionEnergy * (accent || palmMuted ? 1 : 0.78);
      const chordTop = notes.slice(0, 3), melodicNote = notes[(bar + step + sectionIndex) % Math.min(3, notes.length)];
      const guitarNotes = palmMuted ? [notes[0] - 12, notes[0] - 5] : drive ? (accent ? [notes[0] - 12, notes[0] - 5, notes[0]] : [notes[0] - 12]) : acoustic && onBeat ? [notes[0] - 12] : acoustic || muted || ["jazz", "bossa"].includes(active.style.id) ? chordTop : [melodicNote];
      const guitarDuration = palmMuted ? 0.082 : muted ? (active.style.id === "reggae" ? 0.11 : 0.085) : drive ? (accent ? 0.34 : 0.13) : acoustic ? (onBeat ? 0.42 : 0.68) : 0.5;
      guitarNotes.forEach((note, i) => pluckedString(context, buses.guitar, note, time + humanize + i * (drive ? 0.007 : acoustic ? 0.014 : 0.005), guitarDuration, active.style, active.mood, baseVolume / Math.sqrt(guitarNotes.length), bar + step + i, palmMuted));
    }
  }, [click, drumHit, steps]);
  const start = useCallback(async () => {
    const context = await ensureAudio(), master = masterRef.current;
    if (!master) return;
    const signature = `${arrangement.style.id}:${arrangement.mood.id}:${arrangement.bpm}:${arrangement.id}`;
    if (busesRef.current?.signature !== signature) {
      busesRef.current?.nodes.forEach((node) => node.disconnect());
      busesRef.current = createStyleBuses(context, master, arrangement);
    }
    if (positionRef.current >= arrangement.totalBars * steps) positionRef.current = 0;
    countInStepRef.current = 0;
    nextTimeRef.current = context.currentTime + 0.06;
    setCurrentStep(-1);
    setCountInBeat(1);
    setPlaying(true);
    const scheduler = () => {
      const total = arrangement.totalBars * steps, quarter = steps / 4, stepDuration = 60 / arrangement.bpm / quarter;
      while (nextTimeRef.current < context.currentTime + 0.13 && (countInStepRef.current < steps || positionRef.current < total)) {
        if (countInStepRef.current < steps) {
          const countStep = countInStepRef.current;
          if (countStep % quarter === 0) {
            const beat = Math.floor(countStep / quarter) + 1;
            click(context, nextTimeRef.current, beat === 1);
            setCountInBeat(beat);
          }
          countInStepRef.current += 1;
        } else {
          const scheduled = positionRef.current;
          scheduleMusicStep(context, scheduled, nextTimeRef.current, arrangement);
          setCountInBeat(null);
          setCurrentStep(scheduled);
          setElapsed(scheduled * stepDuration);
          positionRef.current += 1;
        }
        nextTimeRef.current += stepDuration;
      }
      if (countInStepRef.current >= steps && positionRef.current >= total) stop(true);
    };
    scheduler();
    timerRef.current = setInterval(scheduler, 25);
  }, [arrangement, click, ensureAudio, scheduleMusicStep, steps, stop]);
  const seekTo = useCallback((seconds: number) => {
    if (playing) { resumeAfterSeekRef.current = true; stop(false); }
    const safeSeconds = Math.max(0, Math.min(arrangement.totalSeconds, seconds));
    const stepDuration = 60 / arrangement.bpm / (steps / 4);
    const targetStep = Math.min(arrangement.totalBars * steps - 1, Math.floor(safeSeconds / stepDuration));
    positionRef.current = targetStep;
    setCurrentStep(targetStep);
    setElapsed(targetStep * stepDuration);
  }, [arrangement, playing, steps, stop]);
  const commitSeek = useCallback(() => { if (resumeAfterSeekRef.current) { resumeAfterSeekRef.current = false; void start(); } }, [start]);
  const generate = useCallback(() => { stop(true); let source = drums; if (drumDensity(source) === 0) { const selected = styleId === "auto" ? "basic" : ["funk", "neo-soul"].includes(styleId) ? "funk" : ["jazz", "blues"].includes(styleId) ? "shuffle" : ["disco", "dance"].includes(styleId) ? "disco" : "basic"; source = makePreset(selected, steps); drumsRef.current = source; setDrums(source); setPreset(selected) } const nextSeed = seed + 1, next = generateArrangement(styleId, moodId, bpm, autoTempo, source, steps, nextSeed); setSeed(nextSeed); setArrangement(next); if (autoTempo) setBpm(next.bpm); setMessage(`已生成 ${next.style.label} × ${next.mood.label}，${next.totalBars} 小节`) }, [autoTempo, bpm, drums, moodId, seed, steps, stop, styleId]);
  const changeCell = (lane: LaneId, step: number) => {
    if (doubleMode) {
      setDrums((current) => { if (current[lane][step]) return current; const next = Object.fromEntries(Object.entries(current).map(([key, values]) => [key, [...values]])) as DrumData; next[lane][step] = 2; drumsRef.current = next; return next });
      setDoubles((current) => { const next = Object.fromEntries(Object.entries(current).map(([key, values]) => [key, [...values]])) as DoubleData; next[lane][step] = !next[lane][step]; doublesRef.current = next; setMessage(next[lane][step] ? `已为${LANES.find((item) => item.id === lane)?.name}第 ${step + 1} 格添加 Double` : `已取消第 ${step + 1} 格的 Double`); return next });
      return;
    }
    setDrums((current) => { const next = Object.fromEntries(Object.entries(current).map(([key, values]) => [key, [...values]])) as DrumData; const value = next[lane][step]; next[lane][step] = value === 0 ? 2 : value === 2 ? 3 : value === 3 ? 1 : 0; if (next[lane][step] === 0 && doublesRef.current[lane][step]) setDoubles((currentDoubles) => { const nextDoubles = Object.fromEntries(Object.entries(currentDoubles).map(([key, values]) => [key, [...values]])) as DoubleData; nextDoubles[lane][step] = false; doublesRef.current = nextDoubles; return nextDoubles }); drumsRef.current = next; return next });
  };
  const resetDoubles = (value: number) => { const next = blankDoubles(value); doublesRef.current = next; setDoubles(next) };
  const changeDivision = (value: number) => { stop(true); setSteps(value); const next = makePreset(preset, value); drumsRef.current = next; setDrums(next); resetDoubles(value); setArrangement(generateArrangement(styleId, moodId, bpm, autoTempo, next, value, seed)) };
  const changePreset = (value: string) => { stop(true); setPreset(value); const next = makePreset(value, steps); drumsRef.current = next; setDrums(next); resetDoubles(steps) };
  const share = async () => { const hash = btoa(unescape(encodeURIComponent(JSON.stringify({ drums, doubles, steps, styleId, moodId, bpm, autoTempo, seed })))); window.history.replaceState(null, "", `#${hash}`); try { await navigator.clipboard.writeText(window.location.href); setMessage("分享链接已复制") } catch { setMessage("设置已写入地址栏，可以复制当前网址分享") } };
  const downloadProject = () => { const blob = new Blob([JSON.stringify({ version: 2, name: "Jam Lab Project", createdAt: new Date().toISOString(), drums, doubles, steps, settings: { styleId, moodId, bpm, autoTempo, seed }, arrangement }, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `jam-lab-${arrangement.style.id}-${arrangement.bpm}bpm.json`; link.click(); URL.revokeObjectURL(url); setMessage("工程文件已下载") };
  const inferredText = useMemo(() => { const pieces = []; if (styleId === "auto") pieces.push(`风格推测为 ${arrangement.style.label}`); if (moodId === "auto") pieces.push(`情绪推测为${arrangement.mood.label}`); if (autoTempo) pieces.push(`速度推测为 ${arrangement.bpm} BPM`); return pieces.length ? pieces.join(" · ") : "所有参数均由你指定" }, [arrangement, autoTempo, moodId, styleId]);
  const styleOptions: PickerOption[] = [{ value: "auto", label: "自动判断", detail: "从鼓点密度与重拍推测", color: "#c8f45a" }, ...STYLES.map((style, index) => ({ value: style.id, label: style.label, detail: `${style.bpm[0]}–${style.bpm[1]} BPM`, color: SECTION_TONES[index % SECTION_TONES.length] }))];
  const moodOptions: PickerOption[] = [{ value: "auto", label: "自动判断", detail: "从力度与留白推测", color: "#c8f45a" }, ...MOODS.map((mood) => ({ value: mood.id, label: mood.label, detail: mood.energy > 0.75 ? "高能量" : mood.energy < 0.35 ? "低能量" : "中等能量", color: mood.tension > 0.7 ? "#ff7c5c" : mood.valence > 0.72 ? "#ffca67" : mood.valence < 0.3 ? "#8f83d9" : "#69d9d0" }))];
  const presetOptions: PickerOption[] = [{ value: "basic", label: "基础 Rock", detail: "八分踩镲与反拍军鼓", color: "#ff7c5c" }, { value: "funk", label: "Funk Pocket", detail: "十六分切分与 Ghost Note", color: "#c8f45a" }, { value: "halftime", label: "Half-time", detail: "军鼓落在第三拍", color: "#a78bfa" }, { value: "disco", label: "Four on the floor", detail: "四拍底鼓", color: "#ffb45c" }, { value: "shuffle", label: "Shuffle", detail: "三连音律动", color: "#69d9d0" }, { value: "blank", label: "空白节奏", detail: "从零开始", color: "#7f8980" }];
  const divisionOptions: PickerOption[] = [{ value: "8", label: "八分音符", detail: "每拍 2 格", color: "#ffb45c" }, { value: "12", label: "八分三连音", detail: "每拍 3 格", color: "#69d9d0" }, { value: "16", label: "十六分音符", detail: "每拍 4 格", color: "#c8f45a" }, { value: "24", label: "六连音", detail: "每拍 6 格", color: "#a78bfa" }];

  return <main className="jam-shell">
    <header className="topbar"><div className="brand-lockup"><div className="brand-mark" aria-hidden="true"><Music2 /></div><div><h1>JAM LAB</h1><p>让你的鼓点长成一首歌</p></div></div><div className="top-actions"><Button variant="outline" onClick={share}><Link2 />分享</Button><Button variant="outline" onClick={downloadProject}><Download />工程</Button></div></header>
    <section className="workspace">
      <aside className="control-panel">
        <div className="panel-heading"><span className="eyebrow">01 / 编曲条件</span><Sparkles className="heading-icon" /></div>
        <label className="field-label">音乐风格</label><StyledSelect label="音乐风格" value={styleId} onValueChange={setStyleId} options={styleOptions} className="field-select" />
        <label className="field-label">情绪状态</label><StyledSelect label="情绪状态" value={moodId} onValueChange={setMoodId} options={moodOptions} className="field-select" />
        <div className="tempo-header"><div><span className="field-label">速度</span><strong>{autoTempo ? arrangement.bpm : bpm}<small> BPM</small></strong></div><label className="switch-label"><Switch checked={autoTempo} onCheckedChange={setAutoTempo} />自动</label></div>
        <Slider aria-label="速度，每次调整 5 BPM" min={40} max={220} step={5} value={[bpm]} disabled={autoTempo} onValueChange={(value) => setBpm(value[0])} className="tempo-slider" />
        <div className="tempo-ticks" aria-hidden="true"><span>40</span><i /><i /><span>100</span><i /><i /><span>160</span><i /><span>220</span></div>
        <div className="inference-note"><WandSparkles />{inferredText}</div><Button className="generate-button" size="lg" onClick={generate}><WandSparkles />生成新的乐队编曲</Button>
      </aside>
      <section className="stage-panel">
        <div className="now-card"><div className="transport-row"><Button className="play-button" aria-label={playing ? "暂停" : "播放"} onClick={() => playing ? stop(false) : void start()}>{playing ? <Pause /> : <Play />}</Button><div className="track-identity"><span className="eyebrow">02 / 当前编曲</span><h2>{arrangement.style.label} <span>×</span> {arrangement.mood.label}</h2><p aria-live="polite">{countInBeat !== null ? `预备拍 · ${countInBeat} / 4` : `${arrangement.keyName} · ${arrangement.bpm} BPM · 约 ${formatTime(arrangement.totalSeconds)}`}</p></div><Button variant="outline" size="icon" aria-label="重新生成变化" title="重新生成变化" onClick={generate}><RefreshCw /></Button></div>
          <div className="time-row"><span>{formatTime(elapsed)}</span><Slider value={[elapsed]} min={0} max={arrangement.totalSeconds} step={0.25} aria-label="拖动歌曲时间线" onValueChange={(value) => seekTo(value[0])} onValueCommit={commitSeek} className="timeline-slider" /><span>{formatTime(arrangement.totalSeconds)}</span></div>
          <div className="section-strip" aria-label="歌曲结构">{arrangement.sections.map((section, index) => <div key={`${section.name}-${index}`} className={countInBeat === null && currentSection.name === section.name && currentBar >= section.start && currentBar < section.start + section.bars && playing ? "section-block active" : "section-block"} style={{ flexGrow: section.bars, backgroundColor: section.tone }}><span>{section.name}</span><small>{section.bars} 小节</small></div>)}</div>
          <div className="arrangement-summary"><span>{countInBeat !== null ? `预备拍 ${countInBeat}` : currentSection.name}</span>{countInBeat !== null ? "一小节四拍计数后，鼓循环与乐队会从第 1 小节同步进入" : arrangement.summary}</div></div>
        <div className="practice-row"><div className="mode-group" role="group" aria-label="练习模式">{([["full", "完整示范"], ["backing", "无鼓伴奏"], ["alternate", "一小节听 / 一小节练"]] as [PracticeMode, string][]).map(([value, label]) => <button key={value} className={mode === value ? "mode-button active" : "mode-button"} onClick={() => setMode(value)}>{label}</button>)}</div><label className="metro-switch"><Switch checked={metronome} onCheckedChange={setMetronome} />节拍器</label></div>
        <div className="mixer-row">{(Object.entries({ drums: "Drums", bass: "Bass", keys: "Keys", guitar: "Guitar" }) as [keyof Mixer, string][]).map(([key, label]) => <button key={key} className={mixer[key] ? "channel active" : "channel"} onClick={() => setMixer((current) => ({ ...current, [key]: !current[key] }))} aria-pressed={mixer[key]}>{mixer[key] ? <Volume2 /> : <VolumeX />}<span>{label}</span><i /></button>)}</div>
      </section>
    </section>
    <section className="drum-editor">
      <div className="editor-heading-row"><div><span className="eyebrow">03 / 鼓节奏</span><h2><Drum />写下你想练的 Groove</h2></div><div className="editor-tools"><StyledSelect label="节奏型" value={preset} onValueChange={changePreset} options={presetOptions} /><StyledSelect label="音符划分" value={String(steps)} onValueChange={(value) => changeDivision(Number(value))} options={divisionOptions} /><Button variant="outline" className={doubleMode ? "double-tool active" : "double-tool"} aria-pressed={doubleMode} onClick={() => { setDoubleMode((active) => !active); setMessage(doubleMode ? "已退出 Double 编辑" : "Double 编辑：点击任意鼓点添加或取消双击滚奏") }}><Repeat2 />Double</Button><Button variant="outline" onClick={() => { stop(true); setPreset("blank"); const next = blankDrums(steps); drumsRef.current = next; setDrums(next); resetDoubles(steps) }}><RotateCcw />清空</Button></div></div>
      <div className="mobile-grid-tip">左右滑动查看完整小节 →</div><div className="grid-scroller"><div className="beat-grid" style={{ gridTemplateColumns: `92px repeat(${steps}, minmax(36px, 1fr))` }}><div className="grid-corner" />{Array.from({ length: steps }, (_, step) => <div key={`count-${step}`} className={step % (steps / 4) === 0 ? "count beat" : "count"}>{countLabel(step, steps)}</div>)}{LANES.map((lane) => <div className="lane-contents" key={lane.id}><div className="lane-label"><b style={{ color: lane.color }}>{lane.short}</b><span>{lane.name}</span></div>{drums[lane.id].map((value, step) => <button key={`${lane.id}-${step}`} type="button" className={`beat-cell value-${value} ${doubles[lane.id][step] ? "is-double" : ""} ${step % (steps / 4) === 0 ? "beat-start" : ""} ${localStep === step && playing ? "current" : ""}`} style={{ "--lane-color": lane.color } as React.CSSProperties} aria-label={`${lane.name} 第 ${step + 1} 格，${["关闭", "鬼音", "常规", "重音"][value]}${doubles[lane.id][step] ? "，Double 双击滚奏" : ""}`} onClick={() => changeCell(lane.id, step)}><span />{doubles[lane.id][step] && <em>×2</em>}</button>)}</div>)}</div></div>
      <div className="editor-footer"><p>{message}</p><div className="legend"><span><i className="dot normal" />常规</span><span><i className="dot accent" />重音</span><span><i className="dot ghost" />鬼音</span><span><i className="double-mark">×2</i>Double</span></div></div>
    </section>
    <footer>Jam Lab · 为听、模仿、变化与创造而设计</footer>
  </main>;
}
