import { useEffect, useRef, useState } from "react";
import { BarcodeDetector } from "barcode-detector/ponyfill";
import { CameraOff } from "lucide-react";

type Props = {
  /** Called once with the digits of the first valid product barcode seen. */
  onDetect: (code: string) => void;
  /** Pauses scanning (e.g. while a lookup is running). */
  paused?: boolean;
};

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;

function explain(e: unknown): string {
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access is blocked. Allow it in your browser settings, or type the number below.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera found. Type the number below instead.";
  }
  return "Couldn't start the camera. Type the number below instead.";
}

/** Live camera barcode reader. Always switches the camera off when it unmounts. */
export function Scanner({ onDetect, paused = false }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const done = useRef(false);
  const pausedRef = useRef(paused);
  const onDetectRef = useRef(onDetect);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  pausedRef.current = paused;
  onDetectRef.current = onDetect;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let cancelled = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("The camera needs a secure (https) connection. Type the number below instead.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) return;
        const el = video.current!;
        el.srcObject = stream;
        await el.play();
        setReady(true);

        const detector = new BarcodeDetector({ formats: [...FORMATS] });
        timer = window.setInterval(async () => {
          if (done.current || pausedRef.current || el.readyState < 2) return;
          try {
            const hits = await detector.detect(el);
            const code = hits.map((h) => h.rawValue).find((v) => /^\d{8,14}$/.test(v));
            if (code && !done.current) {
              done.current = true;
              navigator.vibrate?.(60);
              onDetectRef.current(code);
            }
          } catch {
            // A single bad frame is fine; keep scanning.
          }
        }, 250);
      } catch (e) {
        if (!cancelled) setError(explain(e));
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return (
      <div className="scanner scanner-off" role="alert">
        <CameraOff size={28} />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="scanner">
      <video ref={video} playsInline muted aria-label="Camera view for scanning a barcode" />
      <div className="scan-frame" aria-hidden />
      <p className="scan-hint" role="status">
        {paused ? "Looking it up…" : ready ? "Point at the barcode" : "Starting camera…"}
      </p>
    </div>
  );
}
