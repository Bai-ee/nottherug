'use client';

import { useEffect, useRef } from 'react';

export type WeatherKey = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'default';
type CloudPuff = [number, number, number, number];
type CloudBank = { x: number; y: number; vx: number; depth: number; puffs: CloudPuff[] };
type RainDrop = { x: number; y: number; vx: number; vy: number; len: number; w: number; a: number };
type SnowFlake = { x: number; y: number; vy: number; r: number; phase: number; ps: number; a: number };

export function extractWeatherDisplay(input: string | null | undefined): { headline: string; lineOne: string; lineTwo: string } {
  const value = (input ?? '').trim();
  if (!value) {
    return {
      headline: 'n/a',
      lineOne: 'Weather impact unavailable for this run.',
      lineTwo: '',
    };
  }

  const tempMatch = value.match(/(?:max temp|temp)\s+(-?\d+)\s*F\b/i) || value.match(/\b(-?\d+)\s*F\b/i);
  const precipMatch = value.match(/(?:max precip|precip(?:itation)?(?: chance)?)\s+(\d+)%/i) || value.match(/up to\s+(\d+)%\s+precip/i);
  const windMatch = value.match(/(?:max wind|winds? up to)\s+(\d+)\s*mph/i) || value.match(/\b(\d+)\s*mph\b/i);
  const timeMatch = value.match(/\b\d{1,2}:\d{2}\s(?:AM|PM)\s*[–-]\s*\d{1,2}:\d{2}\s(?:AM|PM)\b/i);
  const segments = value.split('·').map((segment) => segment.trim()).filter(Boolean);
  const location = segments.find((segment) =>
    !/\d{1,2}:\d{2}\s(?:AM|PM)/i.test(segment)
    && !/(?:max temp|max precip|max wind|\d+\s*F\b|\d+\s*mph\b)/i.test(segment)
    && !/(?:sun|clear|bright|cloud|overcast|fog|mist|rain|drizzle|showers|storm|thunder|snow|ice)/i.test(segment)
  ) ?? '';
  const condition = segments.find((segment) => /(sun|clear|bright|cloud|overcast|fog|mist|rain|drizzle|showers|storm|thunder|snow|ice)/i.test(segment))
    ?? '';

  const temp = tempMatch ? `${tempMatch[1]}F` : null;
  const lineOne = [location, timeMatch ? timeMatch[0].replace(/\s*[–-]\s*/i, '–') : ''].filter(Boolean).join(' · ');
  const lineTwo = [
    condition,
    precipMatch ? `${precipMatch[1]}% precip` : null,
    windMatch ? `${windMatch[1]} mph wind` : null,
  ].filter(Boolean);

  return {
    headline: temp ?? 'n/a',
    lineOne: lineOne || value,
    lineTwo: lineTwo.join(' · '),
  };
}

export function getWeatherKey(input: string | null | undefined): WeatherKey {
  const value = (input ?? '').toLowerCase();
  if (value.includes('storm') || value.includes('thunder')) return 'storm';
  if (/\b(snow|snowing|snowy|ice|icy|sleet|flurries)\b/.test(value)) return 'snow';
  if (value.includes('rain') || value.includes('drizzle') || value.includes('showers')) return 'rain';
  if (value.includes('cloud') || value.includes('overcast') || value.includes('fog') || value.includes('mist')) return 'cloudy';
  if (value.includes('sun') || value.includes('clear') || value.includes('bright')) return 'sunny';
  return 'default';
}

function drawSkyBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number, weatherKey: WeatherKey) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  if (weatherKey === 'sunny') {
    g.addColorStop(0, '#FFDE95');
    g.addColorStop(0.25, '#EFAE63');
    g.addColorStop(0.6, '#5D7FA0');
    g.addColorStop(1, '#15222A');
  } else if (weatherKey === 'cloudy') {
    g.addColorStop(0, '#8C98A3');
    g.addColorStop(0.35, '#63717E');
    g.addColorStop(0.7, '#36414D');
    g.addColorStop(1, '#182027');
  } else if (weatherKey === 'rain') {
    g.addColorStop(0, '#657B89');
    g.addColorStop(0.35, '#435764');
    g.addColorStop(0.72, '#24343E');
    g.addColorStop(1, '#0E151A');
  } else if (weatherKey === 'storm') {
    g.addColorStop(0, '#505974');
    g.addColorStop(0.3, '#343A56');
    g.addColorStop(0.65, '#1B2033');
    g.addColorStop(1, '#090B12');
  } else if (weatherKey === 'snow') {
    g.addColorStop(0, '#CBD8E3');
    g.addColorStop(0.36, '#9AAEBC');
    g.addColorStop(0.7, '#5F7482');
    g.addColorStop(1, '#22303A');
  } else {
    g.addColorStop(0, '#B8C4A4');
    g.addColorStop(0.4, '#6A7D62');
    g.addColorStop(1, '#1B241B');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  const haze = ctx.createLinearGradient(0, height * 0.38, 0, height);
  haze.addColorStop(0, 'rgba(255,255,255,0)');
  haze.addColorStop(1, weatherKey === 'sunny' ? 'rgba(252,214,156,0.18)' : 'rgba(218,230,240,0.14)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);
}

function drawSunScene(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const sx = width * 0.78;
  const sy = height * 0.2;
  const pulse = 1 + Math.sin(time * 0.7) * 0.03;

  const atmosphere = ctx.createRadialGradient(sx, sy, 0, sx, sy, width * 0.7);
  atmosphere.addColorStop(0, 'rgba(255,238,181,0.55)');
  atmosphere.addColorStop(0.22, 'rgba(255,204,118,0.22)');
  atmosphere.addColorStop(0.55, 'rgba(255,174,78,0.08)');
  atmosphere.addColorStop(1, 'rgba(255,166,66,0)');
  ctx.fillStyle = atmosphere;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(sx, sy);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + time * 0.08;
    const spread = 0.16;
    const len = width * 1.2;
    ctx.save();
    ctx.rotate(angle);
    const beam = ctx.createLinearGradient(0, 0, len, 0);
    beam.addColorStop(0, 'rgba(255,231,165,0.14)');
    beam.addColorStop(0.12, 'rgba(255,208,109,0.09)');
    beam.addColorStop(0.45, 'rgba(255,184,79,0.02)');
    beam.addColorStop(1, 'rgba(255,184,79,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, len, -spread, spread);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  const core = ctx.createRadialGradient(sx, sy, 0, sx, sy, 58 * pulse);
  core.addColorStop(0, 'rgba(255,252,227,1)');
  core.addColorStop(0.25, 'rgba(255,229,154,0.95)');
  core.addColorStop(0.65, 'rgba(255,202,96,0.55)');
  core.addColorStop(1, 'rgba(255,184,66,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(sx, sy, 58 * pulse, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloudBank(ctx: CanvasRenderingContext2D, bank: CloudBank, tint: { inner: string; outer: string }) {
  for (const [dx, dy, r, alpha] of bank.puffs) {
    const px = bank.x + dx;
    const py = bank.y + dy;
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, r);
    gradient.addColorStop(0, tint.inner.replace('__A__', String(alpha * (0.9 + bank.depth * 0.25))));
    gradient.addColorStop(0.55, tint.outer.replace('__A__', String(alpha * 0.5)));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHorizon(ctx: CanvasRenderingContext2D, width: number, height: number, weatherKey: WeatherKey) {
  const ridgeFill = ctx.createLinearGradient(0, height * 0.66, 0, height);
  if (weatherKey === 'sunny') {
    ridgeFill.addColorStop(0, 'rgba(30,48,45,0.22)');
    ridgeFill.addColorStop(1, 'rgba(8,14,16,0.72)');
  } else if (weatherKey === 'rain' || weatherKey === 'storm') {
    ridgeFill.addColorStop(0, 'rgba(34,50,58,0.2)');
    ridgeFill.addColorStop(1, 'rgba(4,8,10,0.82)');
  } else {
    ridgeFill.addColorStop(0, 'rgba(32,46,52,0.18)');
    ridgeFill.addColorStop(1, 'rgba(8,12,14,0.78)');
  }

  const water = ctx.createLinearGradient(0, height * 0.72, 0, height);
  water.addColorStop(0, 'rgba(255,255,255,0)');
  water.addColorStop(0.3, weatherKey === 'sunny' ? 'rgba(255,211,148,0.08)' : 'rgba(173,197,214,0.06)');
  water.addColorStop(1, 'rgba(4,8,10,0.76)');
  ctx.fillStyle = water;
  ctx.fillRect(0, height * 0.72, width, height * 0.28);

  const ridge = new Path2D();
  ridge.moveTo(0, height);
  ridge.lineTo(0, height * 0.78);
  ridge.bezierCurveTo(width * 0.1, height * 0.7, width * 0.18, height * 0.83, width * 0.3, height * 0.74);
  ridge.bezierCurveTo(width * 0.4, height * 0.66, width * 0.5, height * 0.82, width * 0.64, height * 0.73);
  ridge.bezierCurveTo(width * 0.75, height * 0.66, width * 0.85, height * 0.8, width, height * 0.7);
  ridge.lineTo(width, height);
  ridge.closePath();
  ctx.fillStyle = ridgeFill;
  ctx.fill(ridge);

  const foreground = new Path2D();
  foreground.moveTo(0, height);
  foreground.lineTo(0, height * 0.86);
  foreground.bezierCurveTo(width * 0.16, height * 0.8, width * 0.26, height * 0.93, width * 0.42, height * 0.84);
  foreground.bezierCurveTo(width * 0.55, height * 0.78, width * 0.7, height * 0.95, width * 0.84, height * 0.86);
  foreground.bezierCurveTo(width * 0.92, height * 0.82, width * 0.97, height * 0.88, width, height * 0.84);
  foreground.lineTo(width, height);
  foreground.closePath();
  ctx.fillStyle = weatherKey === 'sunny' ? 'rgba(11,18,18,0.54)' : 'rgba(8,12,14,0.64)';
  ctx.fill(foreground);

  const groundGlow = ctx.createLinearGradient(0, height * 0.72, 0, height);
  groundGlow.addColorStop(0, 'rgba(255,255,255,0)');
  groundGlow.addColorStop(1, weatherKey === 'rain' ? 'rgba(112,160,178,0.12)' : 'rgba(255,223,156,0.06)');
  ctx.fillStyle = groundGlow;
  ctx.fillRect(0, height * 0.68, width, height * 0.32);
}

function createCloudBanks(width: number, height: number, dense = false): CloudBank[] {
  const scale = dense ? 1.2 : 1;
  return [
    { x: width * 0.04, y: height * 0.2, vx: 0.12, depth: 0.1, puffs: [[-80, 0, 115 * scale, 0.22], [-5, -48, 95 * scale, 0.17], [70, -18, 108 * scale, 0.19], [154, 9, 84 * scale, 0.15]] },
    { x: width * 0.5, y: height * 0.1, vx: 0.08, depth: 0.2, puffs: [[-64, 0, 88 * scale, 0.16], [0, -34, 72 * scale, 0.14], [62, -18, 82 * scale, 0.15], [126, 4, 66 * scale, 0.11]] },
    { x: width * 0.72, y: height * 0.38, vx: 0.16, depth: 0.3, puffs: [[-72, 0, 100 * scale, 0.18], [-10, -42, 80 * scale, 0.15], [52, -18, 88 * scale, 0.17], [122, 6, 68 * scale, 0.12]] },
    { x: -220, y: height * 0.58, vx: 0.1, depth: 0.42, puffs: [[-70, 0, 96 * scale, 0.14], [0, -36, 78 * scale, 0.12], [64, -14, 88 * scale, 0.14], [132, 8, 72 * scale, 0.1]] },
  ];
}

function WeatherCanvas({ weatherKey }: { weatherKey: WeatherKey }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth || canvas.clientWidth || 1200;
      canvas.height = canvas.offsetHeight || canvas.clientHeight || 420;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let frame = 0;
    let t = 0;
    let flashAlpha = 0;
    let flashCooldown = 180;

    const denseClouds = weatherKey === 'cloudy' || weatherKey === 'rain' || weatherKey === 'storm' || weatherKey === 'snow';
    const clouds = createCloudBanks(canvas.width, canvas.height, denseClouds);
    const rainDrops: RainDrop[] = (weatherKey === 'rain' || weatherKey === 'storm')
      ? Array.from({ length: weatherKey === 'storm' ? 260 : 190 }, () => ({
          x: Math.random() * (canvas.width + 120) - 60,
          y: Math.random() * canvas.height,
          vx: -(2.5 + Math.random() * 3),
          vy: 14 + Math.random() * 16,
          len: 16 + Math.random() * 30,
          w: 0.5 + Math.random() * 0.9,
          a: 0.2 + Math.random() * 0.45,
        }))
      : [];
    const snowFlakes: SnowFlake[] = weatherKey === 'snow'
      ? Array.from({ length: 140 }, () => ({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vy: 0.5 + Math.random() * 1.6,
          r: 1.5 + Math.random() * 4.5,
          phase: Math.random() * Math.PI * 2,
          ps: 0.007 + Math.random() * 0.014,
          a: 0.45 + Math.random() * 0.45,
        }))
      : [];

    const cloudTint = weatherKey === 'sunny'
      ? { inner: 'rgba(255,244,228,__A__)', outer: 'rgba(255,212,170,__A__)' }
      : weatherKey === 'storm'
        ? { inner: 'rgba(104,116,150,__A__)', outer: 'rgba(58,66,90,__A__)' }
        : weatherKey === 'rain'
          ? { inner: 'rgba(150,170,186,__A__)', outer: 'rgba(92,110,126,__A__)' }
          : { inner: 'rgba(219,229,239,__A__)', outer: 'rgba(132,148,166,__A__)' };

    const drawSceneBase = () => {
      drawSkyBackdrop(ctx, canvas.width, canvas.height, weatherKey);

      if (weatherKey === 'sunny') {
        drawSunScene(ctx, canvas.width, canvas.height, t);
      } else if (weatherKey === 'cloudy') {
        const haze = ctx.createRadialGradient(canvas.width * 0.66, canvas.height * 0.22, 0, canvas.width * 0.66, canvas.height * 0.22, canvas.width * 0.44);
        haze.addColorStop(0, 'rgba(246,248,255,0.12)');
        haze.addColorStop(0.45, 'rgba(214,224,236,0.06)');
        haze.addColorStop(1, 'rgba(214,224,236,0)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (weatherKey === 'rain' || weatherKey === 'storm') {
        const gloom = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gloom.addColorStop(0, 'rgba(17,23,29,0.12)');
        gloom.addColorStop(1, 'rgba(0,0,0,0.28)');
        ctx.fillStyle = gloom;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      for (const cloud of clouds) {
        drawCloudBank(ctx, cloud, cloudTint);
        cloud.x += cloud.vx * (cloud.depth > 0.25 ? 1.15 : 1);
        if (cloud.x > canvas.width + 320) cloud.x = -340;
      }

      drawHorizon(ctx, canvas.width, canvas.height, weatherKey);
    };

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawSceneBase();

      if (weatherKey === 'rain' || weatherKey === 'storm') {
        if (weatherKey === 'storm') {
          flashCooldown--;
          if (flashCooldown <= 0 && Math.random() < 0.016) {
            flashAlpha = 0.28;
            flashCooldown = 160 + Math.floor(Math.random() * 220);
          }
        }

        for (const drop of rainDrops) {
          ctx.save();
          ctx.globalAlpha = drop.a;
          ctx.strokeStyle = weatherKey === 'storm' ? '#D5E8FF' : '#B7D5E7';
          ctx.lineWidth = drop.w;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x + drop.vx * (drop.len / drop.vy), drop.y + drop.len);
          ctx.stroke();
          ctx.restore();
          drop.x += drop.vx;
          drop.y += drop.vy;
          if (drop.y > canvas.height + 30 || drop.x < -60) {
            drop.y = -40 - Math.random() * 80;
            drop.x = Math.random() * (canvas.width + 120);
          }
        }

        const gloss = ctx.createLinearGradient(0, canvas.height * 0.72, 0, canvas.height);
        gloss.addColorStop(0, 'rgba(255,255,255,0)');
        gloss.addColorStop(1, 'rgba(145,196,214,0.12)');
        ctx.fillStyle = gloss;
        ctx.fillRect(0, canvas.height * 0.72, canvas.width, canvas.height * 0.28);

        if (flashAlpha > 0) {
          ctx.fillStyle = `rgba(225,235,255,${flashAlpha})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          flashAlpha = Math.max(0, flashAlpha - 0.035);
        }
      } else if (weatherKey === 'snow') {
        for (const flake of snowFlakes) {
          flake.phase += flake.ps;
          flake.x += Math.sin(flake.phase) * 0.7;
          flake.y += flake.vy;
          if (flake.y > canvas.height + flake.r) {
            flake.y = -flake.r;
            flake.x = Math.random() * canvas.width;
          }
          ctx.save();
          ctx.globalAlpha = flake.a;
          ctx.fillStyle = '#F3F8FF';
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      frame = window.requestAnimationFrame(draw);
    };

    draw();
    return () => {
      ro.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [weatherKey]);

  return <canvas ref={ref} className="db-hero-canvas" aria-hidden="true" />;
}

export function WeatherBackground({ weatherKey }: { weatherKey: WeatherKey }) {
  return (
    <div className="db-hero-bg">
      <WeatherCanvas weatherKey={weatherKey} />
      <div className="db-hero-overlay" />
    </div>
  );
}
