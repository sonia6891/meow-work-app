revoke all on table public.user_sync_backups from anon, authenticated;
grant select on table public.user_sync_backups to authenticated;

revoke execute on function private.meow_cloud_owner_uid() from public, anon;
grant execute on function private.meow_cloud_owner_uid() to authenticated, service_role;
