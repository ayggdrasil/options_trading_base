// Fetches compressed data from a URL and decompresses it using gzip
export async function fetchAndDecompress(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();

  // DecompressionStream API를 사용하여 gzip 해제
  const ds = new DecompressionStream("gzip");
  const decompressedStream = blob.stream().pipeThrough(ds);
  const decompressedBlob = await new Response(decompressedStream).blob();

  // 압축해제된 데이터를 JSON으로 파싱
  const text = await decompressedBlob.text();
  return JSON.parse(text);
}
