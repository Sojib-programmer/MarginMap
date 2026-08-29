-- Invitee can read invitations addressed to their own (confirmed) email
CREATE POLICY "invitee reads own invitation"
ON public.workspace_invitations
FOR SELECT
TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- One live pending invite per email per workspace
CREATE UNIQUE INDEX IF NOT EXISTS workspace_invitations_pending_unique
ON public.workspace_invitations (workspace_id, lower(email))
WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(_invitation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.workspace_invitations%ROWTYPE;
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO inv FROM public.workspace_invitations WHERE id = _invitation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
  IF lower(inv.email) <> caller_email OR caller_email = '' THEN
    RAISE EXCEPTION 'This invitation was issued to a different email address';
  END IF;
  IF inv.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'This invitation was revoked';
  END IF;
  IF inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'This invitation was already accepted';
  END IF;
  IF inv.expires_at < now() THEN
    RAISE EXCEPTION 'This invitation has expired';
  END IF;
  IF inv.role = 'owner' THEN
    RAISE EXCEPTION 'Ownership cannot be granted by invitation';
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (inv.workspace_id, auth.uid(), inv.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE public.workspace_invitations
     SET accepted_at = now(), accepted_by = auth.uid()
   WHERE id = inv.id;

  PERFORM public.log_activity(
    inv.workspace_id, 'invitation.accepted', 'workspace_invitation', inv.id,
    jsonb_build_object('role', inv.role, 'email', inv.email)
  );

  RETURN inv.workspace_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_workspace_invitation(_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.workspace_invitations%ROWTYPE;
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO inv FROM public.workspace_invitations WHERE id = _invitation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
  IF lower(inv.email) <> caller_email OR caller_email = '' THEN
    RAISE EXCEPTION 'This invitation was issued to a different email address';
  END IF;
  IF inv.accepted_at IS NOT NULL OR inv.revoked_at IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE public.workspace_invitations SET revoked_at = now() WHERE id = inv.id;

  PERFORM public.log_activity(
    inv.workspace_id, 'invitation.declined', 'workspace_invitation', inv.id,
    jsonb_build_object('email', inv.email)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_workspace_invitation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_workspace_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_workspace_invitation(uuid) TO authenticated;