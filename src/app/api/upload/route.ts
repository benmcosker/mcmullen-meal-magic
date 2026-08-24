import { BlobError } from "@vercel/blob";
import { NextResponse } from "next/server";

import {
  findRecipeByPdfHash,
  findSimilarlyTitled,
  hashBytes,
} from "@/lib/duplicates";
import { extractRecipeFromPdf } from "@/lib/extract-recipe";
import { extractLargestJpeg } from "@/lib/pdf-images";
import { inspectPdf } from "@/lib/pdf-inspect";
import { blobStoreId, storeFile } from "@/lib/storage";
import { getCurrentHousehold } from "@/lib/session";

/**
 * Reading a PDF takes as long as it takes.
 *
 * Without this the route inherits the platform's default timeout, which is far
 * shorter than a model call that reads a document and reasons about it - so an
 * upload that works locally dies in production with a gateway error and no
 * explanation. 60s is the Hobby ceiling; Pro and Fluid compute allow 300, and
 * this can be raised to match.
 */
export const maxDuration = 60;

/** PDFs above this are refused outright; the API caps requests at 32 MB. */
const MAX_PDF_BYTES = 20 * 1024 * 1024;

/**
 * Anything that gets past the checks below and still throws.
 *
 * Without this, an unexpected failure returns Next's HTML error page. The
 * client cannot parse that as JSON, falls back to a guessed message, and tells
 * the person their PDF took too long to read - which sent two of us hunting
 * timeouts while the real answer (a misconfigured blob store) sat in the logs.
 *
 * So: log the real error where an operator will find it, and answer with
 * something true. Storage failures are named specifically, because those are
 * configuration problems rather than anything the person uploading did wrong.
 */
export async function POST(request: Request) {
  try {
    return await handleUpload(request);
  } catch (error) {
    console.error("[meal-magic] upload failed", error);

    if (error instanceof BlobError) {
      // Name the store, so a token pasted from the wrong one is obvious. The
      // error text talks about the store's configuration, which sends you to
      // the store's settings when the mistake is actually in the variable.
      console.error(
        `[meal-magic] blob store in use: ${blobStoreId() ?? "unknown"}`,
      );
      return NextResponse.json(
        {
          error:
            "File storage rejected the upload. The recipe was not saved - " +
            "this is a configuration problem, not a problem with your PDF.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Something went wrong reading that PDF. Nothing was saved." },
      { status: 500 },
    );
  }
}

async function handleUpload(request: Request) {
  // Upload is restricted to signed-in users. This is the enforcement point;
  // hiding the nav link is not.
  const user = await getCurrentHousehold();
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

  // Size is checked before reading the body into memory.
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: "That PDF is larger than 20 MB." },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Inspect the bytes rather than trusting file.type, which the browser
  // supplies and anything else can forge. This also rejects damaged,
  // encrypted and absurdly long PDFs before they cost a slow, billable model
  // call that would fail anyway.
  const inspection = await inspectPdf(bytes);
  if (!inspection.ok) {
    return NextResponse.json({ error: inspection.reason }, { status: 400 });
  }

  // Before extraction, not after: recognising a file we already have is the
  // difference between an instant answer and a slow, billable call whose
  // result gets thrown away.
  const pdfSha256 = hashBytes(bytes);
  const alreadyHave = await findRecipeByPdfHash(pdfSha256, user.householdId);
  if (alreadyHave) {
    return NextResponse.json(
      {
        error: `That exact PDF is already saved as "${alreadyHave.title}".`,
        duplicateOf: alreadyHave,
      },
      { status: 409 },
    );
  }

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

  // A different PDF of a dish already in the library shares no bytes with it,
  // so only the title gives it away. Reported alongside the extraction as a
  // warning: the review screen can show it, and the person decides.
  const similar = await findSimilarlyTitled(
    extraction.recipe.title,
    user.householdId,
  );

  return NextResponse.json({
    recipe: extraction.recipe,
    pdfUrl: pdf.url,
    pdfFilename: file.name,
    pdfSha256,
    imageUrl,
    similar,
  });
}
