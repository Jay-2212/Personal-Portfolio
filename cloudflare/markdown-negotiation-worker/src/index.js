const MARKDOWN_PATHS = new Set(["/", "/index.html"]);

export function acceptsMarkdown(acceptHeader = "") {
  return acceptHeader.split(",").some((range) => {
    const [mediaType, ...parameters] = range.split(";");
    if (mediaType.trim().toLowerCase() !== "text/markdown") return false;

    const quality = parameters
      .map((parameter) => parameter.trim().toLowerCase())
      .find((parameter) => parameter.startsWith("q="));

    return quality === undefined || Number(quality.slice(2)) > 0;
  });
}

function withAcceptInVary(varyHeader) {
  const values = (varyHeader ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!values.some((value) => value.toLowerCase() === "accept")) values.push("Accept");
  return values.join(", ");
}

export async function handleRequest(request, fetchImpl = fetch) {
  const url = new URL(request.url);
  const methodCanNegotiate = request.method === "GET" || request.method === "HEAD";
  const shouldNegotiate = methodCanNegotiate && MARKDOWN_PATHS.has(url.pathname)
    && acceptsMarkdown(request.headers.get("Accept") ?? "");

  if (!shouldNegotiate) return fetchImpl(request);

  const markdownUrl = new URL("/index.md", request.url);
  const markdownRequest = new Request(markdownUrl, request);

  try {
    const markdownResponse = await fetchImpl(markdownRequest);
    if (!markdownResponse.ok) return fetchImpl(request);

    const headers = new Headers(markdownResponse.headers);
    headers.set("Content-Type", "text/markdown; charset=utf-8");
    headers.set("Vary", withAcceptInVary(headers.get("Vary")));

    return new Response(request.method === "HEAD" ? null : markdownResponse.body, {
      status: markdownResponse.status,
      statusText: markdownResponse.statusText,
      headers
    });
  } catch {
    return fetchImpl(request);
  }
}

export default {
  fetch(request) {
    return handleRequest(request);
  }
};
