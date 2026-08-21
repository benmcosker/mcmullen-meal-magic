import { NextResponse } from "next/server";

import { extractRecipeFromPdf } from "@/lib/extract-recipe";
import { extractLargestJpeg } from "@/lib/pdf-images";
import { storeFile } from "@/lib/storage";
import { getCurrentUser } from "@/lib/session";

/** PDFs above this are refused outright; the API caps requests at 32 MB. */
const MAX_PDF_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  // Upload is restricted to signed-in users. This is the enforcement point;
  // hiding the nav link is not.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });
  }

  // A request with no multipart body at all makes formData() throw, which
  // would otherwise surface as a 500 rather than a bad request.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected a file upload." },
      { status: 400 },
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "That is not a PDF." }, { status: 400 });
  }

  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: "That PDF is larger than 20 MB." },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Extraction is the slow part and the part that can fail, so do it before
  // storing anything - a PDF we cannot read should not leave files behind.
  const extraction = await extractRecipeFromPdf(bytes, file.name);
  if (!extraction.ok) {
    return NextResponse.json({ error: extraction.error }, { status: 422 });
  }

  const pdf = await storeFile(bytes, file.name, "application/pdf");

  // The dish photo is best-effort: plenty of recipe PDFs have no usable image,
  // and that is not a reason to fail the upload.
  let imageUrl: string | null = null;
  const image = await extractLargestJpeg(bytes);
  if (image) {
    const stored = await storeFile(image.data, "photo.jpg", image.contentType);
    imageUrl = stored.url;
  }

  return NextResponse.json({
    recipe: extraction.recipe,
    pdfUrl: pdf.url,
    pdfFilename: file.name,
    imageUrl,
  });
}
