do $$
declare
  random_password text;
begin
  random_password := encode(extensions.gen_random_bytes(32), 'hex');
  update auth.users
  set encrypted_password = extensions.crypt(random_password, extensions.gen_salt('bf')),
      updated_at = now()
  where email = 'retdyfugihojpkesrdtfyg@esrdtfghj.co';
end $$;