import type { Endpoint } from "payload";
import { hasFullAdminAccess } from "./access";
import { catalogPlacementFilter, catalogPlacementHref, getCatalogPlacementByChildKey } from "@/lib/product-catalog-placement";

type InputItem = Record<string, unknown>;

const child = (title: string, key: string, href?: string, visible = true) => {
  const placement = getCatalogPlacementByChildKey(key);
  const resolvedHref = href || (placement ? catalogPlacementHref(placement) : undefined);
  return ({
  title,
  key,
  href: resolvedHref || null,
  filter: placement ? catalogPlacementFilter(placement) : resolvedHref ? Object.fromEntries(new URL(resolvedHref, "http://local").searchParams) : null,
  sortOrder: 0,
  isVisible: visible,
  coverImage: null,
  });
};

const defaults = [
  {
    title: "APPLE",
    key: "apple",
    href: "/catalog?brand=Apple",
    filter: { brand: "Apple" },
    children: [
      child("iPhone", "iphone"),
      child("iPad", "ipad"),
      child("Apple Watch", "apple-watch"),
      child("Apple AirPods", "apple-airpods"),
      child("MacBook", "macbook"),
      child("Apple Mac", "apple-mac"),
      child("Аксессуары Apple", "apple-accessories"),
    ],
  },
  {
    title: "SAMSUNG",
    key: "samsung",
    href: "/catalog?brand=Samsung",
    filter: { brand: "Samsung" },
    children: [
      child("Смартфоны", "samsung-smartphones"),
      child("Планшеты", "samsung-tablets"),
      child("Часы", "samsung-watches"),
      child("Наушники", "samsung-audio"),
    ],
  },
  {
    title: "DYSON",
    key: "dyson",
    href: "/catalog?brand=Dyson",
    filter: { brand: "Dyson" },
    children: [
      child("Фены Dyson", "dyson-hair-dryers"),
      child("Стайлеры Dyson", "dyson-stylers"),
      child("Выпрямители Dyson", "dyson-straighteners"),
      child("Очистители Dyson", "dyson-purifiers"),
      child("Пылесосы Dyson", "dyson-vacuums"),
    ],
  },
  {
    title: "PLAYSTATION",
    key: "playstation",
    href: "/catalog?group=gaming-consoles&brand=Sony",
    filter: { group: "gaming-consoles", brand: "Sony" },
    children: [
      child(
        "PlayStation 5",
        "playstation-5",
        "/catalog?group=gaming-consoles&brand=Sony",
      ),
      child(
        "Геймпады PS5",
        "gamepads-ps5",
        "/catalog?group=gaming-consoles&brand=Sony&line=Геймпады PS5",
      ),
    ],
  },
  {
    title: "ДРУГОЕ",
    key: "other",
    href: "/catalog?group=other",
    filter: { group: "other" },
    children: [
      child("Marshall", "other-marshall"),
      child("GoPro", "other-gopro"),
      child("Защитные стёкла", "other-screen-protectors"),
    ],
  },
  {
    title: "TRADE-IN",
    key: "trade-in",
    href: "/trade-in/catalog",
    filter: null,
    children: [],
  },
].map((group, index) => ({
  ...group,
  sortOrder: index,
  isVisible: true,
  coverImage: null,
}));

class StructureError extends Error {
  constructor(
    public field: string,
    message: string,
  ) {
    super(message);
  }
}

const text = (value: unknown, field: string, required = false) => {
  if (value == null || value === "") {
    if (required) throw new StructureError(field, "must be a non-empty string");
    return null;
  }
  if (typeof value !== "string")
    throw new StructureError(field, "must be a string or null");
  return value.trim();
};

const jsonFilter = (value: unknown, field: string) => {
  if (value == null || value === "") return null;
  if (typeof value === "string") return Object.fromEntries(new URLSearchParams(value.replace(/^\/catalog\?/, "")));
  if (typeof value !== "object" || Array.isArray(value)) throw new StructureError(field, "must be a JSON object or null");
  return value as Record<string, unknown>;
};

const normalizeItem = (value: unknown, field: string, index: number) => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new StructureError(field, "must be an object");
  const item = value as InputItem;
  const title = text(item.title, `${field}.title`, true)!;
  const key = text(item.key, `${field}.key`, true)!;
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(key))
    throw new StructureError(`${field}.key`, `invalid key "${key}"`);
  const sortOrder = Number(item.sortOrder ?? index);
  if (!Number.isFinite(sortOrder))
    throw new StructureError(`${field}.sortOrder`, "must be a number");
  if (item.isVisible != null && typeof item.isVisible !== "boolean")
    throw new StructureError(`${field}.isVisible`, "must be a boolean");
  const rawCover =
    item.coverImage && typeof item.coverImage === "object"
      ? (item.coverImage as InputItem).id
      : item.coverImage;
  const coverImage =
    rawCover == null || rawCover === "" ? null : Number(rawCover);
  if (coverImage !== null && (!Number.isInteger(coverImage) || coverImage <= 0))
    throw new StructureError(
      `${field}.coverImage`,
      "must be a Media ID or null",
    );
  return {
    title,
    key,
    href: text(item.href, `${field}.href`),
    filter: jsonFilter(item.filter, `${field}.filter`),
    sortOrder,
    isVisible: item.isVisible !== false,
    coverImage,
  };
};

