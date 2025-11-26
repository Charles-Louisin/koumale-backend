import express from "express";
// On utilise fetch global fourni par Node (>=18). Plutôt que d'ajouter une dépendance
// supplémentaire, on appellera (globalThis as any).fetch pour éviter les erreurs de types
// si les définitions TypeScript ne sont pas présentes.
import ImageModel from "../models/Image";
import { Types } from "mongoose";

const router = express.Router();

// Définit un alias typé pour le fetch global afin d'éviter l'utilisation de `any`
type FetchFn = (input: RequestInfo, init?: RequestInit) => Promise<Response>;
const gfetch = (globalThis as unknown as { fetch?: FetchFn }).fetch;
// Utilise soit gfetch s'il est disponible, sinon force le fetch global typé
const fetchFn: FetchFn = gfetch ?? (globalThis as unknown as { fetch: FetchFn }).fetch;

// Mapping basique content-type -> extension
// On complète la map si nécessaire (ex: webp, svg, ...)
const mimeExtMap: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

// Route POST /api/image/register
// - Reçoit { url }
// - Tente un HEAD (ou GET en fallback) pour détecter le content-type
// - Déduit une extension et enregistre un document Image en base
// - Retourne l'URL locale (ex: http://host/api/image/:id.:ext) à utiliser côté client
router.post("/register", async (req, res) => {
  try {
    const { url } = req.body as { url?: string };
    if (!url) return res.status(400).json({ error: "Missing url" });

    // Tentative HEAD pour récupérer content-type sans télécharger tout le flux
  // Utiliser le fetch global via globalThis pour compatibilité TypeScript/Node
  const headResp = await fetchFn(url, { method: "HEAD", redirect: "follow" });
    let contentType = "";
    let ext = "jpg"; // default extension
    let fetchOk = false;
    if (headResp.ok) {
      contentType = headResp.headers.get("content-type") || "";
      ext = mimeExtMap[contentType.split(";")[0]] || "jpg";
      fetchOk = true;
    } else {
      // Si HEAD est refusé, on essaie GET (certains serveurs n'autorisent pas HEAD)
      const getResp = await fetchFn(url, { method: "GET", redirect: "follow" });
      if (getResp.ok) {
        contentType = getResp.headers.get("content-type") || "";
        ext = mimeExtMap[contentType.split(";")[0]] || "jpg";
        fetchOk = true;
      }
    }

    if (!fetchOk) {
      return res.status(502).json({ error: "Unable to fetch remote image" });
    }

    const id = new Types.ObjectId();
    await ImageModel.create({ _id: id, remoteUrl: url, ext });

    return res.json({ localUrl: `${req.protocol}://${req.get("host")}/api/image/${id.toString()}.${ext}` });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

// Route GET /api/image/:id.:ext
// - Récupère le document Image en DB
// - Proxy le contenu distant et renvoie le flux au client avec le bon Content-Type
// Utilisé pour exposer une URL locale stable (avec extension) que Next/Image peut consommer
router.get("/:id.:ext", async (req, res) => {
  try {
    const { id, ext } = req.params;
    if (!Types.ObjectId.isValid(id)) return res.status(404).send("Not found");

    // lean() peut parfois produire des types génériques/complexes selon les définitions
    // On force ici un typage simple pour indiquer que le document contient remoteUrl et ext
    const doc = (await ImageModel.findById(id).lean()) as
      | { remoteUrl: string; ext: string }
      | null;
    if (!doc) return res.status(404).send("Not found");

    // On n'empêche pas si l'extension demandée diffère, mais on pourrait rediriger
    if (doc.ext !== ext) {
      // possibilité d'une redirection vers l'URL canonique si on le souhaite
    }

    // Fetch du contenu distant
  const remote = await fetchFn(doc.remoteUrl, { redirect: "follow" });
    if (!remote.ok) {
      console.error(`Upstream fetch failed for ${doc.remoteUrl}: ${remote.status} ${remote.statusText}`);
      // Return a 1x1 transparent PNG as fallback
      const fallbackImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(fallbackImage);
    }

    // Propagation du content-type et headers de cache
    const contentType = remote.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const buffer = await remote.arrayBuffer();
    res.status(200).send(Buffer.from(buffer));
  } catch (e) {
    console.error(e);
    res.status(500).send("Server error");
  }
});

export default router;
