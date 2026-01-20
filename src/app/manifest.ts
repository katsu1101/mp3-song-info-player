import {buildManifest}      from "@/config/appMeta";
import type {MetadataRoute} from "next";

// output: export を使うなら、ここは静的に確定させる（必要なら残す）
export const dynamic = "force-static";
export const revalidate = false;

export default function manifest(): MetadataRoute.Manifest {
  return buildManifest();
}
