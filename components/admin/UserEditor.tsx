"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Field } from "@/components/ui/Field";
import { Stack } from "@/components/ui/Stack";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { DataTable, Td } from "@/components/list/DataTable";
import { ListToolbar } from "@/components/list/ListToolbar";
import { type PageSize } from "@/lib/pagination";

type Role = "PATIENT" | "ADMIN";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

export function UserEditor() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "PATIENT" as Role,
  });
  const [creating, setCreating] = useState(false);

  const q = query.trim();

  const load = useCallback(
    async (args: { page: number; pageSize: PageSize; query: string }) => {
      setLoading(true);
      setError(null);
      try {
        const u = new URL("/api/admin/users", window.location.origin);
        if (args.query) u.searchParams.set("query", args.query);
        u.searchParams.set("page", String(args.page));
        u.searchParams.set("pageSize", String(args.pageSize));
        const res = await fetch(u.toString(), { credentials: "include" });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          items?: UserRow[];
          total?: number;
        };
        if (!res.ok) {
          setError(data.error || "Could not load users");
          return;
        }
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load({ page, pageSize, query: q });
  }, [page, pageSize, q, load]);

  const canCreate =
    createForm.name.trim().length > 0 &&
    createForm.email.trim().length > 0 &&
    createForm.password.length >= 8;

  const createdAtFmt = useMemo(
    () =>
      new Map(
        items.map((u) => [
          u.id,
          new Date(u.createdAt).toLocaleString(undefined, { dateStyle: "medium" }),
        ])
      ),
    [items]
  );

  async function createUser() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(createForm),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not create user");
        return;
      }
      setCreateForm({ name: "", email: "", password: "", role: "PATIENT" });
      setCreateOpen(false);
      setPage(1);
      await load({ page: 1, pageSize, query: q });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <ListToolbar
        query={query}
        setQuery={(v) => {
          setQuery(v);
          setPage(1);
        }}
        onRefresh={() => void load({ page: 1, pageSize, query: q })}
        searchPlaceholder="Search by name or email"
        primaryLabel="Create user"
        primaryOpen={createOpen}
        onPrimary={() => setCreateOpen((v) => !v)}
      />

      {createOpen ? (
        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-ink">Create user</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Creates a user account directly (admin operation). Password is stored hashed.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field
              id="c-name"
              label="Name"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Field
              id="c-email"
              label="Email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Field
              id="c-pass"
              label="Temp password"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              hint="At least 8 characters"
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium tracking-wide uppercase text-ink-muted" htmlFor="c-role">
                Role
              </label>
              <select
                id="c-role"
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-inner"
                value={createForm.role}
                onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as Role }))}
              >
                <option value="PATIENT">Patient</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <GhostButton type="button" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </GhostButton>
            <PrimaryButton type="button" onClick={createUser} disabled={!canCreate || creating}>
              {creating ? "…" : "Create"}
            </PrimaryButton>
          </div>
        </Panel>
      ) : null}

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <DataTable
        headers={["Name", "Email", "Role", "Created", "Actions"]}
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        onPageChange={(p) => {
          setPage(p);
          void load({ page: p, pageSize, query: q });
        }}
        onPageSizeChange={(ps) => {
          setPageSize(ps);
          setPage(1);
          void load({ page: 1, pageSize: ps, query: q });
        }}
      >
        {items.map((u) => (
          <tr key={u.id} className="hover:bg-paper/40">
            <Td>
              <p className="font-medium text-ink">{u.name}</p>
              <p className="text-xs text-ink-muted">{u.id}</p>
            </Td>
            <Td>
              <p className="text-ink">{u.email}</p>
            </Td>
            <Td>
              <span className="inline-flex rounded-full border border-border bg-white/60 px-2 py-0.5 text-xs font-medium text-ink">
                {u.role}
              </span>
            </Td>
            <Td>
              <p className="text-xs text-ink-muted">{createdAtFmt.get(u.id) ?? ""}</p>
            </Td>
            <Td>
              <Link
                className="text-tint text-sm font-medium hover:underline"
                href={`/admin/users/${u.id}`}
              >
                Manage
              </Link>
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

