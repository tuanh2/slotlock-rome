import React, { useEffect, useRef } from "react";

interface TailJoint {
  x: number;
  y: number;
}

class MantaCreature {
  x: number;
  y: number;
  a: number; // angle
  v: number; // velocity
  av: number; // angular velocity
  L: number; // length
  span: number; // wingspan
  phase: number;
  tail: TailJoint[];
  spots: [number, number, number][];

  constructor(x: number, y: number, L = 70, span = 62) {
    this.x = x;
    this.y = y;
    this.a = Math.random() * Math.PI * 2;
    this.v = 1.4;
    this.av = 0;
    this.L = L;
    this.span = span;
    this.phase = Math.random() * Math.PI * 2;
    this.tail = [];
    for (let i = 0; i < 14; i++) {
      this.tail.push({ x, y });
    }
    this.spots = [];
    for (let i = 0; i < 8; i++) {
      this.spots.push([
        (Math.random() - 0.5) * L * 0.6,
        (Math.random() - 0.5) * span * 0.9,
        Math.random(),
      ]);
    }
  }

  update(width: number, height: number, pointer: { x: number; y: number; active: boolean }) {
    // Flapping wings oscillation
    this.phase += 0.055;

    // Target direction
    let targetAngle = this.a;

    if (pointer.active) {
      const dx = pointer.x - this.x;
      const dy = pointer.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 30) {
        targetAngle = Math.atan2(dy, dx);
      }
    } else {
      // Gentle wandering wave
      targetAngle = this.a + Math.sin(this.phase * 0.4) * 0.035;
    }

    // Turn smoothly towards target angle
    let diff = targetAngle - this.a;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    this.av = this.av * 0.88 + diff * 0.05;
    this.a += this.av;

    // Move forward
    const speed = pointer.active ? 2.2 : 1.5;
    this.x += Math.cos(this.a) * speed;
    this.y += Math.sin(this.a) * speed;

    // Soft boundary bouncing
    const margin = 80;
    if (this.x < margin) this.a += 0.04;
    if (this.x > width - margin) this.a -= 0.04;
    if (this.y < margin) this.a += 0.04;
    if (this.y > height - margin) this.a -= 0.04;

    // Wrap around screen edges if it goes far off
    if (this.x < -100) this.x = width + 50;
    if (this.x > width + 100) this.x = -50;
    if (this.y < -100) this.y = height + 50;
    if (this.y > height + 100) this.y = -50;

    // Tail joints physics (lagging trailing spine)
    const tailStartDist = -this.L * 0.4;
    const startX = this.x + Math.cos(this.a) * tailStartDist;
    const startY = this.y + Math.sin(this.a) * tailStartDist;

    this.tail[0] = { x: startX, y: startY };
    for (let i = 1; i < this.tail.length; i++) {
      const prev = this.tail[i - 1];
      const curr = this.tail[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const d = Math.hypot(dx, dy) || 1;
      const segmentLen = this.L * 0.09;
      curr.x = prev.x + (dx / d) * segmentLen;
      curr.y = prev.y + (dy / d) * segmentLen;
    }
  }

  draw(ctx: CanvasRenderingContext2D, palette: {
    back: string;
    edge: string;
    ridge: string;
    patch: string;
    spot: string;
    tail: string;
  }) {
    const s = this.L;
    const n = Math.cos(this.phase);
    const r = this.span * (0.84 + 0.16 * n);
    const o = Math.max(-0.25, Math.min(0.25, this.av * 0.35));
    const l = -s * 0.2 - Math.sin(this.phase) * s * 0.09;
    const d = Math.sin(this.phase - 1.1) * s * 0.1;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.a);

    // Manta wing bezier drawing function from askglyph.chat
    const wingPath = (f: number, y: number) => {
      ctx.moveTo(s * 0.5, 0);
      ctx.lineTo(s * 0.66, f * s * 0.06);
      ctx.quadraticCurveTo(s * 0.68, f * s * 0.15, s * 0.56, f * s * 0.17);
      ctx.lineTo(s * 0.42, f * s * 0.18);
      ctx.bezierCurveTo(
        s * 0.28,
        f * (s * 0.24 + y * 0.3),
        l + s * 0.22 + d,
        f * y * 0.86,
        l,
        f * y
      );
      ctx.bezierCurveTo(
        l + s * 0.02,
        f * y * 0.72,
        -s * 0.18,
        f * y * 0.3,
        -s * 0.44,
        f * s * 0.07
      );
      ctx.lineTo(-s * 0.44, 0);
      ctx.closePath();
    };