export const normalizeBrandCatalogGroups = (input: unknown) => {
  if (!Array.isArray(input))
    throw new StructureError("groups", "must be an array");
  return input.map((rawGroup, groupIndex) => {
    const field = `groups[${groupIndex}]`;
    const group = normalizeItem(rawGroup, field, groupIndex);
    const rawChildren = (rawGroup as InputItem).children;
    if (rawChildren != null && !Array.isArray(rawChildren))
      throw new StructureError(`${field}.children`, "must be an array");
    const children = (rawChildren || []).map((item, childIndex) =>
      normalizeItem(item, `${field}.children[${childIndex}]`, childIndex),
    );
    return {
      ...group,
      sortOrder: groupIndex,
      children: children.map((item, childIndex) => ({
        ...item,
        sortOrder: childIndex,
      })),
    };
  });
};

const errorDetails = (error: unknown) => {
  const value = error instanceof Error ? error : new Error(String(error));
  return {
    message: value.message,
    stack: value.stack,
    cause: value.cause instanceof Error
      ? { message: value.cause.message, stack: value.cause.stack }
      : value.cause,
  };
};

const payloadSummary = (groups: unknown) => Array.isArray(groups)
  ? groups.map((group) => {
      const value = group && typeof group === "object" ? group as InputItem : {};
      return {
        title: value.title,
        key: value.key,
        sortOrder: value.sortOrder,
        isVisible: value.isVisible,
        coverImage: value.coverImage && typeof value.coverImage === "object"
          ? (value.coverImage as InputItem).id
          : value.coverImage,
        children: Array.isArray(value.children)
          ? value.children.map((child) => {
              const item = child && typeof child === "object" ? child as InputItem : {};
              return { title: item.title, key: item.key, sortOrder: item.sortOrder, isVisible: item.isVisible, coverImage: item.coverImage && typeof item.coverImage === "object" ? (item.coverImage as InputItem).id : item.coverImage };
            })
          : typeof value.children,
      };
    })
  : typeof groups;

const errorResponse = (error: unknown, context?: { field?: string; groups?: unknown }) => {
  const details = errorDetails(error);
  const field = error instanceof StructureError ? error.field : context?.field || "unknown";
  console.error("[brand-catalog-navigation] request failed", {
    field,
    ...details,
    payload: payloadSummary(context?.groups),
  });
  if (error instanceof StructureError) return Response.json({ error: "Invalid navigation structure", field, reason: error.message }, { status: 400 });
  return Response.json({
    error: "Unable to save navigation",
    ...(process.env.NODE_ENV !== "production" ? { field, reason: details.message } : {}),
  }, { status: 500 });
};

export const brandCatalogNavigationEndpoints: Endpoint[] = [
  {
    path: "/brand-catalog-navigation",
    method: "get",
    handler: async (req) => {
      const value = (await req.payload.findGlobal({
        slug: "brand-catalog-navigation",
        depth: 1,
        req,
      })) as unknown as InputItem;
      const raw =
        Array.isArray(value.groups) && value.groups.length >= defaults.length
          ? value.groups
          : defaults;
      try {
        return Response.json({
          groups: normalizeBrandCatalogGroups(raw).sort(
            (a, b) => a.sortOrder - b.sortOrder,
          ),
        });
      } catch (error) {
        return errorResponse(error);
      }
    },
  },
  {
    path: "/brand-catalog-navigation",
    method: "put",
    handler: async (req) => {
      if (!hasFullAdminAccess(req.user))
        return Response.json({ error: "Forbidden" }, { status: 403 });
      let body: InputItem | undefined;
      let groups: ReturnType<typeof normalizeBrandCatalogGroups> | undefined;
      let field = "request.body";
      try {
        body = (await req.json?.()) as InputItem;
        field = "groups";
        groups = normalizeBrandCatalogGroups(body?.groups);
        if (groups.length < defaults.length)
          throw new StructureError(
            "groups",
            "must contain at least the six catalog roots",
          );
        field = "coverImage";
        for (let groupIndex = 0; groupIndex < groups.length; groupIndex++)
          for (const [itemIndex, item] of [
            groups[groupIndex],
            ...groups[groupIndex].children,
          ].entries())
            if (item.coverImage) {
              try {
                const media = await req.payload.findByID({
                  collection: "media",
                  id: item.coverImage,
                  depth: 0,
                  req,
                });
                if (!media) throw new Error("Media not found");
              } catch {
                throw new StructureError(
                  itemIndex === 0
                    ? `groups[${groupIndex}].coverImage`
                    : `groups[${groupIndex}].children[${itemIndex - 1}].coverImage`,
                  `Media ${item.coverImage} does not exist`,
                );
              }
            }
        field = "updateGlobal";
        const saved = await req.payload.updateGlobal({
          slug: "brand-catalog-navigation",
          data: { groups },
          depth: 1,
          req,
        });
        field = "response.groups";
        return Response.json({
          groups: normalizeBrandCatalogGroups(
            (saved as unknown as InputItem).groups,
          ),
        });
      } catch (error) {
        return errorResponse(error, { field, groups: groups || body?.groups });
      }
    },
  },
];
