import * as Tone from "https://unpkg.com/tone?module";
export { Tone };
export class ToneSystem {
    static initialized = false;
    static masterBus = null;

    static async init(bpm = 100) {
        if (ToneSystem.initialized) return;

        console.log("AudioContext created, state:", Tone.context.state);

        // Must be called from a user gesture (e.g., button click)
        await Tone.start();
        await Tone.context.resume();
        console.log("Tone.start() called, state:", Tone.context.state);

        // Some browsers still report "suspended" for a few ms, so wait
        await Tone.context.resume();
        console.log("Context resumed, state:", Tone.context.state);

        // Safe to configure scheduling now
        Tone.Transport.bpm.value = bpm;
        Tone.context.lookAhead = 0.2;
        Tone.context.updateInterval = 0.05;

        // Master chain
        const limiter = new Tone.Limiter(-3).toDestination();
        const compressor = new Tone.Compressor(-20, 3).connect(limiter);
        const filter = new Tone.Filter(9000, "lowpass", -12).connect(compressor);
        const masterGain = new Tone.Gain(0.6).connect(filter);
        //const masterGain = new Tone.Gain(0.6).toDestination();

        console.log("Master bus chain:", {
            gain: masterGain,
            next: masterGain?.destination
        });


        ToneSystem.masterBus = masterGain;
        ToneSystem.initialized = true;
        console.log("ToneSystem ready @", bpm, "BPM");
        console.log("Tone identity:", Tone.Transport.context);
    }

    static async start() {
        if (Tone.context.state !== "running") {
            await Tone.context.resume();
        }

        // Reset transport position and start slightly in the future
        //Tone.Transport.position = 0;
        Tone.Transport.start();
    }


    static stop() {
        Tone.Transport.stop();
        Tone.Transport.cancel();
    }

    static setBpm(bpm) {
        Tone.Transport.bpm.rampTo(bpm, 0.2);
    }
}



// ---------------------------------------------------------------------------
// INSTRUMENT FACTORY
// ---------------------------------------------------------------------------
export class InstrumentFactory {
    static create(type = "mono", options = {}) {
        if (!ToneSystem.initialized || !ToneSystem.masterBus) {
            throw new Error("ToneSystem.init() must be called before creating instruments.");
        }

        const defaults = InstrumentFactory.defaults(type);
        const settings = { ...defaults, ...options };

        let synth;
        switch (type) {
            case "mono": synth = new Tone.MonoSynth(settings); break;
            case "fm": synth = new Tone.FMSynth(settings); break;
            case "am": synth = new Tone.AMSynth(settings); break;
            case "poly": synth = new Tone.PolySynth(Tone.Synth, settings); break;
            case "noise": synth = new Tone.NoiseSynth(settings); break;
            case "sampler": synth = new Tone.Sampler(settings); break;
            default: throw new Error(`Unknown instrument type: ${type}`);
        }

        // route through the global bus
        synth.connect(ToneSystem.masterBus);
        return synth;
    }

    static defaults(type) {
        switch (type) {
            case "mono":
                return {
                    oscillator: { type: "square" },
                    envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.3 },
                };
            case "fm":
                return {
                    harmonicity: 2.5,
                    modulationIndex: 3,
                    envelope: { attack: 0.05, decay: 0.3, sustain: 0.2, release: 0.3 },
                    modulation: { type: "sine" },
                    modulationEnvelope: { attack: 0.2, decay: 0.2, sustain: 0.2, release: 0.5 },
                };
            case "am":
                return {
                    harmonicity: 1.5,
                    envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.3 },
                    modulation: { type: "triangle" },
                };
            case "poly":
                return {
                    oscillator: { type: "triangle" },
                    envelope: { attack: 0.1, decay: 0.2, sustain: 0.4, release: 0.5 },
                };
            case "noise":
                return {
                    noise: { type: "white" },
                    envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 },
                };
            default:
                return {};
        }
    }
}

// ---------------------------------------------------------------------------
// SIMPLE PLAYER WRAPPER
// ---------------------------------------------------------------------------
export class Player {
    constructor(instrument) {
        this.instrument = instrument;
        this.lastPlay = 0;
    }

    play(note, duration = "8n", time = undefined, velocity = 0.8) {
        const now = Tone.now();
        // Don’t let this synth retrigger within 20 ms
        if (now - this.lastPlay < 0.02) return;
        this.lastPlay = now;

        // Randomize a few ms so all notes don't stack on the same frame
        const jitter = (Math.random() - 0.5) * 0.004; // ±4 ms
        const scheduledTime = (time ?? now) + jitter;

        this.instrument.triggerAttackRelease(note, duration, scheduledTime, velocity);
    }

    randomNote(scale, octave = 4) {
        return scale.randomNote(octave);
    }
}
