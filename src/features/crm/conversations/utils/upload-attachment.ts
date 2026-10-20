export function uploadComposerAttachment(
  id: string,
  file: File,
  onProgress: (progress: number) => void,
): { abort: () => void; done: Promise<{ success: true } | { error: string }> } {
  const request = new XMLHttpRequest();
  const done = new Promise<{ success: true } | { error: string }>((resolve) => {
    const body = new FormData();
    body.set("id", id);
    body.set("file", file);
    request.open("POST", "/api/crm/conversations/attachments");
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    request.onerror = () => resolve({ error: "The file was not uploaded." });
    request.onabort = () => resolve({ error: "The file was not uploaded." });
    request.onload = () => {
      let payload: unknown;
      try {
        payload = JSON.parse(request.responseText) as unknown;
      } catch {
        resolve({ error: "The file was not uploaded." });
        return;
      }
      if (payload && typeof payload === "object" && "success" in payload && payload.success === true) {
        onProgress(100);
        resolve({ success: true });
        return;
      }
      const message =
        payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "The file was not uploaded.";
      resolve({ error: message });
    };
    onProgress(0);
    request.send(body);
  });
  return { abort: () => request.abort(), done };
}
