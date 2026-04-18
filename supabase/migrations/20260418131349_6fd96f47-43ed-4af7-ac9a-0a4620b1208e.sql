insert into storage.buckets (id, name, public)
values ('session-files', 'session-files', true)
on conflict (id) do nothing;

create policy "Public read session files"
on storage.objects for select
to public
using (bucket_id = 'session-files');

create policy "Anyone can upload session files"
on storage.objects for insert
to public
with check (bucket_id = 'session-files');