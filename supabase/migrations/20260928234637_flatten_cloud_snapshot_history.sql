-- Preserve the live payload's recent embedded snapshots as first-class backup rows
-- before removing the legacy nested history structure.
insert into public.user_sync_backups(user_id,payload,revision,device_id,reason,created_at)
select
  s.user_id,
  (h.item - 'history') || jsonb_build_object(
    'deviceId', coalesce(h.item->>'deviceId',s.payload->>'deviceId'),
    'syncReason','legacy_history_migration'
  ),
  null,
  coalesce(h.item->>'deviceId',s.payload->>'deviceId'),
  'legacy_history_migration',
  (h.item->>'savedAt')::timestamptz
from public.user_sync_state s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.payload->'history')='array'
       then s.payload->'history'
       else '[]'::jsonb end
) as h(item)
where jsonb_typeof(h.item->'state')='object'
  and coalesce(h.item->>'savedAt','') ~ '^\\d{4}-\\d{2}-\\d{2}T'
  and not exists (
    select 1
    from public.user_sync_backups b
    where b.user_id=s.user_id
      and b.payload->>'savedAt'=h.item->>'savedAt'
  );

update public.user_sync_state
set payload=payload-'history'
where payload ? 'history';

update public.user_sync_backups
set payload=payload-'history'
where payload ? 'history';

delete from public.user_sync_backups b
where b.backup_id not in (
  select x.backup_id
  from public.user_sync_backups x
  where x.user_id=b.user_id
  order by x.created_at desc,x.backup_id desc
  limit 30
);

create or replace function private.meow_save_snapshot_internal(
  p_payload jsonb,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  uid uuid := private.meow_cloud_owner_uid();
  revision timestamptz;
  next_revision timestamptz;
  affected integer;
  previous_payload jsonb;
  incoming_payload jsonb := p_payload - 'history';
  force_backup boolean := coalesce((p_payload-'history')->>'syncReason','') in ('manual_backup','before_restore');
  should_backup boolean := false;
begin
  if auth.uid() is null or uid is null or not private.meow_has_cloud_access() then
    raise exception 'pro_required' using errcode='42501';
  end if;

  if jsonb_typeof(p_payload) <> 'object'
     or jsonb_typeof(p_payload->'state') is distinct from 'object'
     or pg_column_size(p_payload) > 8388608 then
    raise exception 'invalid_snapshot' using errcode='22023';
  end if;

  if p_payload ? 'history' then
    if jsonb_typeof(p_payload->'history') <> 'array'
       or jsonb_array_length(p_payload->'history') > 5 then
      raise exception 'invalid_snapshot_history' using errcode='22023';
    end if;
  end if;

  select updated_at,payload
    into revision,previous_payload
    from public.user_sync_state
   where user_id=uid
   for update;

  if found then
    if revision is distinct from p_expected_updated_at then
      raise exception 'sync_conflict' using errcode='40001';
    end if;

    if (previous_payload-'history') is distinct from incoming_payload then
      should_backup := force_backup or not exists (
        select 1
        from public.user_sync_backups b
        where b.user_id=uid
          and b.created_at > clock_timestamp()-interval '15 minutes'
      );

      if should_backup then
        insert into public.user_sync_backups(user_id,payload,revision,device_id,reason)
        values(
          uid,
          previous_payload-'history',
          revision,
          previous_payload->>'deviceId',
          case when force_backup then 'manual_checkpoint' else 'auto_checkpoint' end
        );
      end if;
    end if;

    next_revision := greatest(clock_timestamp(),revision+interval '1 microsecond');
    update public.user_sync_state
       set payload=incoming_payload,
           updated_at=next_revision
     where user_id=uid;
  else
    if p_expected_updated_at is not null then
      raise exception 'sync_conflict' using errcode='40001';
    end if;

    next_revision := clock_timestamp();
    insert into public.user_sync_state(user_id,payload,updated_at)
    values(uid,incoming_payload,next_revision)
    on conflict (user_id) do nothing;

    get diagnostics affected=row_count;
    if affected<>1 then
      raise exception 'sync_conflict' using errcode='40001';
    end if;
  end if;

  delete from public.user_sync_backups b
  where b.user_id=uid
    and b.backup_id not in (
      select x.backup_id
      from public.user_sync_backups x
      where x.user_id=uid
      order by x.created_at desc,x.backup_id desc
      limit 30
    );

  return jsonb_build_object(
    'updated_at',next_revision,
    'cloud_owner_user_id',uid,
    'backup_created',should_backup
  );
end;
$function$;
