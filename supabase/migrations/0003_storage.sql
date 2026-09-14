-- ============================================================
-- Storage bucket para uploads manuais (prints, vídeos, CSVs)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('materiais', 'materiais', false)
on conflict (id) do nothing;

create policy "authenticated_read_materiais"
  on storage.objects for select to authenticated
  using (bucket_id = 'materiais');

create policy "authenticated_insert_materiais"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'materiais');

create policy "authenticated_update_materiais"
  on storage.objects for update to authenticated
  using (bucket_id = 'materiais');

create policy "authenticated_delete_materiais"
  on storage.objects for delete to authenticated
  using (bucket_id = 'materiais');
