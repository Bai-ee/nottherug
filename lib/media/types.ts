import type { RendererName } from '@/lib/media/createRenderer';
export interface LogoPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number; // 0–1
}

export interface RenderInput {
  sourceImageBuffer: Buffer;
  logoBuffer: Buffer;
  placement: LogoPlacement;
}

export interface RenderOutput {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
}

export interface MediaRenderer {
  readonly name: RendererName;
  render(input: RenderInput): Promise<RenderOutput>;
}