    // Body gradient
    const grad = ctx.createLinearGradient(0, -r, 0, r);
    const u = n < -0.2 ? palette.edge : palette.back;
    grad.addColorStop(0, u);
    grad.addColorStop(0.32, palette.back);
    grad.addColorStop(0.68, palette.back);
    grad.addColorStop(1, u);

    ctx.fillStyle = grad;
    ctx.beginPath();
    wingPath(1, r * (1 - o));
    wingPath(-1, r * (1 + o));
    ctx.fill();

    // Dorsal spine / ridge
    ctx.fillStyle = palette.ridge;
    ctx.beginPath();
    ctx.ellipse(-s * 0.04, 0, s * 0.36, s * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shoulder patches
    ctx.fillStyle = palette.patch;
    for (const f of [1, -1]) {
      ctx.beginPath();
      ctx.ellipse(s * 0.14, f * s * 0.24, s * 0.15, s * 0.065, f * -0.75, 0, Math.PI * 2);
      ctx.fill();
    }

    // Spots on wings
    for (const [sx, sy] of this.spots) {
      ctx.fillStyle = palette.spot;
      ctx.beginPath();
      ctx.arc(sx, sy * (r / this.span) * 0.7, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Trailing whip tail
    ctx.strokeStyle = palette.tail;
    ctx.lineCap = "round";
    for (let i = 1; i < this.tail.length; i++) {
      ctx.lineWidth = Math.max(1, s * 0.05 * (1 - i / this.tail.length));
      ctx.beginPath();
      ctx.moveTo(this.tail[i - 1].x, this.tail[i - 1].y);
      ctx.lineTo(this.tail[i].x, this.tail[i].y);
      ctx.stroke();
    }
  }
}

export const SwimmingMantaOcean: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: -999, y: -999, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const handlePointerMove = (e: MouseEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const handlePointerLeave = () => {
      pointerRef.current.active = false;
    };
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseleave", handlePointerLeave);

    // Create 2 swimming mantas (one hero, one smaller follower in background)
    const heroManta = new MantaCreature(width * 0.5, height * 0.4, 76, 68);
    const followerManta = new MantaCreature(width * 0.25, height * 0.7, 48, 42);

    // Warm white & purple/violet palette (Kyoka + Arena)
    const heroPalette = {
      back: "rgba(107, 33, 168, 0.45)", // deep violet
      edge: "rgba(147, 51, 234, 0.65)", // bright purple
      ridge: "rgba(88, 28, 135, 0.7)",  // dark plum
      patch: "rgba(192, 132, 252, 0.5)", // soft lavender
      spot: "rgba(216, 180, 254, 0.8)",
      tail: "rgba(107, 33, 168, 0.55)",
    };

    const followerPalette = {
      back: "rgba(147, 51, 234, 0.25)",
      edge: "rgba(168, 85, 247, 0.35)",
      ridge: "rgba(107, 33, 168, 0.35)",
      patch: "rgba(216, 180, 254, 0.3)",
      spot: "rgba(233, 213, 255, 0.5)",
      tail: "rgba(147, 51, 234, 0.3)",
    };

    // Ambient floating particles / bubbles
    const bubbles: { x: number; y: number; r: number; vy: number; alpha: number }[] = [];
    for (let i = 0; i < 28; i++) {
      bubbles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 3 + 1,
        vy: Math.random() * 0.4 + 0.2,
        alpha: Math.random() * 0.35 + 0.1,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render subtle ambient bubbles
      for (const b of bubbles) {
        b.y -= b.vy;
        if (b.y < -10) {
          b.y = height + 10;
          b.x = Math.random() * width;
        }
        ctx.fillStyle = `rgba(168, 85, 247, ${b.alpha})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Update & draw background follower manta
      followerManta.update(width, height, { ...pointerRef.current, active: false });
      followerManta.draw(ctx, followerPalette);

      // Update & draw hero manta (follows cursor)
      heroManta.update(width, height, pointerRef.current);
      heroManta.draw(ctx, heroPalette);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
};
