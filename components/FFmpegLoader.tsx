'use client';

export default function FFmpegLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-[#1A1A1A]" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#E85D20] animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-white font-medium">Loading FFmpeg</p>
        <p className="text-sm text-[#555] mt-1">Downloading ~30 MB WASM binary…</p>
      </div>
    </div>
  );
}
