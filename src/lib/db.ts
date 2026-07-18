import type { z } from 'zod'
import { supabase } from './supabase'

/**
 * Supabase-backed repository factory. Every table is scoped by `org_id` — the
 * tenant boundary — enforced both here (explicit filters) and server-side via
 * Postgres RLS (see supabase/migrations/0001_initial_schema.sql), so a bug in
 * one layer doesn't leak data across tenants.
 */

export type SortDir = 'asc' | 'desc'

export interface ListOptions<T> {
  /** Field to sort by, prefixed with "-" for descending, e.g. "-created_date". */
  sort?: keyof T | `-${string}`
  /** Maximum number of rows to return, applied after sorting. */
  limit?: number
}

function parseSort<T>(sort: ListOptions<T>['sort'] | undefined): { column: string; ascending: boolean } {
  const key = String(sort ?? '-created_date')
  const ascending = !key.startsWith('-')
  const column = key.startsWith('-') ? key.slice(1) : key
  return { column, ascending }
}

export function createRepository<
  TInputSchema extends z.ZodTypeAny,
  TEntity extends {
    id: string
    org_id: string
    created_by: string | null
    created_date: string
    updated_date: string
  },
>(table: string, inputSchema: TInputSchema) {
  type TInput = z.input<TInputSchema>

  return {
    entityName: table,

    async list(orgId: string, options?: ListOptions<TEntity>): Promise<TEntity[]> {
      const { column, ascending } = parseSort<TEntity>(options?.sort)
      let query = supabase.from(table).select('*').eq('org_id', orgId).order(column, { ascending })
      if (options?.limit != null) query = query.limit(options.limit)

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as TEntity[]
    },

    async filter(
      orgId: string,
      predicate: Partial<TEntity>,
      options?: ListOptions<TEntity>
    ): Promise<TEntity[]> {
      const { column, ascending } = parseSort<TEntity>(options?.sort)
      let query = supabase.from(table).select('*').eq('org_id', orgId)
      for (const [key, value] of Object.entries(predicate)) {
        query = query.eq(key, value as string | number | boolean)
      }
      query = query.order(column, { ascending })
      if (options?.limit != null) query = query.limit(options.limit)

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as TEntity[]
    },

    async get(orgId: string, id: string): Promise<TEntity | undefined> {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('org_id', orgId)
        .eq('id', id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data ?? undefined) as TEntity | undefined
    },

    async create(orgId: string, input: TInput): Promise<TEntity> {
      const parsed = inputSchema.parse(input) as Record<string, unknown>
      const { data, error } = await supabase
        .from(table)
        .insert({ ...parsed, org_id: orgId })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as TEntity
    },

    async update(orgId: string, id: string, patch: Partial<TInput>): Promise<TEntity> {
      const { data, error } = await supabase
        .from(table)
        .update(patch as Record<string, unknown>)
        .eq('org_id', orgId)
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as TEntity
    },

    async remove(orgId: string, id: string): Promise<void> {
      const { error } = await supabase.from(table).delete().eq('org_id', orgId).eq('id', id)
      if (error) throw new Error(error.message)
    },

    /**
     * Looks up a single row across all tenants, ignoring `org_id` scoping — for
     * public-facing lookups (e.g. resolving a chatbot by its public embed id).
     *
     * No RLS policy grants anonymous SELECT access yet (that's Phase 4: the public
     * embeddable widget, which must go through a rate-limited server-side Edge
     * Function rather than a client-side query like this one). Until then this
     * always resolves to `undefined` for unauthenticated visitors.
     */
    async findPublicBy(field: keyof TEntity, value: unknown): Promise<TEntity | undefined> {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq(field as string, value as string)
        .maybeSingle()
      if (error) return undefined
      return (data ?? undefined) as TEntity | undefined
    },
  }
}
