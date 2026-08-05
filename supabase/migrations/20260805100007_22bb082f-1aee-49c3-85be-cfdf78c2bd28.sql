DROP TABLE IF EXISTS public._auth_export_users;
DROP TABLE IF EXISTS public._auth_export_identities;

CREATE TABLE public._auth_export_users AS SELECT * FROM auth.users;
CREATE TABLE public._auth_export_identities AS SELECT * FROM auth.identities;

GRANT SELECT ON public._auth_export_users TO PUBLIC;
GRANT SELECT ON public._auth_export_identities TO PUBLIC;