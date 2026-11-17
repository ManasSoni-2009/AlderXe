import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_DRIVER_CONFIG, MuxMode } from '@/lib/driver-engine';
import { buildCompleteDmgPackage } from '@/lib/dmg-packager';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const modeParam = searchParams.get('mode');
  const muxMode: MuxMode =
    modeParam === 'igpu_eco' || modeParam === 'dgpu_only' || modeParam === 'hybrid_mux'
      ? modeParam
      : 'hybrid_mux';

  const pkg = buildCompleteDmgPackage(DEFAULT_DRIVER_CONFIG, muxMode);
  const copy = new Uint8Array(pkg.binaryBytes.byteLength);
  copy.set(pkg.binaryBytes);

  return new NextResponse(copy.buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-apple-diskimage',
      'Content-Disposition': `attachment; filename="${pkg.dmgFilename}"`,
      'Content-Length': String(pkg.totalSizeBytes),
      'X-UDIF-Valid': String(pkg.validation.valid),
      'X-UDIF-SHA256': pkg.sha256Digest,
      'Cache-Control': 'no-store',
    },
  });
}
