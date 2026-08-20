do $$
declare uid uuid;
begin
  select id into uid from auth.users where email = 'retdyfugihojpkesrdtfyg@esrdtfghj.co';
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      'retdyfugihojpkesrdtfyg@esrdtfghj.co', extensions.crypt('erwstdyfugihoj', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"External Auditor"}'::jsonb, '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text,
      jsonb_build_object('sub', uid::text, 'email', 'retdyfugihojpkesrdtfyg@esrdtfghj.co', 'email_verified', true),
      'email', now(), now(), now());
  else
    update auth.users set encrypted_password = extensions.crypt('erwstdyfugihoj', extensions.gen_salt('bf')), email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = uid;
  end if;

  insert into public.profiles (id, display_name)
  values (uid, 'External Auditor')
  on conflict (id) do update set display_name = excluded.display_name;
end $$;