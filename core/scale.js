export class Scale {
static PATTERNS = {
    major: [2, 2, 1, 2, 2, 2, 1], // W W H W W W H
    minor: [2, 1, 2, 2, 1, 2, 2], // W H W W H W W
    harmonicMinor: [2, 1, 2, 2, 1, 3, 1],
    majorPentatonic: [2, 2, 3, 2, 3],
    minorPentatonic: [3, 2, 2, 3, 2]
};
static NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  constructor(tonic, patternName = 'major') {
    this.tonic = tonic;
    this.patternName = patternName;
    this.pattern = Scale.PATTERNS[patternName];
    
    if (!this.pattern) {
      throw new Error(`Unknown scale pattern: ${patternName}`);
    }
    
    // Calculate tonic's semitone offset from C
    this.tonicOffset = Scale.NOTES.indexOf(tonic);
    if (this.tonicOffset === -1) {
      throw new Error(`Unknown tonic: ${tonic}`);
    }
  }

  // Get a specific note by scale degree and octave
  // degree: 0-based index in scale (0 = tonic, 1 = second, etc.)
  // octave: which octave (4 = middle C octave)
    note(degree, octave = 4) {
        if (degree === 0) return this.tonic + octave;

        const steps = this.pattern;
        const numSteps = steps.length;

        let semitoneOffset = 0;

        if (degree > 0) {
            for (let i = 0; i < degree; i++) {
                semitoneOffset += steps[i % numSteps];
            }
        } else {
            for (let i = 0; i > degree; i--) {
                // move backwards through intervals
                const step = steps[((i - 1) % numSteps + numSteps) % numSteps];
                semitoneOffset -= step;
            }
        }

        const totalSemitones = this.tonicOffset + semitoneOffset;
        const noteIndex = ((totalSemitones % 12) + 12) % 12;
        const octaveAdjustment = Math.floor(totalSemitones / 12);

        const actualOctave = octave + octaveAdjustment;
        return Scale.NOTES[noteIndex] + actualOctave;
    }




  // Get all notes in the scale for a given octave
  // Returns array like ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'] for C major, octave 4
    notes(octave = 4, count = this.pattern.length) {
        const descending = count < 0;
        count = Math.abs(count);

        const seq = descending
            ? Array.from({ length: count }, (_, i) => this.note(-i, octave))
            : Array.from({ length: count }, (_, i) => this.note(i, octave));

        return seq;
    }


  // Get notes across multiple octaves
  // e.g., notesInRange(3, 5) gives 3 octaves worth
    notesInRange(startOctave, endOctave) {
        const result = [];
        for (let oct = startOctave; oct <= endOctave; oct++) {
            result.push(...this.notes(oct));
        }
        return result;
    }


  // Get a random note from the scale using an RNG
  randomNote(octave = 4, rng = Math.random) {
    const degree = Math.floor(rng() * this.pattern.length);
    return this.note(degree, octave);
  }

  // Get note name without octave (useful for chord roots, etc.)
  noteName(degree) {
    const scaleDegree = ((degree % this.pattern.length) + this.pattern.length) % this.pattern.length;
    const semitones = this.pattern[scaleDegree];
    const noteIndex = (this.tonicOffset + semitones) % 12;
    return Scale.NOTES[noteIndex];
  }

  toString() {
    return `${this.tonic} ${this.patternName}: ${this.notes().join(' ')}`;
  }
}
