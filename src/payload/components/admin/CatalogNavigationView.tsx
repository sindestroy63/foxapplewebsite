"use client";
import { useEffect, useState } from "react";
import "./CatalogNavigationView.scss";
// Legacy /api/catalog-navigation-admin remains intentionally unused by this UI.

type Item = {
  title: string;
  key: string;
  href?: string;
  filter?: unknown;
  sortOrder?: number;
  isVisible?: boolean;
  coverImage?: { id?: number; url?: string; filename?: string } | number | null;
  children?: Item[];
  isNew?: boolean;
  products?: ProductItem[];
};
type ProductItem = { id: string | number; name: string; slug?: string; isNew?: boolean; isAvailable?: boolean; sortOrder?: number; images?: { url?: string }[] | null };
type Media = { id: number; filename?: string; url?: string };
type Editor = { item: Item; parent?: string; isNew?: boolean };

const itemKey = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "") || `item-${Date.now()}`;

export default function CatalogNavigationView() {
  const [groups, setGroups] = useState<Item[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [picker, setPicker] = useState<{ key: string; parent?: string } | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [productDrafts, setProductDrafts] = useState<Record<string, { isNew: boolean; sortOrder: number }>>({});
  const [productOpen, setProductOpen] = useState<Record<string, boolean>>({});
  const requestError = async (response: Response, fallback: string) => {
    const data = await response.json().catch(() => ({}));
    const message = response.status === 401 ? 'Сессия истекла. Войдите в админку заново.' : response.status === 403 ? 'Недостаточно прав для изменения навигации.' : String(data.error || data.reason || fallback);
    if (process.env.NODE_ENV !== 'production') console.warn('[catalog-navigation]', response.url, response.status, message);
    return message;
  };

  useEffect(() => {
    fetch("/api/brand-catalog-navigation")
      .then(async (r) => {
        if (!r.ok) throw new Error(await requestError(r, "Не удалось загрузить навигацию"));
        const d = await r.json();
        setGroups(d.groups || []);
      })
      .catch((e) => setError(e.message));
    fetch("/api/media?limit=200&where[mimeType][like]=image%2F")
      .then((r) => r.json())
      .then((d) => setMedia(d.docs || []))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!(event.target as Element).closest(".action-menu-wrap"))
        setMenu(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const mark = (fn: (all: Item[]) => Item[]) => {
    setGroups(fn);
    setDirty(true);
    setStatus("");
  };
  const update = (key: string, patch: Partial<Item>, parent?: string) =>
    mark((all) =>
      all.map((g) =>
        g.key === (parent || key)
          ? parent
            ? {
                ...g,
                children: (g.children || []).map((c) =>
                  c.key === key ? { ...c, ...patch } : c,
                ),
              }
            : { ...g, ...patch }
          : g,
      ),
    );
  const move = (key: string, direction: -1 | 1, parent?: string) =>
    mark((all) => {
      if (!parent) {
        const list = [...all];
        const index = list.findIndex((item) => item.key === key);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= list.length) return all;
        [list[index], list[target]] = [list[target], list[index]];
        return list.map((item, order) => ({ ...item, sortOrder: order }));
      }
      return all.map((group) => {
        if (group.key !== parent) return group;
        const children = [...(group.children || [])];
        const index = children.findIndex((item) => item.key === key);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= children.length) return group;
        [children[index], children[target]] = [
          children[target],
          children[index],
        ];
        return {
          ...group,
          children: children.map((item, order) => ({
            ...item,
            sortOrder: order,
          })),
        };
      });
    });
  const remove = (key: string, parent?: string) => {
    if (!window.confirm("Удалить этот пункт?")) return;
    mark((all) =>
      parent
        ? all.map((g) =>
            g.key === parent
              ? {
                  ...g,
                  children: (g.children || []).filter((c) => c.key !== key),
                }
              : g,
          )
        : all.filter((g) => g.key !== key),
    );
  };
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        productUpdates: Object.entries(productDrafts).map(([key, value]) => { const [childKey, id] = key.split(':'); return { childKey, id, ...value }; }),
        groups: groups.map((group, groupIndex) => ({
          title: String(group.title),
          key: String(group.key),
          href: group.href || null,
          filter: group.filter ?? null,
          sortOrder: groupIndex,
            isVisible: group.isVisible !== false,
            isNew: group.isNew === true,
          coverImage: coverId(group) || null,
          children: (group.children || []).map((child, childIndex) => ({
            title: String(child.title),
            key: String(child.key),
            href: child.href || null,
            filter: child.filter ?? null,
            sortOrder: childIndex,
            isVisible: child.isVisible !== false,
            isNew: child.isNew === true,
            coverImage: coverId(child) || null,
          })),
        })),
      };
      const r = await fetch("/api/brand-catalog-navigation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError([data.error, data.field, data.reason].filter(Boolean).join(": ") || await requestError(r, "Не удалось сохранить"));
        return;
      }
      const refreshed = await fetch("/api/brand-catalog-navigation");
      const refreshedData = await refreshed.json().catch(() => ({}));
      setGroups(refreshedData.groups || data.groups || groups);
      setDirty(false);
      setStatus("Изменения сохранены");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Не удалось сохранить изменения';
      if (process.env.NODE_ENV !== 'production') console.warn('[catalog-navigation] PUT failed', message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };
  const coverId = (item: Item) =>
    typeof item.coverImage === "object" ? item.coverImage?.id : item.coverImage;
  const cover = (item: Item, parent?: string) => {
    const id = coverId(item);
    const image =
      typeof item.coverImage === "object"
        ? item.coverImage
        : media.find((m) => m.id === id);
    return (
      <div className="brand-cover">
        <div className="brand-cover-preview">
          {image?.url ? (
            <img src={image.url} alt="" />
          ) : (
            <span>Нет обложки</span>
          )}
        </div>
        <div>
          <div className="brand-cover-name">
            Обложка: {image?.filename || (id ? `Media #${id}` : "Без обложки")}
          </div>
        </div>
      </div>
    );
  };
  const renderItem = (
    item: Item,
    parent: string | undefined,
    index: number,
    total: number,
  ) => {
    const menuKey = `${parent || "root"}:${item.key}`;
    return (
      <article className={parent ? "brand-child" : "brand-root"} key={item.key}>
        <div className="brand-item-head">
          <div>
            <input
              className="brand-title-input"
              aria-label={`Название: ${item.title}`}
              value={item.title}
              onChange={(e) =>
                update(item.key, { title: e.target.value }, parent)
              }
            />
            {!parent && (
              <div className="brand-count">
                {item.children?.length || 0} подразделов
              </div>
            )}
          </div>
          <label className="brand-switch">
            <input
              type="checkbox"
              checked={item.isVisible !== false}
              onChange={(e) =>
                update(item.key, { isVisible: e.target.checked }, parent)
              }
            />{" "}
            Видим
          </label>
          <label className="brand-switch">
            <input type="checkbox" checked={item.isNew === true} onChange={(e) => update(item.key, { isNew: e.target.checked }, parent)} /> Новинка
          </label>
          <div className="action-menu-wrap">
            <button
              className="action-menu-trigger"
              type="button"
              aria-label="Действия"
              onClick={() => setMenu(menu === menuKey ? null : menuKey)}
            >
              ⋮
            </button>
            {menu === menuKey && (
              <div
                className="action-menu"
                role="menu"
                onClick={() => setMenu(null)}
              >
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(item.key, -1, parent)}
                >
                  Вверх
                </button>
                <button
                  type="button"
                  disabled={index === total - 1}
                  onClick={() => move(item.key, 1, parent)}
                >
                  Вниз
                </button>
                <button
                  type="button"
                  onClick={() => setEditor({ item: { ...item }, parent })}
                >
                  Изменить
                </button>
                {!parent && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditor({
                        item: {
                          title: "",
                          key: "",
                          isVisible: true,
                          coverImage: null,
                        },
                        parent: item.key,
                        isNew: true,
                      })
                    }
                  >
                    Добавить подраздел
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPicker({ key: item.key, parent })}
                >
                  {coverId(item) ? "Заменить обложку" : "Выбрать обложку"}
                </button>
                <button
                  type="button"
                  disabled={!coverId(item)}
                  onClick={() => update(item.key, { coverImage: null }, parent)}
                >
                  Убрать обложку
                </button>
                <button
                  className="danger"
                  type="button"
                  onClick={() => remove(item.key, parent)}
                >
                  Удалить
                </button>
              </div>
            )}
          </div>
        </div>
        {cover(item, parent)}
        {parent && item.products && item.products.length > 0 && <div className="catalog-product-list">
          <button type="button" className="catalog-product-toggle" onClick={() => setProductOpen((state) => ({ ...state, [item.key]: state[item.key] === false }))}>{productOpen[item.key] === false ? 'Показать товары' : `Товары (${item.products.length})`}</button>
          {productOpen[item.key] !== false && [...item.products].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.id).localeCompare(String(b.id))).map((product, productIndex, sortedProducts) => {
            const draftKey = `${item.key}:${product.id}`;
            const draft = productDrafts[draftKey] || { isNew: product.isNew === true, sortOrder: product.sortOrder || 0 };
            const moveProduct = (direction: -1 | 1) => {
              const sorted = [...item.products!].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.id).localeCompare(String(b.id)));
              const index = sorted.findIndex((entry) => String(entry.id) === String(product.id));
              const target = index + direction;
              if (target < 0 || target >= sorted.length) return;
              const other = sorted[target];
              setProductDrafts((all) => ({ ...all, [`${item.key}:${product.id}`]: { ...draft, sortOrder: other.sortOrder || 0 }, [`${item.key}:${other.id}`]: { isNew: other.isNew === true, sortOrder: product.sortOrder || 0 } }));
              setDirty(true);
            };
            return <div className="catalog-product-row" key={product.id}>
              {product.images?.[0]?.url ? <img src={product.images[0].url} alt="" className="catalog-product-image" /> : null}<span>{product.name}</span>
              {!product.isAvailable && <small>Скрыт</small>}
              <label className="brand-switch"><input type="checkbox" checked={draft.isNew} onChange={(e) => { setProductDrafts((all) => ({ ...all, [draftKey]: { ...draft, isNew: e.target.checked } })); setDirty(true); }} /> Новинка</label>
              <button type="button" disabled={productIndex === 0} onClick={() => moveProduct(-1)}>Вверх</button>
              <button type="button" disabled={productIndex === item.products!.length - 1} onClick={() => moveProduct(1)}>Вниз</button>
            </div>;
          })}
        </div>}
      </article>
    );
  };
  const commitEditor = () => {
    if (!editor?.item.title.trim()) return;
    const item = {
      ...editor.item,
      title: editor.item.title.trim(),
      key: editor.item.key.trim() || itemKey(editor.item.title),
    };
    if (editor.isNew && editor.parent)
      update(editor.parent, {
        children: [
          ...(groups.find((g) => g.key === editor.parent)?.children || []),
          {
            ...item,
            sortOrder:
              groups.find((g) => g.key === editor.parent)?.children?.length ||
              0,
          },
        ],
      });
    else if (editor.isNew)
      mark((all) => [...all, { ...item, sortOrder: all.length, children: [] }]);
    else update(item.key, item, editor.parent);
    setEditor(null);
  };
  return (
    <main className="catalog-navigation-admin">
      <header className="catalog-editor-header">
        <div>
          <h1>Навигация каталога</h1>
          <p>Управление брендами, разделами и изображениями каталога</p>
        </div>
        <div className="catalog-editor-toolbar">
          <button
            type="button"
            onClick={() =>
              setOpen(Object.fromEntries(groups.map((g) => [g.key, true])))
            }
          >
            Раскрыть всё
          </button>
          <button
            type="button"
            onClick={() =>
              setOpen(Object.fromEntries(groups.map((g) => [g.key, false])))
            }
          >
            Свернуть всё
          </button>
          <button
            type="button"
            onClick={() =>
              setEditor({
                item: { title: "", key: "", isVisible: true, coverImage: null },
                isNew: true,
              })
            }
          >
            Добавить раздел
          </button>
          <button className="primary" type="button" disabled={saving} onClick={() => void save()}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </header>
      {dirty && (
        <p className="save-status pending">Есть несохранённые изменения</p>
      )}
      {status && <p className="save-status success">{status}</p>}
      {error && (
        <p role="alert" className="catalog-navigation-error">
          {error}
        </p>
      )}
      <div className="brand-nav-grid">
        {groups.map((group, index) => (
          <section className="brand-nav-card" key={group.key}>
            <button
              className="brand-nav-toggle"
              type="button"
              onClick={() =>
                setOpen((s) => ({ ...s, [group.key]: s[group.key] === false }))
              }
            >
              {open[group.key] === false ? "+" : "−"} <span>{group.title}</span>
              <small>{group.children?.length || 0} подразделов</small>
            </button>
            {renderItem(group, undefined, index, groups.length)}
            {open[group.key] !== false && (
              <div className="brand-nav-children">
                {(group.children || []).map((child, i, list) =>
                  renderItem(child, group.key, i, list.length),
                )}
              </div>
            )}
          </section>
        ))}
      </div>
      {editor && (
        <div className="catalog-modal-backdrop">
          <div className="catalog-modal" role="dialog" aria-modal="true">
            <h2>
              {editor.isNew
                ? editor.parent
                  ? "Добавить подраздел"
                  : "Добавить раздел"
                : "Изменить пункт"}
            </h2>
            <label>
              Название
              <input
                value={editor.item.title}
                onChange={(e) =>
                  setEditor({
                    ...editor,
                    item: { ...editor.item, title: e.target.value },
                  })
                }
              />
            </label>
            <label className="brand-switch">
              <input
                type="checkbox"
                checked={editor.item.isVisible !== false}
                onChange={(e) =>
                  setEditor({
                    ...editor,
                    item: { ...editor.item, isVisible: e.target.checked },
                  })
                }
              />{" "}
              Видим
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setEditor(null)}>
                Отмена
              </button>
              <button className="primary" type="button" onClick={commitEditor}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
      {picker && (
        <div className="catalog-modal-backdrop">
          <div
            className="catalog-modal media-picker"
            role="dialog"
            aria-modal="true"
          >
            <h2>Выбрать обложку</h2>
            <input
              placeholder="Поиск по имени файла"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="media-grid">
              {media
                .filter((m) =>
                  (m.filename || "")
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((m) => (
                  <button
                    className="media-option"
                    type="button"
                    key={m.id}
                    onClick={() => {
                      update(picker.key, { coverImage: m.id }, picker.parent);
                      setPicker(null);
                    }}
                  >
                    {m.url && <img src={m.url} alt="" />}
                    <span>{m.filename || `Media #${m.id}`}</span>
                  </button>
                ))}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  update(picker.key, { coverImage: null }, picker.parent);
                  setPicker(null);
                }}
              >
                Без обложки
              </button>
              <button type="button" onClick={() => setPicker(null)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
