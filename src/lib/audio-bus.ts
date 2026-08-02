/**
 * One place to silence whatever is currently playing.
 *
 * Exists for a single moment: the instant before a recording starts. The
 * shadowing step asks the learner to listen and then read the same sentence
 * aloud, so the 🔊 and the 🎙 are inches apart and tapping the second while
 * the first is still going is the normal case, not the edge case. Three things
 * go wrong if the playback is left running:
 *
 *   1. The model voice bleeds into the microphone and ends up in the learner's
 *      own recording.
 *   2. On iOS, getUserMedia moves AVAudioSession into a recording category and
 *      whatever was playing stalls or errors — the behaviour differs by
 *      version, which is reason enough not to leave it to chance.
 *   3. The learner hears two voices at once, which is simply confusing.
 *
 * ── Why a registry rather than a DOM sweep ─────────────────────────────────
 * document.querySelectorAll("audio") does not find PlayButton's element:
 * it is built with `new Audio()` and never attached to the document. Anything
 * that wants to be stoppable has to say so, which is what registerPlayback is.
 *
 * ── Why a callback rather than the element ─────────────────────────────────
 * Pausing an element from outside is not enough. PlayButton keeps its own
 * `status`, and its click handler returns early unless that status is "idle" —
 * so an element paused behind its back leaves a button that looks like it is
 * still playing and can never be pressed again. Registering a callback lets the
 * owner pause AND put its own state back, which only it knows how to do.
 *
 * ⚠️ Stopping playback is only half of the audio-session problem on iOS. The
 *    other half belongs to whoever does the recording: when a take finishes,
 *    every track on the MediaStream must be stopped —
 *
 *      recorder.onstop = () => { stream.getTracks().forEach((t) => t.stop()); }
 *
 *    — or iOS keeps the session in playAndRecord and every clip played
 *    afterwards comes out quiet, or through the earpiece instead of the
 *    speaker. Attachments.tsx:203 already does this; the shadowing recorder
 *    must too. It is a horrible bug to track down, because the audio still
 *    "works", just wrongly, and only after a recording.
 *
 * The Set lives at module scope, which is safe here: every caller is a client
 * component, and effects do not run during server rendering, so the server's
 * copy of this module is only ever empty.
 */

/**
 * Callbacks that each stop one source of sound and reset its owner's state.
 */
const stoppers = new Set<() => void>();

/**
 * Declare something stoppable. Returns the unregister function, so an effect
 * can hand it straight back as its cleanup:
 *
 *   useEffect(() => registerPlayback(() => { ... }), []);
 *
 * The callback must both stop the sound and return its owner to a state where
 * it can be started again — see the note above about PlayButton's `status`.
 */
export function registerPlayback(stop: () => void): () => void {
  stoppers.add(stop);
  return () => {
    stoppers.delete(stop);
  };
}

/**
 * Silence everything registered. Call it synchronously in the tap handler that
 * begins a recording, before awaiting getUserMedia.
 *
 * Each callback is isolated: one that throws must not leave the rest playing,
 * which is the whole point of calling this at all.
 */
export function stopAllPlayback() {
  for (const stop of stoppers) {
    try {
      stop();
    } catch {
      /* keep going — a broken stopper must not silence the others' silencing */
    }
  }
}
